import { useCallback, useState } from "react";
import { toast } from "../../Components/shared/ToastConfig";
import {
  printBillPdfSmart,
  downloadBillPdfSmart,
} from "../billing/billDocumentExport.service";

export const useBillDocumentActions = ({ triggerServerPdf, isOnline } = {}) => {
  const [busyAction, setBusyAction] = useState(null);

  const printBill = useCallback(
    async (bill, { printFormat = "A4" } = {}) => {
      if (!bill) {
        toast.error("No bill available to print");
        return;
      }
      setBusyAction("print");
      try {
        await printBillPdfSmart(bill, { isOnline, triggerServerPdf, printFormat });
      } catch (err) {
        console.error("Print bill error:", err);
        toast.error(err?.message || "Failed to print bill");
      } finally {
        setBusyAction(null);
      }
    },
    [isOnline, triggerServerPdf]
  );

  const downloadPdf = useCallback(
    async (bill, { printFormat = "A4" } = {}) => {
      if (!bill) {
        toast.error("No bill available to download");
        return;
      }
      setBusyAction("pdf");
      try {
        const { source } = await downloadBillPdfSmart(bill, {
          isOnline,
          triggerServerPdf,
          printFormat,
        });
        toast.success(
          source === "server" ? "PDF downloaded from server" : "PDF downloaded"
        );
      } catch (err) {
        console.error("PDF download error:", err);
        toast.error(err?.message || "Failed to download PDF");
      } finally {
        setBusyAction(null);
      }
    },
    [isOnline, triggerServerPdf]
  );

  return {
    printBill,
    downloadPdf,
    isPrinting: busyAction === "print",
    isPdfLoading: busyAction === "pdf",
    isBusy: Boolean(busyAction),
  };
};
