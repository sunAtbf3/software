import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2pdf from "html2pdf.js";
import BillInvoiceDocument from "../../Components/Billing/BillInvoiceDocument";
import billInvoiceStyles from "../../Components/Billing/billInvoice.styles.css?raw";
import { prepareBillForDocument } from "./billDocumentPrepare.service";
import { isBillAwaitingSync } from "./offlineBilling.service";

const PRINT_BASE_STYLES = `
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`;

const mountBillDocument = (preparedBill) => {
  const host = document.createElement("div");
  host.className = "bill-print-host";
  // NOTE: Use left:-9999px instead of opacity:0.
  // opacity:0 causes html2canvas to render a blank canvas (invisible = no pixels captured).
  // Positioning off-screen keeps it hidden to the user while still being capturable by html2canvas.
  host.style.cssText =
    "position:fixed;left:-9999px;top:0;width:210mm;pointer-events:none;z-index:-1;background:#fff;";
  document.body.appendChild(host);

  const styleEl = document.createElement("style");
  styleEl.textContent = getBillInvoiceStyles();
  host.appendChild(styleEl);

  const root = createRoot(host);
  flushSync(() => {
    root.render(createElement(BillInvoiceDocument, { bill: preparedBill }));
  });

  const content = host.querySelector(".bill-invoice-doc");
  if (!content) {
    root.unmount();
    host.remove();
    throw new Error("Failed to render bill document");
  }

  return { host, root, content, styleEl };
};

const cleanupMount = ({ host, root }) => {
  try {
    root.unmount();
  } catch {
    /* ignore */
  }
  host.remove();
};

const buildFilename = (bill) => {
  const num = bill.bill_number || bill.offline_bill_number || "invoice";
  return `invoice-${String(num).replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
};

/** Full invoice CSS embedded for print/PDF — works in PWA standalone windows. */
const getBillInvoiceStyles = () => `${PRINT_BASE_STYLES}\n${billInvoiceStyles || ""}`;

const buildPrintHtml = (prepared, bodyHtml) => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Invoice ${prepared.bill_number || ""}</title>
<style>${getBillInvoiceStyles()}</style>
</head><body>${bodyHtml}</body></html>`;

const openPrintWindow = (html) =>
  new Promise((resolve, reject) => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      reject(new Error("Pop-up blocked — allow pop-ups to print the bill"));
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      resolve(printWindow);
    };

    if (printWindow.document.readyState === "complete") {
      requestAnimationFrame(triggerPrint);
    } else {
      printWindow.onload = triggerPrint;
    }
  });

const resolveServerPdfBlob = (response) => {
  if (response instanceof Blob) {
    return response.type.includes("json") ? null : response;
  }
  if (response && typeof response === "object" && typeof response.size === "number") {
    return new Blob([response], { type: "application/pdf" });
  }
  return null;
};

const printPdfBlob = (blob) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!printWindow) {
      URL.revokeObjectURL(url);
      reject(new Error("Pop-up blocked — allow pop-ups to print the bill"));
      return;
    }

    const cleanup = () => URL.revokeObjectURL(url);

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      cleanup();
      resolve(printWindow);
    };

    printWindow.onload = triggerPrint;
    setTimeout(triggerPrint, 600);
  });

export const printBillDocument = async (bill) => {
  const prepared = await prepareBillForDocument(bill);
  const mount = mountBillDocument(prepared);

  try {
    await openPrintWindow(buildPrintHtml(prepared, mount.content.outerHTML));
  } finally {
    cleanupMount(mount);
  }
};

export const printBillPdfSmart = async (bill, { isOnline, triggerServerPdf } = {}) => {
  const awaitingSync = isBillAwaitingSync(bill);
  const serverBillId =
    bill.server_bill_id || (!awaitingSync && !bill.is_offline ? bill.bill_id : null);

  if (isOnline && serverBillId && typeof triggerServerPdf === "function") {
    try {
      const response = await triggerServerPdf(serverBillId).unwrap();
      const blob = resolveServerPdfBlob(response);
      if (blob) {
        await printPdfBlob(blob);
        return { source: "server" };
      }
    } catch (err) {
      console.warn("Server PDF print failed, falling back to client template:", err);
    }
  }

  await printBillDocument(bill);
  return { source: "client" };
};

export const downloadBillPdfDocument = async (bill) => {
  const prepared = await prepareBillForDocument(bill);
  const mount = mountBillDocument(prepared);

  try {
    // Use mount.content (.bill-invoice-doc) not mount.host.
    // mount.host is positioned off-screen so html2canvas CAN capture it, but its wrapper
    // div adds extra whitespace. mount.content is the actual invoice element.
    // The <style> tag injected into mount.host applies globally to the document,
    // so mount.content is correctly styled even when passed directly to html2pdf.
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: buildFilename(prepared),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(mount.content)
      .save();
  } finally {
    cleanupMount(mount);
  }
};

/**
 * Prefer server PDF when bill is synced and online; otherwise render client template (works offline).
 */
export const downloadBillPdfSmart = async (bill, { isOnline, triggerServerPdf } = {}) => {
  const awaitingSync = isBillAwaitingSync(bill);
  const serverBillId =
    bill.server_bill_id || (!awaitingSync && !bill.is_offline ? bill.bill_id : null);

  if (isOnline && serverBillId && typeof triggerServerPdf === "function") {
    try {
      const response = await triggerServerPdf(serverBillId).unwrap();
      const blob = resolveServerPdfBlob(response);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = buildFilename(
          bill.server_bill_number ? bill : { bill_number: bill.bill_number || serverBillId }
        );
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return { source: "server" };
      }
    } catch (err) {
      console.warn("Server PDF failed, falling back to client template:", err);
    }
  }

  await downloadBillPdfDocument(bill);
  return { source: "client" };
};

export { prepareBillForDocument };
