// TABS/SALES/CreditNoteShared/CreditNoteViewModal.jsx
//
// View Credit Note Details Modal
// FIXED: Customer display from API response (customer_name, customer_mobile at root level)

import React from "react";
import { X, FileText, User, Phone, Receipt, CreditCard } from "lucide-react";
import { useGetCreditNoteByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const STATUS_BADGE = {
    ACTIVE: "bg-green-100 text-green-700",
    PARTIALLY_REDEEMED: "bg-blue-100 text-blue-700",
    REDEEMED: "bg-purple-100 text-purple-700",
    PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
    REFUNDED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-600",
};

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

export default function CreditNoteViewModal({ creditNote, onClose }) {
    const { data: fullCreditNote, isLoading } = useGetCreditNoteByIdQuery(
        creditNote.credit_note_id,
        { skip: creditNote.lines?.length > 0 }
    );
    
    const cn = fullCreditNote || creditNote;
    const creditAmount = toNumber(cn.credit_amount || 0);
    const redeemedAmount = toNumber(cn.amount_redeemed || 0);
    const refundedAmount = toNumber(cn.amount_refunded || 0);
    const totalUsed = redeemedAmount + refundedAmount;
    const balance = toNumber(cn.balance || 0);
    
    // FIXED: Customer data from root level, not nested
    const customerName = cn.customer_name || cn.customer?.name || "—";
    const customerMobile = cn.customer_mobile || cn.customer?.mobile || "—";

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" />
                            Credit Note Details
                        </h3>
                        <p className="text-xs text-gray-400 font-mono">{cn.credit_note_number || cn.credit_note_id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                    <div className="p-6 space-y-5">
                        <div className="flex justify-between items-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[cn.status] || "bg-gray-100 text-gray-600"}`}>
                                {cn.status?.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-gray-400">Created: {fmtDateTime(cn.created_at)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                            <div className="text-center"><p className="text-xs text-gray-500">Total Amount</p><p className="text-xl font-bold text-gray-800">₹{creditAmount.toFixed(2)}</p></div>
                            <div className="text-center"><p className="text-xs text-gray-500">Used</p><p className="text-xl font-bold text-orange-600">₹{totalUsed.toFixed(2)}</p></div>
                            <div className="text-center"><p className="text-xs text-gray-500">Balance</p><p className="text-xl font-bold text-green-600">₹{balance.toFixed(2)}</p></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-blue-50 rounded-lg p-3">
                            <div>
                                <p className="text-xs text-gray-500">Original Bill</p>
                                <p className="font-medium text-gray-800 font-mono">{cn.original_bill?.bill_number || cn.original_bill_id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Issued at shop</p>
                                <p className="font-medium text-gray-800">{cn.shop?.shop_name || "—"}</p>
                            </div>
                        </div>

                        {cn.last_redemption && (
                            <div className="bg-purple-50 rounded-lg p-3 text-sm">
                                <p className="text-xs font-medium text-purple-800 mb-1">Last used</p>
                                <p className="text-gray-700">
                                    {cn.last_redemption.shop_name ? `At ${cn.last_redemption.shop_name}` : "—"}
                                    {cn.last_redemption.amount != null && ` · ₹${toNumber(cn.last_redemption.amount).toFixed(2)}`}
                                    {cn.last_redemption.bill_number && ` · Bill ${cn.last_redemption.bill_number}`}
                                </p>
                                {cn.last_redemption.redeemed_at && (
                                    <p className="text-xs text-gray-500 mt-1">{fmtDateTime(cn.last_redemption.redeemed_at)}</p>
                                )}
                            </div>
                        )}

                        {/* FIXED: Customer display using root level fields */}
                        <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-green-800 mb-2 flex items-center gap-2"><User size={14} /> Customer Details</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="font-medium text-gray-800">{customerName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Mobile</p>
                                    <p className="font-medium text-gray-800 flex items-center gap-1"><Phone size={12} /> {customerMobile}</p>
                                </div>
                            </div>
                        </div>

                        {cn.remarks && (
                            <div className="bg-yellow-50 rounded-lg p-3">
                                <p className="text-xs font-medium text-yellow-800 mb-1">Reason</p>
                                <p className="text-sm text-gray-700">{cn.remarks}</p>
                            </div>
                        )}

                        {cn.lines && cn.lines.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Returned Items</p>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                                    <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Price</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-gray-700">
                                            {cn.lines.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2">
                                                        <p className="font-medium text-gray-800">{item.variant?.product?.name || item.product_name}</p>
                                                        <p className="text-xs font-semibold text-blue-600">{item.variant?.product_code || item.variant?.sku || "—"}</p>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-right">₹{toNumber(item.unit_price).toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-right font-semibold">₹{toNumber(item.line_total).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {cn.restore_stock && (
                            <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-xs font-medium text-green-800 flex items-center gap-1">📦 Stock Restored</p>
                                <p className="text-xs text-green-600 mt-1">Product stock has been added back to the shop</p>
                            </div>
                        )}

                        {cn.redemptions && cn.redemptions.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Receipt size={14} /> Redemption History</p>
                                <div className="space-y-2">
                                    {cn.redemptions.map((red) => (
                                        <div key={red.redemption_id || red.redeemed_at} className="bg-gray-50 rounded-lg p-2 text-sm text-gray-700">
                                            <div className="flex justify-between">
                                                <span className="font-medium">₹{toNumber(red.amount).toFixed(2)}</span>
                                                <span className="text-xs text-gray-500">{fmtDateTime(red.redeemed_at)}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {red.redeemed_at_shop?.shop_name ? `At ${red.redeemed_at_shop.shop_name}` : ""}
                                                {red.against_bill?.bill_number ? ` · Bill ${red.against_bill.bill_number}` : ""}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {cn.refunds && cn.refunds.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><CreditCard size={14} /> Refund History</p>
                                <div className="space-y-2">
                                    {cn.refunds.map((ref, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-lg p-2 text-sm text-gray-700">
                                            <div className="flex justify-between">
                                                <span className="font-medium">₹{toNumber(ref.amount).toFixed(2)}</span>
                                                <span className="text-xs text-gray-500">{fmtDateTime(ref.refunded_at)}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">Method: {ref.refund_method} • Ref: {ref.reference_no || "—"}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="sticky bottom-0 bg-white border-t text-gray-700 border-gray-100 px-6 py-4 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Close</button>
                </div>
            </div>
    </div>
</div>
    );
}