import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useGetPurchasePerformanceQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseFinanceApi";
import { fmtCurrency, fmtDate } from "../purchaseFinanceUtils";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { ROLES } from "../../../roles";

export default function PurchasePerformanceTab() {
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ORG_MANAGER;
    const warehouseId = user?.warehouse_id || "";

    const [warehouseFilter, setWarehouseFilter] = useState("");
    const effectiveWarehouseId = isSuperAdmin ? warehouseFilter : warehouseId;

    const { data: warehousesData } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }
    );
    const warehouses = warehousesData?.warehouses || [];

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const { data, isLoading, isFetching, refetch } = useGetPurchasePerformanceQuery({
        from_date: fromDate,
        to_date: toDate,
        warehouse_id: effectiveWarehouseId,
    });

    const summary = data?.summary || {};
    const vendors = data?.vendors || [];
    const monthlyTrend = data?.monthly_trend || [];

    const barData = vendors.slice(0, 8).map((v) => ({
        vendor: v.vendor_name?.length > 18 ? `${v.vendor_name.slice(0, 16)}…` : v.vendor_name,
        amount: v.total_amount,
        orders: v.order_count,
    }));

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Purchase Performance</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Vendor analytics from purchase bills, debit notes and inward delivery</p>
                </div>
                <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg">
                    <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 text-gray-700">
                {isSuperAdmin && (
                    <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]">
                        <option value="">All Warehouses</option>
                        {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
                    </select>
                )}
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            {(isLoading || isFetching) && (
                <p className="text-center text-gray-400 py-12">Loading performance data…</p>
            )}

            {!isLoading && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 ">
                        {[
                            { label: "Total Orders", value: summary.total_orders ?? 0 },
                            { label: "Total Value", value: fmtCurrency(summary.total_amount) },
                            { label: "Avg Order", value: fmtCurrency(summary.avg_order_value) },
                            { label: "Top Vendor", value: summary.top_vendor || "—" },
                            { label: "On-Time %", value: summary.on_time_rate_percent != null ? `${summary.on_time_rate_percent}%` : "N/A" },
                            { label: "Return Rate", value: `${summary.return_rate_percent ?? 0}%` },
                        ].map((card) => (
                            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
                                <p className="text-xs uppercase text-gray-500">{card.label}</p>
                                <p className="text-xl font-bold text-gray-800 mt-1 truncate">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-sm font-semibold text-gray-700 mb-4">Purchase volume by vendor</p>
                            {barData.length === 0 ? (
                                <p className="text-sm text-gray-400 py-16 text-center">No data in selected period</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="vendor" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(v) => fmtCurrency(v)} />
                                        <Legend />
                                        <Bar dataKey="amount" name="Amount (₹)" fill="#6366f1" />
                                        <Bar dataKey="orders" name="Orders" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-sm font-semibold text-gray-700 mb-4">Monthly purchase trend</p>
                            {monthlyTrend.length === 0 ? (
                                <p className="text-sm text-gray-400 py-16 text-center">No data in selected period</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart data={monthlyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(v) => fmtCurrency(v)} />
                                        <Line type="monotone" dataKey="total_amount" name="Total (₹)" stroke="#6366f1" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                        <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">Vendor scorecard</div>
                        <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {["Vendor", "Orders", "Total", "Avg Order", "Dr. Note", "Return %", "Last Purchase"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vendors.length === 0 && (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No vendor data</td></tr>
                                )}
                                {vendors.map((v) => (
                                    <tr key={v.vendor_id} className="hover:bg-gray-50 text-gray-700">
                                        <td className="px-4 py-3 font-medium">{v.vendor_name}</td>
                                        <td className="px-4 py-3">{v.order_count}</td>
                                        <td className="px-4 py-3">{fmtCurrency(v.total_amount)}</td>
                                        <td className="px-4 py-3">{fmtCurrency(v.avg_order_value)}</td>
                                        <td className="px-4 py-3 text-red-600">{fmtCurrency(v.debit_note_amount)}</td>
                                        <td className="px-4 py-3">{v.return_rate_percent}%</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(v.last_purchase_date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
