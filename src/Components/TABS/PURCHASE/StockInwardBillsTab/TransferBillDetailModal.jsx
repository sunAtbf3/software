import React from "react";
import { X, Download } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useLazyDownloadTransferBillPdfQuery, useGetTransferBillByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferBill_api/transferBillApi";
import { getTransferBillTypeLabel } from "../../../../constants/transferBillTypes";
import { downloadBlobFile } from "../../../../utils/downloadBlob";
import { formatFranchiseRupee } from "../../../../utils/comboPricing.utils";

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TransferBillDetailModal({ bill, onClose }) {
    const { data: detail, isLoading } = useGetTransferBillByIdQuery(
        { source: bill.source, id: bill.id },
        { skip: !bill?.id }
    );
    const [downloadPdf, { isFetching }] = useLazyDownloadTransferBillPdfQuery();

    const totals = detail?.franchise_bill_totals || bill.franchise_bill_totals;
    const lines = detail?.lines || [];

    const handleDownload = async () => {
        try {
            const blob = await downloadPdf({ source: bill.source, id: bill.id }).unwrap();
            downloadBlobFile(blob, `transfer-bill-${bill.transfer_bill_number}.pdf`);
        } catch {
            toast.error("Failed to download PDF");
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Transfer Bill Details</h3>
                            <p className="text-xs text-gray-400">{bill.transfer_bill_number}</p>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 text-sm text-gray-700">
                        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
                            <p><span className="text-gray-500">Bill Type:</span> {getTransferBillTypeLabel(bill.transfer_bill_type)}</p>
                            <p><span className="text-gray-500">Date:</span> {fmtDate(bill.transfer_bill_generated_at)}</p>
                            <p><span className="text-gray-500">Request:</span> {bill.reference_number}</p>
                            <p><span className="text-gray-500">Source:</span> {bill.source === "bulk" ? "Bulk Transfer" : "Single Transfer"}</p>
                            <p><span className="text-gray-500">From:</span> {bill.from_warehouse?.warehouse_name || "—"}</p>
                            <p><span className="text-gray-500">To Shop:</span> {bill.to_shop?.shop_name || "—"}</p>
                            <p><span className="text-gray-500">Status:</span> {(bill.status || "").replace(/_/g, " ")}</p>
                            <p><span className="text-gray-500">Final Amount:</span> <strong>{fmtMoney(totals?.final_amount)}</strong></p>
                        </div>

                        {isLoading ? (
                            <p className="text-center text-gray-400 py-6">Loading line items...</p>
                        ) : lines.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Product</th>
                                            <th className="px-3 py-2 text-right">Qty</th>
                                            <th className="px-3 py-2 text-right">MRP</th>
                                            <th className="px-3 py-2 text-right">Spl/Sale Price</th>
                                            <th className="px-3 py-2 text-right">F. Price</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {lines.map((line, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">{line.product_name}</td>
                                                <td className="px-3 py-2 text-right">{line.quantity}</td>
                                                <td className="px-3 py-2 text-right">{fmtMoney(line.unit_mrp)}</td>
                                                <td className="px-3 py-2 text-right">{fmtMoney(line.unit_special_price)}</td>
                                                <td className="px-3 py-2 text-right">
                                                    {formatFranchiseRupee(
                                                        line.unit_charged_price != null
                                                            ? line.unit_charged_price
                                                            : line.unit_franchise_price
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium">
                                                    {formatFranchiseRupee(line.line_franchise_total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}

                        {totals && (
                            <div className="bg-indigo-50 rounded-lg p-3 space-y-1 text-sm">
                                <p>MRP Subtotal: {fmtMoney(totals.mrp_subtotal)}</p>
                                <p>Total Special Price: {fmtMoney(totals.special_subtotal)}</p>
                                <p className="font-semibold text-indigo-900">Final (charged): {fmtMoney(totals.final_amount)}</p>
                            </div>
                        )}
                    </div>

                    <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isFetching}
                            className="px-4 py-2 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <Download size={16} />
                            {isFetching ? "Downloading…" : "Download PDF"}
                        </button>
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
