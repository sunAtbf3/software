// TABS/WAREHOUSES/PURCHASE/PurchaseTab.jsx
//
// Read-only purchase history view
// Purchase entries are automatically created when inward is marked MAPPED
// This tab shows all purchases with filtering by vendor, warehouse, date range

import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Eye, Package, TrendingUp, Building2, Calendar, FileText, Download } from "lucide-react";
import {
    useGetPurchaseEntriesQuery,
    useGetVendorPurchaseSummaryQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseApi";
import { useGetVendorsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Vendor_api/vendorApi";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import {
    openDetailModal,
    closeDetailModal,
    setSearch,
    setVendorFilter,
    setWarehouseFilter,
    setStatusFilter,
    setFromDate,
    setToDate,
    setCurrentPage,
    setPageSize,
    resetFilters,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseSlice";
import PurchaseDetailModal from "./PurchaseDetailModal";
import { CURRENT_USER } from "../../../roles";

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

const STATUS_BADGE = {
    RECEIVED: "bg-green-50 text-green-700 border border-green-200",
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    CANCELLED: "bg-red-50 text-red-600 border border-red-200",
};

export default function PurchaseTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const {
        showDetailModal,
        selectedPurchase,
        search,
        vendorFilter,
        warehouseFilter,
        statusFilter,
        fromDate,
        toDate,
        currentPage,
        pageSize,
    } = useSelector((state) => state.purchase);

    const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ORG_MANAGER";
    const isWHRole = ["WH_MANAGER", "WH_STOCK_LISTER"].includes(user?.role);
    const userWarehouseId = user?.warehouse_id || "";

    // Effective warehouse filter: WH roles get their warehouse, SUPER_ADMIN can select
    const effectiveWarehouseId = isSuperAdmin ? warehouseFilter : userWarehouseId;

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data, isLoading, isFetching, refetch } = useGetPurchaseEntriesQuery({
        page: currentPage,
        limit: pageSize,
        search,
        vendor_id: vendorFilter,
        warehouse_id: effectiveWarehouseId,
        status: statusFilter,
        from_date: fromDate,
        to_date: toDate,
    });

    const { data: summaryData } = useGetVendorPurchaseSummaryQuery({
        from_date: fromDate,
        to_date: toDate,
    });

    const { data: vendorsData } = useGetVendorsQuery({ page: 1, limit: 100 });
    const { data: warehousesData } = useGetWarehousesQuery({ page: 1, limit: 100, is_active: "true" }, { skip: !isSuperAdmin });

    const purchases = data?.purchases || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
    const vendors = vendorsData?.vendors || [];
    const warehouses = warehousesData?.warehouses || [];
    const summary = summaryData || [];

    // Calculate totals from summary
    const totalPurchases = summary.reduce((sum, v) => sum + v.total_purchases, 0);
    const totalAmount = summary.reduce((sum, v) => sum + v.total_amount, 0);

    // Status options
    const statusOptions = ["", "RECEIVED", "PENDING", "CANCELLED"];
    const statusLabels = { "": "All Status", RECEIVED: "Received", PENDING: "Pending", CANCELLED: "Cancelled" };

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Purchase History</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Purchase entries are automatically created when inwards are marked MAPPED
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Total Purchases</p>
                    <p className="text-3xl font-bold text-gray-800">{meta.total}</p>
                    <p className="text-xs text-gray-400 mt-1">in selected period</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Total Value</p>
                    <p className="text-3xl font-bold text-gray-800">₹{totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">across all purchases</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Unique Vendors</p>
                    <p className="text-3xl font-bold text-gray-800">{summary.length}</p>
                    <p className="text-xs text-gray-400 mt-1">suppliers</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Date Range</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-800 mt-1 break-words">
                        {fromDate ? fmtDate(fromDate) : "All"} - {toDate ? fmtDate(toDate) : "Present"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">filter applied</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search by PO number, invoice, vendor name..."
                        className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button
                        onClick={() => dispatch(resetFilters())}
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {/* Vendor Filter */}
                    <select
                        value={vendorFilter}
                        onChange={(e) => dispatch(setVendorFilter(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                    >
                        <option value="">All Vendors</option>
                        {vendors.map(v => (
                            <option key={v.vendor_id} value={v.vendor_id}>
                                {v.company_name}
                            </option>
                        ))}
                    </select>

                    {/* Warehouse Filter - SUPER_ADMIN only */}
                    {isSuperAdmin && (
                        <select
                            value={warehouseFilter}
                            onChange={(e) => dispatch(setWarehouseFilter(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                        >
                            <option value="">All Warehouses</option>
                            {warehouses.map(w => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.warehouse_name} — {w.city}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => dispatch(setStatusFilter(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                    >
                        {statusOptions.map(s => (
                            <option key={s} value={s}>{statusLabels[s]}</option>
                        ))}
                    </select>

                    {/* From Date */}
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => dispatch(setFromDate(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        placeholder="From Date"
                    />

                    {/* To Date */}
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => dispatch(setToDate(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        placeholder="To Date"
                    />

                    {/* Page Size */}
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="w-full sm:w-auto sm:col-span-2 lg:col-span-1 xl:col-span-1 sm:ml-auto bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                    >
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>

            {/* Vendor Summary Section */}
            {summary.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor-wise Summary</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Vendor</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total Purchases</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {summary.map((v) => (
                                    <tr key={v.vendor_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-700">{v.vendor_name}</td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-500">{v.total_purchases}</td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                                            ₹{v.total_amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>
                </div>
            )}

            {/* Purchase Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchase History</span>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{meta.total} records</span>
                </div>
                <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Purchase #</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Vendor</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Warehouse</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Invoice #</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total Amount</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Status</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Received Date</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">

                        {(isLoading || isFetching) && (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    </div>
                                 </td>
                            </tr>
                        )}

                        {!isLoading && !isFetching && purchases.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-14 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Package size={32} className="text-gray-300" />
                                        <p className="text-sm text-gray-400">No purchase entries found</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Purchase entries are created automatically when inwards are marked MAPPED
                                        </p>
                                    </div>
                                 </td>
                            </tr>
                        )}

                        {!isLoading && purchases.map((purchase) => (
                            <tr key={purchase.purchase_id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{purchase.purchase_number}</span>
                                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(purchase.created_at)}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-gray-700 font-medium">{purchase.vendor?.company_name || "—"}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-gray-500">{purchase.warehouse?.warehouse_name || "—"}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-mono text-xs text-gray-500">{purchase.vendor_invoice_no || "—"}</p>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="font-semibold text-gray-800">₹{purchase.total_amount?.toLocaleString()}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[purchase.status] || "bg-gray-100 text-gray-500"}`}>
                                        {purchase.status || "RECEIVED"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-xs text-gray-400">{fmtDateTime(purchase.received_at)}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => dispatch(openDetailModal(purchase))}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-xs text-gray-400">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
                    </p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">{currentPage} / {meta.totalPages}</span>
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                            disabled={currentPage === meta.totalPages}
                            className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Purchase Detail Modal */}
            {showDetailModal && selectedPurchase && (
                <PurchaseDetailModal
                    purchase={selectedPurchase}
                    onClose={() => dispatch(closeDetailModal())}
                />
            )}

            {/* Read-only note */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-blue-600">
                    📌 Purchase entries are read-only. They are automatically created when inwards are marked MAPPED.
                    Each purchase entry links to the original inward receipt and stock addition.
                </p>
            </div>

        </div>
    );
}