import React, { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { Plus, RefreshCw, Edit2, XCircle, CloudOff } from "lucide-react";
import {
    useGetShopExpensesQuery,
    useCancelShopExpenseMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseFinanceApi";
import ShopExpenseFormModal from "./ShopExpenseFormModal";
import {
    fmtCurrency,
    fmtDate,
    SHOP_EXPENSE_CATEGORIES,
    getShopExpenseCategoryLabel,
    getPaymentMethodLabel,
} from "../purchaseFinanceUtils";
import { useGetShopsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { ROLES } from "../../../roles";
import { outboxRepository } from "../../../../offline/db/repositories/outboxRepository";
import { OUTBOX_STATUS, OFFLINE_EVENTS } from "../../../../offline/constants";
import { useOfflineEvent } from "../../../../offline/hooks/useOfflineStatus";

const DEFAULT_TITLE = "Shop Expenses";
const DEFAULT_SUBTITLE =
    "Petty cash & shop operating costs — repairs, utilities, stationery, transport (not customer sales)";

export default function ShopExpensesTab({
    title = DEFAULT_TITLE,
    subtitle = DEFAULT_SUBTITLE,
}) {
    const { user } = useSelector((state) => state.auth);
    const isOnline = useSelector((state) => state.offline.isOnline);
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ORG_MANAGER;
    const shopId = user?.shop_id || "";
    const canWrite = [ROLES.SUPER_ADMIN, ROLES.ORG_MANAGER, ROLES.SHOP_OWNER].includes(user?.role);

    const [shopFilter, setShopFilter] = useState("");
    const effectiveShopId = isSuperAdmin ? shopFilter : shopId;

    const { data: shopsData } = useGetShopsQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }
    );
    const shops = shopsData?.shops || [];

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editExpense, setEditExpense] = useState(null);
    const [pendingOfflineExpenses, setPendingOfflineExpenses] = useState([]);

    const loadPendingExpenses = useCallback(async () => {
        if (!effectiveShopId || isOnline) {
            setPendingOfflineExpenses([]);
            return;
        }
        const rows = await outboxRepository.listByShop(effectiveShopId);
        setPendingOfflineExpenses(
            rows.filter(
                (r) => r.entity_type === "shop_expense" && r.status !== OUTBOX_STATUS.SYNCED
            )
        );
    }, [effectiveShopId, isOnline]);

    useEffect(() => {
        loadPendingExpenses();
    }, [loadPendingExpenses]);

    useOfflineEvent(OFFLINE_EVENTS.SYNC_COMPLETED, loadPendingExpenses);

    const { data, isLoading, isFetching, error, refetch } = useGetShopExpensesQuery({
        search,
        category,
        from_date: fromDate,
        to_date: toDate,
        shop_id: effectiveShopId,
        limit: 100,
    }, { skip: !effectiveShopId || !isOnline });

    const [cancelExpense] = useCancelShopExpenseMutation();
    const expenses = data?.expenses || [];
    const shopLabel = expenses[0]?.shop?.shop_name
        || shops.find((s) => s.shop_id === effectiveShopId)?.shop_name
        || (isSuperAdmin && !effectiveShopId ? "All shops" : "Your shop");
    const offlineExpenseRows = pendingOfflineExpenses.map((row) => ({
        expense_id: row.client_id,
        expense_number: row.payload?.offline_expense_number || row.client_id.slice(0, 8),
        category: row.payload?.category,
        description: row.payload?.description,
        amount: row.payload?.amount,
        expense_date: row.payload?.expense_date,
        payment_method: row.payload?.payment_method,
        is_offline_pending: true,
        outbox_status: row.status,
        shop: { shop_name: shopLabel },
    }));
    const displayExpenses = isOnline ? expenses : offlineExpenseRows;
    const summary = data?.meta?.summary || {};

    const handleRefresh = () => {
        if (isOnline) refetch();
        else loadPendingExpenses();
    };

    const handleCancel = async (expense) => {
        if (!window.confirm(`Cancel expense ${expense.expense_number}?`)) return;
        try {
            await cancelExpense(expense.expense_id).unwrap();
            refetch();
        } catch (err) {
            alert(err?.data?.message || "Failed to cancel expense");
        }
    };

    const shopLabelForStats = shopLabel;

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg"
                    >
                        <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                    </button>
                    {canWrite && (
                        <button
                            type="button"
                            onClick={() => { setEditExpense(null); setShowForm(true); }}
                            disabled={isSuperAdmin && !effectiveShopId}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                        >
                            <Plus size={14} /> Add Expense
                        </button>
                    )}
                </div>
            </div>

            {!isOnline && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <CloudOff size={18} className="text-slate-500 shrink-0" />
                    <p className="text-sm text-slate-700">
                        Offline mode — new expenses save locally and sync when online. Edit and cancel require internet.
                    </p>
                </div>
            )}

            {error && isOnline && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
                    {error?.data?.message || "Failed to load shop expenses"}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase text-gray-500">Total Entries</p>
                    <p className="text-3xl font-bold text-gray-800">{isOnline ? (summary.count || 0) : displayExpenses.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase text-gray-500">Total Amount</p>
                    <p className="text-3xl font-bold text-gray-800">
                        {isOnline
                            ? fmtCurrency(summary.total_amount)
                            : fmtCurrency(displayExpenses.reduce((s, e) => s + Number(e.amount || 0), 0))}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 col-span-2">
                    <p className="text-xs uppercase text-gray-500">Shop</p>
                    <p className="text-lg font-semibold text-gray-800 mt-1">{shopLabelForStats}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 text-gray-700">
                {isSuperAdmin && (
                    <select
                        value={shopFilter}
                        onChange={(e) => setShopFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]"
                    >
                        <option value="">All Shops</option>
                        {shops.map((s) => (
                            <option key={s.shop_id} value={s.shop_id}>{s.shop_name}</option>
                        ))}
                    </select>
                )}
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search expenses…"
                    className="flex-1 min-w-[180px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Categories</option>
                    {SHOP_EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            {isSuperAdmin && !effectiveShopId && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    Select a shop to add a new expense. Listing shows all shops until filtered.
                </p>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Expense #", "Category", "Description", "Shop", "Amount", "Date", "Paid via", "Recorded by", "Actions"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(isOnline && (isLoading || isFetching)) && (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
                        )}
                        {!isOnline && displayExpenses.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No pending offline expenses</td></tr>
                        )}
                        {isOnline && !isLoading && !isFetching && displayExpenses.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No shop expenses recorded yet</td></tr>
                        )}
                        {displayExpenses.map((e) => (
                            <tr key={e.expense_id} className="hover:bg-gray-50 text-gray-700">
                                <td className="px-4 py-3 font-mono text-xs">
                                    {e.expense_number}
                                    {e.is_offline_pending && (
                                        <span className="ml-1 text-[10px] uppercase text-amber-700 bg-amber-50 px-1 rounded">offline</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">{getShopExpenseCategoryLabel(e.category)}</td>
                                <td className="px-4 py-3">{e.description}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{e.shop?.shop_name}</td>
                                <td className="px-4 py-3 font-medium">{fmtCurrency(e.amount)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(e.expense_date)}</td>
                                <td className="px-4 py-3 text-xs">{e.payment_method ? getPaymentMethodLabel(e.payment_method) : "—"}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{e.recorded_by?.name}</td>
                                <td className="px-4 py-3">
                                    {canWrite && isOnline && !e.is_offline_pending && (
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                title="Edit"
                                                onClick={() => { setEditExpense(e); setShowForm(true); }}
                                                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                title="Cancel"
                                                onClick={() => handleCancel(e)}
                                                className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-600"
                                            >
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

            <ShopExpenseFormModal
                open={showForm}
                onClose={() => { setShowForm(false); setEditExpense(null); }}
                onSaved={() => {
                    if (isOnline) refetch();
                    else loadPendingExpenses();
                }}
                expense={editExpense}
                shopId={editExpense?.shop_id || effectiveShopId}
            />
        </div>
    );
}
