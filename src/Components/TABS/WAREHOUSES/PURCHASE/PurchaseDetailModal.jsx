// TABS/WAREHOUSES/PURCHASE/PurchaseDetailModal.jsx
//
// Modal showing detailed purchase entry with all items
// Called from PurchaseTab when user clicks "View Details"

import React from "react";
import { useDispatch } from "react-redux";
import { X, Package, Building2, MapPin, Calendar, FileText, Hash, Layers, Download } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useGetPurchaseByIdQuery, useLazyDownloadPurchasePdfQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseApi";
import { downloadBlobFile } from "../../../../utils/downloadBlob";
import { closeDetailModal } from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseSlice";

const fmtDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const STATUS_BADGE = {
    RECEIVED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    CANCELLED: "bg-red-100 text-red-600",
};

const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3">
        {Icon && <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />}
        <div className="flex-1">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm text-gray-800 font-medium mt-0.5">{value || "—"}</p>
        </div>
    </div>
);

export default function PurchaseDetailModal({ purchase, onClose }) {
    const dispatch = useDispatch();

    const { data: purchaseDetail, isLoading } = useGetPurchaseByIdQuery(
        purchase?.purchase_id,
        { skip: !purchase?.purchase_id }
    );

    const detail = purchaseDetail || purchase;
    const displayItems =
        detail?.display_lines_by_variant?.length
            ? detail.display_lines_by_variant
            : detail?.display_lines?.length
                ? detail.display_lines
                : detail?.items || [];
    const [downloadPdf, { isFetching: isDownloading }] = useLazyDownloadPurchasePdfQuery();

    const handleDownloadPdf = async () => {
        if (!detail?.purchase_id) return;
        try {
            const blob = await downloadPdf(detail.purchase_id).unwrap();
            downloadBlobFile(blob, `purchase-${detail.purchase_number}.pdf`);
            toast.success("Purchase PDF downloaded");
        } catch (err) {
            toast.error(err?.data?.message || "Failed to download PDF");
        }
    };

    const handleClose = () => {
        dispatch(closeDetailModal());
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-800">Purchase Details</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[detail.status] || "bg-gray-100 text-gray-500"}`}>
                                {detail.status || "RECEIVED"}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {detail.purchase_number}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="p-6 space-y-6">

                        {/* Header Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-gray-100">
                            <InfoRow label="Vendor" value={detail.vendor?.company_name} icon={Building2} />
                            <InfoRow label="Warehouse" value={detail.warehouse?.warehouse_name} icon={MapPin} />
                            <InfoRow label="Invoice Number" value={detail.vendor_invoice_no} icon={FileText} />
                            <InfoRow label="Purchase Date" value={fmtDateTime(detail.purchase_date)} icon={Calendar} />
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                            <InfoRow label="Received By" value={detail.received_by_user?.name || detail.received_by} icon={Hash} />
                            <InfoRow label="Received At" value={fmtDateTime(detail.received_at)} icon={Calendar} />
                        </div>

                        {/* Remarks */}
                        {detail.remarks && (
                            <div className="pb-4 border-b border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Remarks</p>
                                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{detail.remarks}</p>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-100">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500">Subtotal</p>
                                <p className="text-lg font-bold text-gray-800">₹{detail.subtotal?.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500">Tax Amount</p>
                                <p className="text-lg font-bold text-gray-800">₹{detail.tax_amount?.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-blue-600">Total Amount</p>
                                <p className="text-lg font-bold text-blue-700">₹{detail.total_amount?.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Layers size={16} className="text-gray-500" />
                                <p className="text-sm font-semibold text-gray-700">
                                    Items Received ({displayItems.length})
                                </p>
                            </div>

                            {displayItems.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                                    No items found in this purchase
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                                    <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Variant Info</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Quantity</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Unit Cost</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">GST%</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Tax</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Line Total</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Batch</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {displayItems.map((item, idx) => {
                                                const productName = item.product_name || item.product?.name || "—";
                                                const productCode = item.product_code || item.product?.product_code || "—";
                                                const variantSku =
                                                    item.variant_sku ||
                                                    item.variant?.sku ||
                                                    item.variant?.system_barcode ||
                                                    "—";
                                                const lineSubtotal = item.line_subtotal ?? (item.quantity || 0) * (item.purchase_cost || 0);
                                                const lineTotal = item.line_total ?? lineSubtotal + (item.tax_amount || 0);
                                                const location = [item.room_zone, item.rack_shelf].filter(Boolean).join(" / ") || "—";
                                                const batchDisplay =
                                                    item.batch_display ||
                                                    item.batch_number ||
                                                    (item.batch_numbers?.length ? item.batch_numbers.join(", ") : "—");

                                                return (
                                                    <tr key={item.purchase_item_id || item.variant_id || idx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2.5">
                                                            <p className="font-medium text-gray-800 text-sm">{productName}</p>
                                                            <p className="text-xs font-semibold text-blue-600 mt-0.5">{productCode}</p>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <p className="text-xs font-mono text-gray-600">{variantSku}</p>
                                                            {item.line_count > 1 && (
                                                                <p className="text-[10px] text-indigo-500 mt-0.5">
                                                                    {item.line_count} inward lines merged
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-gray-600">
                                                            ₹{item.purchase_cost?.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-gray-600">
                                                            {item.gst_percent ?? 0}%
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-gray-600">
                                                            ₹{(item.tax_amount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                                                            ₹{lineTotal.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="text-xs font-mono text-gray-500">
                                                                {batchDisplay}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <MapPin size={12} />
                                                                <span>{location}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer note */}
                        <div className="bg-gray-50 rounded-lg px-4 py-3">
                            <p className="text-xs text-gray-500 text-center">
                                This purchase entry was automatically created from inward receipt.
                                Stock was added to warehouse when this purchase was marked as RECEIVED.
                            </p>
                        </div>

                    </div>
                )}

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={isDownloading || !detail?.purchase_id}
                        className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download size={16} />
                        {isDownloading ? "Downloading…" : "Purchase PDF"}
                    </button>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                        Close
                    </button>
                </div>

            </div>
    </div>
</div>
    );
}