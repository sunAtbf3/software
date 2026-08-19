import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RefreshCw, History } from "lucide-react";
import {
    useGetBillSettlementStatusQuery,
    useGetPurchasePaymentHistoryQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseFinanceApi";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { useGetVendorsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Vendor_api/vendorApi";
import { fmtCurrency, fmtDate, getPaymentMethodLabel, PAYMENT_STATUS_BADGE } from "../purchaseFinanceUtils";
import { ROLES } from "../../../roles";

function PaymentHistoryPanel({ purchaseId, onClose }) {
    const { data, isFetching } = useGetPurchasePaymentHistoryQuery(purchaseId, { skip: !purchaseId });

    if (!purchaseId) return null;

    return (
        <div className="border border-blue-100 rounded-xl bg-blue-50/30 overflow-hidden">
            <div className="px-4 py-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-700 uppercase">
                    Payment history — {data?.purchase?.purchase_number || "…"}
                </p>
                <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
            </div>
            {isFetching && <p className="px-4 py-4 text-sm text-gray-400">Loading…</p>}
            {!isFetching && data && (
                <>
                    <p className="px-4 pb-2 text-xs text-gray-500">
                        Bill amount: {fmtCurrency(data.purchase?.total_amount)} · Due (after paid): {fmtCurrency(data.outstanding_amount)}
                    </p>
                    <table className="w-full text-sm bg-white">
                        <thead className="border-t border-blue-100">
                            <tr>
                                {["Payment #", "Date", "Allocated", "Method", "Status"].map((h) => (
                                    <th key={h} className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase text-left">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(data.payments || []).length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-xs">No payments recorded</td></tr>
                            )}
                            {(data.payments || []).map((row) => (
                                <tr key={row.payment_id}>
                                    <td className="px-4 py-2 font-mono text-xs">{row.payment_number}</td>
                                    <td className="px-4 py-2 text-xs">{fmtDate(row.payment_date)}</td>
                                    <td className="px-4 py-2">{fmtCurrency(row.allocated_amount)}</td>
                                    <td className="px-4 py-2 text-xs">{getPaymentMethodLabel(row.payment_method)}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_BADGE[row.status] || ""}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}

export default function BillPaymentStatusTab() {
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ORG_MANAGER;
    const warehouseId = user?.warehouse_id || "";

    const [warehouseFilter, setWarehouseFilter] = useState("");
    const [vendorFilter, setVendorFilter] = useState("");
    const [search, setSearch] = useState("");
    const [balanceFilter, setBalanceFilter] = useState("all");
    const [historyPurchaseId, setHistoryPurchaseId] = useState(null);

    const effectiveWarehouseId = isSuperAdmin ? warehouseFilter : warehouseId;

    const { data: warehousesData } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }
    );
    const warehouses = warehousesData?.warehouses || [];

    const { data: vendorsData } = useGetVendorsQuery({ page: 1, limit: 200 });
    const vendors = vendorsData?.vendors || [];

    const { data, isLoading, isFetching, refetch } = useGetBillSettlementStatusQuery({
        search,
        vendor_id: vendorFilter,
        warehouse_id: effectiveWarehouseId,
        balance_filter: balanceFilter,
        limit: 100,
    });

    const bills = data?.bills || [];
    const summary = data?.meta?.summary || {};

    const settlementBadge = (row) => {
        if (row.outstanding_amount <= 0.01 && row.paid_total > 0) {
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Cleared</span>;
        }
        if (row.pending_total > 0.01 && row.paid_total > 0.01) {
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Partial + Pending</span>;
        }
        if (row.pending_total > 0.01) {
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">Pending</span>;
        }
        if (row.paid_total > 0.01) {
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">Partial Paid</span>;
        }
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">Unpaid</span>;
    };

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Bill Payment Status</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Vendor purchase bills — paid, pending, and due breakdown</p>
                </div>
                <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg">
                    <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                    { label: "Bills", value: summary.total_bills || 0 },
                    { label: "Bill Amount", value: fmtCurrency(summary.total_bill_amount) },
                    { label: "Paid (cleared)", value: fmtCurrency(summary.total_paid), tone: "text-green-700" },
                    { label: "Pending", value: fmtCurrency(summary.total_pending), tone: "text-yellow-700" },
                    { label: "Due", value: fmtCurrency(summary.total_due), tone: "text-red-600" },
                ].map((card) => (
                    <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
                        <p className="text-xs uppercase text-gray-500">{card.label}</p>
                        <p className={`text-2xl font-bold ${card.tone || "text-gray-800"}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 text-gray-700">
                {isSuperAdmin && (
                    <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]">
                        <option value="">All Warehouses</option>
                        {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
                    </select>
                )}
                <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]">
                    <option value="">All Vendors</option>
                    {vendors.map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.company_name}</option>)}
                </select>
                <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="all">All with activity</option>
                    <option value="due">Due remaining</option>
                    <option value="has_pending">Has pending payment</option>
                    <option value="cleared">Fully cleared</option>
                </select>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search bill, invoice, vendor…"
                    className="flex-1 min-w-[180px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Vendor", "Purchase Bill", "Invoice", "Bill Amount", "Paid", "Pending", "Due", "Status", ""].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(isLoading || isFetching) && (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
                        )}
                        {!isLoading && bills.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No purchase bills match your filters</td></tr>
                        )}
                        {bills.map((row) => (
                            <tr key={row.purchase_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{row.vendor?.company_name}</td>
                                <td className="px-4 py-3 font-mono text-xs">{row.purchase_number}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{row.vendor_invoice_no || "—"}</td>
                                <td className="px-4 py-3">{fmtCurrency(row.net_payable)}</td>
                                <td className="px-4 py-3 font-medium text-green-700">{fmtCurrency(row.paid_total)}</td>
                                <td className="px-4 py-3 font-medium text-yellow-700">{fmtCurrency(row.pending_total)}</td>
                                <td className="px-4 py-3 font-medium text-red-600">{fmtCurrency(row.outstanding_amount)}</td>
                                <td className="px-4 py-3">{settlementBadge(row)}</td>
                                <td className="px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => setHistoryPurchaseId(row.purchase_id)}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    >
                                        <History size={12} /> History
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {historyPurchaseId && (
                <PaymentHistoryPanel
                    purchaseId={historyPurchaseId}
                    onClose={() => setHistoryPurchaseId(null)}
                />
            )}
        </div>
    );
}
