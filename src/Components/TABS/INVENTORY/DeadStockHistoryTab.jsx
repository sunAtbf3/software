import React, { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useGetDeadStockHistoryQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi";

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

/**
 * Dead Stock history — shop Adjust Stock reductions that never return to warehouse.
 */
export default function DeadStockHistoryTab() {
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);

    const params = useMemo(() => {
        const p = { page, limit: 20 };
        if (search.trim()) p.search = search.trim();
        if (fromDate) p.from_date = fromDate;
        if (toDate) p.to_date = toDate;
        return p;
    }, [page, search, fromDate, toDate]);

    const { data, isLoading, isFetching, refetch, isError, error } = useGetDeadStockHistoryQuery(params);

    const entries = data?.entries || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Dead Stock History</h2>
                    <p className="text-xs text-gray-500">
                        Stock reduced from shop Adjust Stock (not returned to warehouse).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="flex flex-wrap gap-2 items-end">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search product, code, reason…"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(1);
                        }}
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(1);
                        }}
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm table-fixed min-w-[880px]">
                    <colgroup>
                        <col className="w-[128px]" />
                        <col className="w-[18%]" />
                        <col className="w-[90px]" />
                        <col className="w-[88px]" />
                        <col className="w-[72px]" />
                        <col className="w-[64px]" />
                        <col className="w-[22%]" />
                        <col className="w-[88px]" />
                        <col className="w-[72px]" />
                    </colgroup>
                    <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
                        <tr>
                            <th className="px-2.5 py-2.5 text-left font-medium">Date</th>
                            <th className="px-2.5 py-2.5 text-left font-medium">Product</th>
                            <th className="px-2.5 py-2.5 text-left font-medium">Code</th>
                            <th className="px-2.5 py-2.5 text-right font-medium leading-tight">
                                Available
                                <br />
                                Then
                            </th>
                            <th className="px-2.5 py-2.5 text-right font-medium">Reduced</th>
                            <th className="px-2.5 py-2.5 text-right font-medium">Left</th>
                            <th className="px-2.5 py-2.5 text-left font-medium">Reason</th>
                            <th className="px-2.5 py-2.5 text-right font-medium leading-tight">
                                Current
                                <br />
                                Stock
                            </th>
                            <th className="px-2.5 py-2.5 text-left font-medium">By</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                                    Loading…
                                </td>
                            </tr>
                        ) : isError ? (
                            <tr>
                                <td colSpan={9} className="px-3 py-8 text-center text-red-500 text-xs">
                                    {error?.data?.message || "Failed to load dead stock history"}
                                </td>
                            </tr>
                        ) : entries.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                                    No dead stock entries yet
                                </td>
                            </tr>
                        ) : (
                            entries.map((row) => (
                                <tr key={row.dead_stock_id} className="hover:bg-gray-50/80">
                                    <td className="px-2.5 py-2 text-xs text-gray-600 whitespace-nowrap">
                                        {fmtDate(row.created_at)}
                                    </td>
                                    <td className="px-2.5 py-2 text-xs font-medium text-gray-800 truncate" title={row.product_name || ""}>
                                        {row.product_name || "—"}
                                    </td>
                                    <td className="px-2.5 py-2 text-xs font-mono text-gray-500 truncate" title={row.product_code || ""}>
                                        {row.product_code || "—"}
                                    </td>
                                    <td className="px-2.5 py-2 text-right text-xs tabular-nums text-gray-700">
                                        {row.quantity_before}
                                    </td>
                                    <td className="px-2.5 py-2 text-right text-xs tabular-nums font-semibold text-red-600">
                                        −{row.quantity_reduced}
                                    </td>
                                    <td className="px-2.5 py-2 text-right text-xs tabular-nums text-gray-800">
                                        {row.quantity_after}
                                    </td>
                                    <td className="px-2.5 py-2 text-xs text-gray-600">
                                        <span className="line-clamp-2 break-words" title={row.reason}>
                                            {row.reason || "—"}
                                        </span>
                                    </td>
                                    <td className="px-2.5 py-2 text-right text-xs tabular-nums font-medium text-blue-700">
                                        {row.current_stock ?? 0}
                                    </td>
                                    <td className="px-2.5 py-2 text-xs text-gray-500 truncate" title={row.created_by_user?.name || ""}>
                                        {row.created_by_user?.name || "—"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {meta.totalPages > 1 ? (
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        Page {meta.page} of {meta.totalPages} · {meta.total} entries
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page >= meta.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
