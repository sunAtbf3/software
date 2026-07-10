// TABS/TRANSFERS/TransferHistoryTab.jsx
// One row per transfer request (bulk or single). Eye opens full line-item detail.

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RefreshCw, Eye, X } from "lucide-react";
import { useGetTransferHistoryQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Transfer_api/transferApi";
import { useLazyGetBulkTransferRequestByIdQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferApi";
import { useLazyGetTransferRequestByIdQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
import {
    setLedgerRequestType,
    setLedgerStatus,
    setLedgerDateRange,
    setLedgerCurrentPage,
    resetLedgerFilters,
} from "../../../REDUX_FEATURES/REDUX_SLICES/Transfer_api/transferSlice";
import { getBulkRequestedQty } from "../../../utils/bulkTransfer.utils";

const REQUEST_TYPES = [
    { value: "", label: "All Types" },
    { value: "WH_TO_SHOP", label: "WH → Shop" },
    { value: "WH_TO_WH", label: "WH → WH" },
    { value: "SHOP_TO_SHOP", label: "Shop → Shop" },
];

const STATUS_OPTIONS = [
    { value: "", label: "All (except pending)" },
    { value: "APPROVED", label: "Approved" },
    { value: "DISPATCHED", label: "Dispatched" },
    { value: "IN_TRANSIT", label: "In Transit" },
    { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
    { value: "RECEIVED", label: "Received" },
    { value: "COMPLETED", label: "Completed" },
    { value: "REJECTED", label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
];

const TYPE_BADGE = {
    WH_TO_SHOP: "bg-blue-100 text-blue-700",
    WH_TO_WH: "bg-indigo-100 text-indigo-700",
    SHOP_TO_SHOP: "bg-purple-100 text-purple-700",
};

const STATUS_BADGE = {
    APPROVED: "bg-sky-100 text-sky-800",
    DISPATCHED: "bg-blue-100 text-blue-800",
    IN_TRANSIT: "bg-yellow-100 text-yellow-800",
    PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
    RECEIVED: "bg-green-100 text-green-800",
    COMPLETED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-600",
};

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const typeLabel = (type) =>
    ({
        WH_TO_SHOP: "WH → Shop",
        WH_TO_WH: "WH → WH",
        SHOP_TO_SHOP: "Shop → Shop",
    })[type] || type?.replace(/_/g, " ") || "—";

export default function TransferHistoryTab() {
    const dispatch = useDispatch();
    const { ledgerFilters, ledgerCurrentPage, ledgerPageSize } = useSelector((state) => state.transfer);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);

    const { data, isLoading, isFetching, refetch } = useGetTransferHistoryQuery({
        page: ledgerCurrentPage,
        limit: ledgerPageSize,
        request_type: ledgerFilters.request_type,
        status: ledgerFilters.status,
        from_date: ledgerFilters.from_date,
        to_date: ledgerFilters.to_date,
    });

    const [fetchBulkDetail] = useLazyGetBulkTransferRequestByIdQuery();
    const [fetchSingleDetail] = useLazyGetTransferRequestByIdQuery();

    const transfers = data?.transfers || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const handleFilterChange = (key, value) => {
        if (key === "request_type") dispatch(setLedgerRequestType(value));
        if (key === "status") dispatch(setLedgerStatus(value));
        if (key === "from_date") dispatch(setLedgerDateRange({ from_date: value, to_date: ledgerFilters.to_date }));
        if (key === "to_date") dispatch(setLedgerDateRange({ from_date: ledgerFilters.from_date, to_date: value }));
    };

    const handleViewDetail = async (row) => {
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailRecord({ ...row, _detail: null });
        try {
            if (row.source === "bulk") {
                const detail = await fetchBulkDetail(row.transfer_id).unwrap();
                setDetailRecord({ ...row, _detail: detail, _kind: "bulk" });
            } else {
                const detail = await fetchSingleDetail(row.transfer_id).unwrap();
                setDetailRecord({ ...row, _detail: detail, _kind: "single" });
            }
        } catch {
            setDetailRecord({ ...row, _detail: null, _error: true });
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailRecord(null);
        setDetailLoading(false);
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Transfer History</h2>
                    <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
                        One row per transfer request. Bulk requests with multiple products appear as a single record — click the eye icon to see all line items.
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-700">
                <div className="flex gap-3 flex-wrap items-end">
                    <div className="min-w-[150px]">
                        <label className="block text-xs text-gray-500 mb-1">Transfer Type</label>
                        <select
                            value={ledgerFilters.request_type}
                            onChange={(e) => handleFilterChange("request_type", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            {REQUEST_TYPES.map((t) => (
                                <option key={t.value || "all"} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-[150px]">
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <select
                            value={ledgerFilters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            {STATUS_OPTIONS.map((t) => (
                                <option key={t.value || "all"} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">From Date</label>
                        <input
                            type="date"
                            value={ledgerFilters.from_date}
                            onChange={(e) => handleFilterChange("from_date", e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">To Date</label>
                        <input
                            type="date"
                            value={ledgerFilters.to_date}
                            onChange={(e) => handleFilterChange("to_date", e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    <button
                        onClick={() => dispatch(resetLedgerFilters())}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700 text-sm">Transfer Records</h3>
                    <span className="text-xs text-gray-400">{meta.total} transfers</span>
                </div>

                {(isLoading || isFetching) && (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!isLoading && !isFetching && transfers.length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">
                        No transfer history found. Try adjusting your filters.
                    </div>
                )}

                {!isLoading && !isFetching && transfers.length > 0 && (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[800px] text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Transfer #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Products</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">From</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">To</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transfers.map((row) => (
                                    <tr key={`${row.source}-${row.transfer_id}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[row.request_type] || "bg-gray-100 text-gray-600"}`}>
                                                {typeLabel(row.request_type)}
                                            </span>
                                            {row.source === "bulk" && (
                                                <p className="text-[10px] text-gray-400 mt-0.5">Bulk</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-800">{row.transfer_number}</p>
                                            {row.transfer_bill_number && (
                                                <p className="text-xs text-indigo-600 mt-0.5">Bill: {row.transfer_bill_number}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{row.product_summary}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                                            {row.total_quantity}
                                            {row.items_count > 1 && (
                                                <p className="text-[10px] text-gray-400 font-normal">{row.items_count} items</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{row.from_label}</td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{row.to_label}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] || "bg-gray-100 text-gray-600"}`}>
                                                {row.status?.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(row.activity_at)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleViewDetail(row)}
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                                title="View transfer details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {meta.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-sm text-gray-500">
                        Page {meta.page} of {meta.totalPages} ({meta.total} transfers)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => dispatch(setLedgerCurrentPage(ledgerCurrentPage - 1))}
                            disabled={ledgerCurrentPage <= 1}
                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => dispatch(setLedgerCurrentPage(ledgerCurrentPage + 1))}
                            disabled={ledgerCurrentPage >= meta.totalPages}
                            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {detailOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
                    <div className="flex items-center justify-center min-h-screen px-4 py-8">
                        <div className="fixed inset-0 bg-black/40" onClick={closeDetail} />
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800">Transfer Details</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{detailRecord?.transfer_number}</p>
                                </div>
                                <button type="button" onClick={closeDetail} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {detailLoading && (
                                    <div className="flex justify-center py-10">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}

                                {!detailLoading && detailRecord?._error && (
                                    <p className="text-sm text-red-600 text-center py-8">Failed to load transfer details.</p>
                                )}

                                {!detailLoading && detailRecord && !detailRecord._error && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
                                            <div>
                                                <p className="text-xs text-gray-500">From</p>
                                                <p className="font-medium">{detailRecord.from_label}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">To</p>
                                                <p className="font-medium">{detailRecord.to_label}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Status</p>
                                                <p className="font-medium">{detailRecord._detail?.status || detailRecord.status}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Date</p>
                                                <p className="font-medium">{fmtDate(detailRecord.activity_at)}</p>
                                            </div>
                                        </div>

                                        {detailRecord._kind === "bulk" && detailRecord._detail?.items?.length > 0 && (
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Requested</th>
                                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Approved</th>
                                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Received</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {detailRecord._detail.items.map((item) => (
                                                            <tr key={item.bulk_item_id || item.variant_id}>
                                                                <td className="px-3 py-2">
                                                                    <p className="font-medium">{item.variant?.product?.name || "—"}</p>
                                                                    <p className="text-xs text-gray-400">
                                                                        {item.variant?.product_code || item.variant?.sku || ""}
                                                                    </p>
                                                                </td>
                                                                <td className="px-3 py-2 text-right">{getBulkRequestedQty(item)}</td>
                                                                <td className="px-3 py-2 text-right">{item.approved_quantity ?? "—"}</td>
                                                                <td className="px-3 py-2 text-right">{item.received_quantity ?? 0}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {detailRecord._kind === "single" && detailRecord._detail && (
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Received</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="px-3 py-2">
                                                                <p className="font-medium">{detailRecord._detail.variant?.product?.name || "—"}</p>
                                                                <p className="text-xs text-gray-400">
                                                                    {detailRecord._detail.variant?.product_code || detailRecord._detail.variant?.sku || ""}
                                                                </p>
                                                            </td>
                                                            <td className="px-3 py-2 text-right">{detailRecord._detail.quantity}</td>
                                                            <td className="px-3 py-2 text-right">{detailRecord._detail.received_quantity ?? 0}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {(detailRecord._detail?.request_remarks || detailRecord.remarks) && (
                                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                                <p className="text-xs text-gray-500 mb-1">Remarks</p>
                                                <p>{detailRecord._detail?.request_remarks || detailRecord.remarks}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="border-t px-6 py-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={closeDetail}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
