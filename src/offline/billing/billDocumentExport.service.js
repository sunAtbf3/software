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

const mountBillDocument = (preparedBill, printFormat = "A4") => {
  const host = document.createElement("div");
  host.className = "bill-print-host";
  // NOTE: Use left:-9999px instead of opacity:0.
  // opacity:0 causes html2canvas to render a blank canvas (invisible = no pixels captured).
  // Positioning off-screen keeps it hidden to the user while still being capturable by html2canvas.
  const width = printFormat === "80mm" ? "80mm" : "210mm";
  host.style.cssText =
    `position:fixed;left:-9999px;top:0;width:${width};pointer-events:none;z-index:-1;background:#fff;`;
  document.body.appendChild(host);

  const root = createRoot(host);
  flushSync(() => {
    root.render(createElement(BillInvoiceDocument, { bill: preparedBill, printFormat }));
  });

  const content = host.querySelector(".bill-invoice-doc");
  if (!content) {
    root.unmount();
    host.remove();
    throw new Error("Failed to render bill document");
  }

  const styleEl = document.createElement("style");
  styleEl.textContent = getBillInvoiceStyles(printFormat);
  content.appendChild(styleEl);

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
const getBillInvoiceStyles = (printFormat = "A4") => {
  let styles = `${PRINT_BASE_STYLES}\n${billInvoiceStyles || ""}`;
  if (printFormat === "80mm") {
    styles += `
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      width: 80mm;
      background: #fff;
    }
    .bill-invoice-doc {
      width: 80mm;
      padding: 2mm 1mm;
      margin: 0;
    }
    `;
  }
  return styles;
};

const buildPrintHtml = (prepared, bodyHtml, printFormat = "A4") => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Invoice ${prepared.bill_number || ""}</title>
<style>${getBillInvoiceStyles(printFormat)}</style>
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

export const printBillDocument = async (bill, { printFormat = "A4" } = {}) => {
  const prepared = await prepareBillForDocument(bill);
  const mount = mountBillDocument(prepared, printFormat);

  try {
    await openPrintWindow(buildPrintHtml(prepared, mount.content.outerHTML, printFormat));
  } finally {
    cleanupMount(mount);
  }
};

export const printBillPdfSmart = async (bill, { isOnline, triggerServerPdf, printFormat = "A4" } = {}) => {
  const awaitingSync = isBillAwaitingSync(bill);
  const serverBillId =
    bill.server_bill_id || (!awaitingSync && !bill.is_offline ? bill.bill_id : null);

  if (isOnline && serverBillId && typeof triggerServerPdf === "function") {
    try {
      const response = await triggerServerPdf({ billId: serverBillId, printFormat }).unwrap();
      const blob = resolveServerPdfBlob(response);
      if (blob) {
        await printPdfBlob(blob);
        return { source: "server" };
      }
    } catch (err) {
      console.warn("Server PDF print failed, falling back to client template:", err);
    }
  }

  await printBillDocument(bill, { printFormat });
  return { source: "client" };
};

export const downloadBillPdfDocument = async (bill, { printFormat = "A4" } = {}) => {
  const prepared = await prepareBillForDocument(bill);
  const mount = mountBillDocument(prepared, printFormat);

  try {
    // Use mount.content (.bill-invoice-doc) not mount.host.
    // mount.host is positioned off-screen so html2canvas CAN capture it, but its wrapper
    // div adds extra whitespace. mount.content is the actual invoice element.
    // The <style> tag injected into mount.host applies globally to the document,
    // so mount.content is correctly styled even when passed directly to html2pdf.
    const isThermal = printFormat === "80mm";
    // For thermal: measure the actual rendered height so the PDF page grows with content.
    // For A4: use standard a4 size.
    let jsPdfFormat = "a4";
    if (isThermal) {
      const contentHeightPx = mount.content.scrollHeight || mount.content.offsetHeight || 0;
      // Convert px → mm (96 dpi: 1px = 0.2646mm) then add a 10mm safety margin
      const contentHeightMm = Math.ceil(contentHeightPx * 0.2646) + 10;
      jsPdfFormat = [80, Math.max(100, contentHeightMm)];
    }
    await html2pdf()
      .set({
        margin: 0,
        filename: buildFilename(prepared),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: isThermal ? 302 : 794,
        },
        jsPDF: { unit: "mm", format: jsPdfFormat, orientation: "portrait" },
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
export const downloadBillPdfSmart = async (bill, { isOnline, triggerServerPdf, printFormat = "A4" } = {}) => {
  const awaitingSync = isBillAwaitingSync(bill);
  const serverBillId =
    bill.server_bill_id || (!awaitingSync && !bill.is_offline ? bill.bill_id : null);

  if (isOnline && serverBillId && typeof triggerServerPdf === "function") {
    try {
      const response = await triggerServerPdf({ billId: serverBillId, printFormat }).unwrap();
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

  await downloadBillPdfDocument(bill, { printFormat });
  return { source: "client" };
};

export { prepareBillForDocument };
