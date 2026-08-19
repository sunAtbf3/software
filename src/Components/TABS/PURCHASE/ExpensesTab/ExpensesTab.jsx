import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Plus, RefreshCw, Edit2, XCircle } from "lucide-react";
import {
    useGetWarehouseExpensesQuery,
    useCancelWarehouseExpenseMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseFinanceApi";
import ExpenseFormModal from "./ExpenseFormModal";
import {
    fmtCurrency,
    fmtDate,
    EXPENSE_CATEGORIES,
    getExpenseCategoryLabel,
    getPaymentMethodLabel,
} from "../purchaseFinanceUtils";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { ROLES } from "../../../roles";

const DEFAULT_TITLE = "Expenses";
const DEFAULT_SUBTITLE =
    "Warehouse operating costs — rent, freight, labour, utilities (not inventory purchase)";

export default function ExpensesTab({
    title = DEFAULT_TITLE,
    subtitle = DEFAULT_SUBTITLE,
}) {
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ORG_MANAGER;
    const warehouseId = user?.warehouse_id || "";
    const canWrite = [ROLES.SUPER_ADMIN, ROLES.ORG_MANAGER, ROLES.WH_MANAGER].includes(user?.role);

    const [warehouseFilter, setWarehouseFilter] = useState("");
    const effectiveWarehouseId = isSuperAdmin ? warehouseFilter : warehouseId;

    const { data: warehousesData } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }
    );
    const warehouses = warehousesData?.warehouses || [];

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editExpense, setEditExpense] = useState(null);

    const { data, isLoading, isFetching, refetch } = useGetWarehouseExpensesQuery({
        search,
        category,
        from_date: fromDate,
        to_date: toDate,
        warehouse_id: effectiveWarehouseId,
        limit: 100,
    });

    const [cancelExpense] = useCancelWarehouseExpenseMutation();
    const expenses = data?.expenses || [];
    const summary = data?.meta?.summary || {};

    const handleCancel = async (expense) => {
        if (!window.confirm(`Cancel expense ${expense.expense_number}?`)) return;
        try {
            await cancelExpense(expense.expense_id).unwrap();
            refetch();
        } catch (err) {
            alert(err?.data?.message || "Failed to cancel expense");
        }
    };

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg">
                        <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                    </button>
                    {canWrite && (
                        <button
                            type="button"
                            onClick={() => { setEditExpense(null); setShowForm(true); }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
                        >
                            <Plus size={14} /> Add Expense
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase text-gray-500">Total Expenses</p>
                    <p className="text-3xl font-bold text-gray-800">{summary.count || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase text-gray-500">Total Amount</p>
                    <p className="text-3xl font-bold text-gray-800">{fmtCurrency(summary.total_amount)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 col-span-2">
                    <p className="text-xs uppercase text-gray-500">Warehouse</p>
                    <p className="text-lg font-semibold text-gray-800 mt-1">{expenses[0]?.warehouse?.warehouse_name || "Your warehouse"}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 text-gray-700">
                {isSuperAdmin && (
                    <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]">
                        <option value="">All Warehouses</option>
                        {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
                    </select>
                )}
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses…" className="flex-1 min-w-[180px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Categories</option>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Expense #", "Category", "Description", "Warehouse", "Amount", "Date", "Paid via", "Recorded by", "Actions"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(isLoading || isFetching) && (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
                        )}
                        {!isLoading && expenses.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No expenses recorded yet</td></tr>
                        )}
                        {expenses.map((e) => (
                            <tr key={e.expense_id} className="hover:bg-gray-50 text-gray-700">
                                <td className="px-4 py-3 font-mono text-xs">{e.expense_number}</td>
                                <td className="px-4 py-3">{getExpenseCategoryLabel(e.category)}</td>
                                <td className="px-4 py-3">{e.description}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{e.warehouse?.warehouse_name}</td>
                                <td className="px-4 py-3 font-medium">{fmtCurrency(e.amount)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(e.expense_date)}</td>
                                <td className="px-4 py-3 text-xs">{e.payment_method ? getPaymentMethodLabel(e.payment_method) : "—"}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{e.recorded_by?.name}</td>
                                <td className="px-4 py-3">
                                    {canWrite && (
                                        <div className="flex gap-1">
                                            <button type="button" title="Edit" onClick={() => { setEditExpense(e); setShowForm(true); }} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                                                <Edit2 size={14} />
                                            </button>
                                            <button type="button" title="Cancel" onClick={() => handleCancel(e)} className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-600">
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ExpenseFormModal
                open={showForm}
                onClose={() => { setShowForm(false); setEditExpense(null); }}
                onSaved={refetch}
                expense={editExpense}
                warehouseId={effectiveWarehouseId}
            />
        </div>
    );
}
