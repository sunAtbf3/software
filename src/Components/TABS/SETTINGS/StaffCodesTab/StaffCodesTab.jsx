
// TABS/SETTINGS/StaffCodesTab/StaffCodesTab.jsx
//
// Shop-scoped billing staff codes for shared terminal logins.

import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Pencil, Trash2, Plus, RefreshCw, BarChart3, Users, Receipt, ShieldCheck, AlertCircle, Building2, UserCheck, UserX } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useGetShopsQuery,
    useGetMyShopQuery,
    useGetShopStaffCodesQuery,
    useGetShopStaffBillingSummaryQuery,
    useDeleteShopStaffCodeMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import StaffCodeFormModal from "./StaffCodeFormModal";
import { ROLES, can } from "../../../roles";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";

export default function StaffCodesTab() {
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ORG_MANAGER;
    const isShopOwner = user?.role === ROLES.SHOP_OWNER;
    const canManageStaff = can("shop.staff.write");

    const [selectedShopId, setSelectedShopId] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingCode, setEditingCode] = useState(null);

    const { data: myShop } = useGetMyShopQuery(undefined, { skip: !isShopOwner });
    const { data: shopsData } = useGetShopsQuery(
        { page: 1, limit: 100, is_active: true },
        { skip: !isSuperAdmin }
    );

    const effectiveShopId = useMemo(() => {
        if (isShopOwner) return myShop?.shop_id || user?.shop_id || "";
        if (isSuperAdmin) return selectedShopId || shopsData?.shops?.[0]?.shop_id || "";
        return user?.shop_id || "";
    }, [isShopOwner, isSuperAdmin, myShop, user, selectedShopId, shopsData]);

    const today = new Date().toISOString().slice(0, 10);

    const {
        data: staffCodes = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetShopStaffCodesQuery(
        { shopId: effectiveShopId, active_only: false },
        { skip: !effectiveShopId }
    );

    const { data: summary, refetch: refetchSummary } = useGetShopStaffBillingSummaryQuery(
        { shopId: effectiveShopId, from_date: today, to_date: today },
        { skip: !effectiveShopId }
    );

    const [deleteCode] = useDeleteShopStaffCodeMutation();

    const activeCount = staffCodes.filter((c) => c.is_active).length;

    const openAdd = () => {
        setEditingCode(null);
        setShowForm(true);
    };

    const openEdit = (code) => {
        setEditingCode(code);
        setShowForm(true);
    };

    const handleDelete = async (code) => {
        if (!window.confirm(`Remove staff code "${code.code} — ${code.display_name}"?`)) return;
        try {
            const result = await deleteCode({
                shopId: effectiveShopId,
                staffCodeId: code.staff_code_id,
            }).unwrap();
            toast.success(
                result?.deactivated
                    ? "Code deactivated (used on past bills)"
                    : "Staff code removed"
            );
            refetch();
            refetchSummary();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to remove staff code"));
        }
    };

    const handleRefresh = () => {
        refetch();
        refetchSummary();
    };

    return (
        <div className="space-y-6 bg-transparent px-1 py-1">
            {/* Header / Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Billing Staff Codes</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Shared login + per-bill staff code selection at the billing counter
                    </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
                    >
                        <RefreshCw size={13} className={isFetching ? "animate-spin text-blue-500" : ""} /> Refresh
                    </button>
                    {canManageStaff && (
                    <button
                        type="button"
                        onClick={openAdd}
                        disabled={!effectiveShopId}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Plus size={14} /> Add Staff Code
                    </button>
                    )}
                </div>
            </div>

            {/* Scope Selection Selector (Super Admin Only) */}
            {isSuperAdmin && (
                <div className="bg-gray-50/60 rounded-xl border border-gray-200/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gray-200/60 rounded-lg text-gray-600">
                            <Building2 size={16} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Target Domain Shop Context</span>
                            <p className="text-[11px] text-gray-400">Isolate query metrics across alternative storefront modules</p>
                        </div>
                    </div>
                    <select
                        value={selectedShopId || shopsData?.shops?.[0]?.shop_id || ""}
                        onChange={(e) => setSelectedShopId(e.target.value)}
                        className="w-full sm:max-w-xs bg-white border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 shadow-sm outline-none transition-all"
                    >
                        {(shopsData?.shops || []).map((shop) => (
                            <option key={shop.shop_id} value={shop.shop_id}>
                                {shop.shop_name} — {shop.shop_code}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Overview Analytical Dashboard Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 relative overflow-hidden shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Active Codes</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{activeCount}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">for billing dropdown</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl border border-blue-100/50">
                        <Users size={20} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 relative overflow-hidden shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Today's Bills</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{summary?.bill_count ?? 0}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">with staff attribution</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl border border-emerald-100/50">
                        <Receipt size={20} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 relative overflow-hidden shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Staff on Duty Today</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">{summary?.by_staff?.length ?? 0}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">unique codes billed</p>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-500 rounded-xl border border-purple-100/50">
                        <ShieldCheck size={20} />
                    </div>
                </div>
            </div>

            {/* Dynamic Real-Time Shift Activity Feed Table */}
            {summary?.by_staff?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                        <BarChart3 size={15} className="text-gray-500" />
                        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Today — Bills by Staff</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] lg:min-w-0 text-sm text-left">
                            <thead className="bg-gray-50/40 border-b border-gray-100">
                                <tr>
                                    {["Code", "Name", "Bills", "Total", "Collected"].map((h) => (
                                        <th key={h} className="px-5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {summary.by_staff.map((row) => (
                                    <tr key={row.staff_code_value} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-5 py-3 font-mono font-semibold text-blue-600">{row.staff_code_value}</td>
                                        <td className="px-5 py-3 font-medium text-gray-800">{row.staff_name_snapshot}</td>
                                        <td className="px-5 py-3 text-gray-600 font-medium">{row.bill_count}</td>
                                        <td className="px-5 py-3 font-semibold text-gray-900">₹{Number(row.total_amount).toLocaleString()}</td>
                                        <td className="px-5 py-3 font-semibold text-emerald-600">₹{Number(row.total_collected).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Core Master Staff Registries Records Matrix Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Codes</span>
                    <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-0.5 rounded-lg shadow-sm">
                        {staffCodes.length} records
                    </span>
                </div>

                {/* Local Dynamic Sync Loader Indicators */}
                {(isLoading || isFetching) && (
                    <div className="py-16 text-center text-xs font-medium text-gray-400 flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={18} className="animate-spin text-blue-500" />
                        Synchronizing master workforce identifiers...
                    </div>
                )}

                {/* Zero State Fallback Module Block */}
                {!isLoading && staffCodes.length === 0 && (
                    <div className="py-16 px-6 text-center max-w-sm mx-auto flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 border border-gray-100 mb-1">
                            <Users size={22} />
                        </div>
                        <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">No Active Worker Codes</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            No staff codes yet. Add SC001, SC002… for billing staff to select at checkout.
                        </p>
                    </div>
                )}

                {/* Data Grid Vector Block */}
                {!isLoading && staffCodes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] lg:min-w-0 text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/40 border-b border-gray-100">
                                    {["Code", "Name", "Phone", "Status", "Actions"].map((h) => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                                {staffCodes.map((row) => (
                                    <tr key={row.staff_code_id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-3.5 font-mono font-bold text-gray-900 tracking-wide">{row.code}</td>
                                        <td className="px-5 py-3.5 font-medium text-gray-800">{row.display_name}</td>
                                        <td className="px-5 py-3.5 font-mono text-gray-500">{row.phone || "—"}</td>
                                        <td className="px-5 py-3.5">
                                            {row.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm">
                                                    <UserCheck size={10} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 border border-gray-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                                    <UserX size={10} /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {canManageStaff ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(row)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Modify Record Configurations"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(row)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
                                                    title="Revoke Node Parameters"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            ) : (
                                                <span className="text-[11px] text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* System Explanatory Documentation Alerts Card Block Footer */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                    Staff do not need separate logins. They use the shared billing account and select their code on each bill.
                    When a person leaves, edit the code's name — old bills keep the original name snapshot.
                </p>
            </div>

            {/* Form Modal Workflow Management Injection Frame */}
            {showForm && canManageStaff && (
                <StaffCodeFormModal
                    shopId={effectiveShopId}
                    staffCode={editingCode}
                    onClose={() => {
                        setShowForm(false);
                        setEditingCode(null);
                    }}
                    onSuccess={() => {
                        refetch();
                        refetchSummary();
                    }}
                />
            )}
        </div>
    );
}
// down code is working uper code is just update the ui

// // TABS/SETTINGS/StaffCodesTab/StaffCodesTab.jsx
// //
// // Shop-scoped billing staff codes for shared terminal logins.

// import React, { useMemo, useState } from "react";
// import { useSelector } from "react-redux";
// import { Pencil, Trash2, Plus, RefreshCw, BarChart3 } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//     useGetShopsQuery,
//     useGetMyShopQuery,
//     useGetShopStaffCodesQuery,
//     useGetShopStaffBillingSummaryQuery,
//     useDeleteShopStaffCodeMutation,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
// import StaffCodeFormModal from "./StaffCodeFormModal";

// export default function StaffCodesTab() {
//     const { user } = useSelector((state) => state.auth);
//     const isSuperAdmin = user?.role === "SUPER_ADMIN";
//     const isShopOwner = user?.role === "SHOP_OWNER";

//     const [selectedShopId, setSelectedShopId] = useState("");
//     const [showForm, setShowForm] = useState(false);
//     const [editingCode, setEditingCode] = useState(null);

//     const { data: myShop } = useGetMyShopQuery(undefined, { skip: !isShopOwner });
//     const { data: shopsData } = useGetShopsQuery(
//         { page: 1, limit: 100, is_active: true },
//         { skip: !isSuperAdmin }
//     );

//     const effectiveShopId = useMemo(() => {
//         if (isShopOwner) return myShop?.shop_id || user?.shop_id || "";
//         if (isSuperAdmin) return selectedShopId || shopsData?.shops?.[0]?.shop_id || "";
//         return user?.shop_id || "";
//     }, [isShopOwner, isSuperAdmin, myShop, user, selectedShopId, shopsData]);

//     const today = new Date().toISOString().slice(0, 10);

//     const {
//         data: staffCodes = [],
//         isLoading,
//         isFetching,
//         refetch,
//     } = useGetShopStaffCodesQuery(
//         { shopId: effectiveShopId, active_only: false },
//         { skip: !effectiveShopId }
//     );

//     const { data: summary, refetch: refetchSummary } = useGetShopStaffBillingSummaryQuery(
//         { shopId: effectiveShopId, from_date: today, to_date: today },
//         { skip: !effectiveShopId }
//     );

//     const [deleteCode] = useDeleteShopStaffCodeMutation();

//     const activeCount = staffCodes.filter((c) => c.is_active).length;

//     const openAdd = () => {
//         setEditingCode(null);
//         setShowForm(true);
//     };

//     const openEdit = (code) => {
//         setEditingCode(code);
//         setShowForm(true);
//     };

//     const handleDelete = async (code) => {
//         if (!window.confirm(`Remove staff code "${code.code} — ${code.display_name}"?`)) return;
//         try {
//             const result = await deleteCode({
//                 shopId: effectiveShopId,
//                 staffCodeId: code.staff_code_id,
//             }).unwrap();
//             toast.success(
//                 result?.deactivated
//                     ? "Code deactivated (used on past bills)"
//                     : "Staff code removed"
//             );
//             refetch();
//             refetchSummary();
//         } catch (err) {
//             toast.error(err?.data?.message || "Failed to remove staff code");
//         }
//     };

//     const handleRefresh = () => {
//         refetch();
//         refetchSummary();
//     };

//     return (
//         <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
//                 <div>
//                     <h2 className="text-xl font-semibold text-gray-900">Billing Staff Codes</h2>
//                     <p className="text-sm text-gray-400 mt-0.5">
//                         Shared login + per-bill staff code selection at the billing counter
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     <button
//                         type="button"
//                         onClick={handleRefresh}
//                         className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50"
//                     >
//                         <RefreshCw size={14} /> Refresh
//                     </button>
//                     <button
//                         type="button"
//                         onClick={openAdd}
//                         disabled={!effectiveShopId}
//                         className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
//                     >
//                         <Plus size={14} /> Add Staff Code
//                     </button>
//                 </div>
//             </div>

//             {isSuperAdmin && (
//                 <div className="bg-white rounded-xl border border-gray-200 p-4">
//                     <label className="block text-xs font-medium text-gray-500 mb-1">Select Shop</label>
//                     <select
//                         value={selectedShopId || shopsData?.shops?.[0]?.shop_id || ""}
//                         onChange={(e) => setSelectedShopId(e.target.value)}
//                         className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
//                     >
//                         {(shopsData?.shops || []).map((shop) => (
//                             <option key={shop.shop_id} value={shop.shop_id}>
//                                 {shop.shop_name} — {shop.shop_code}
//                             </option>
//                         ))}
//                     </select>
//                 </div>
//             )}

//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                 <div className="bg-white rounded-xl border border-blue-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-blue-400">Active Codes</p>
//                     <p className="text-3xl font-bold text-blue-700">{activeCount}</p>
//                     <p className="text-xs text-gray-400 mt-1">for billing dropdown</p>
//                 </div>
//                 <div className="bg-white rounded-xl border border-green-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-green-500">Today&apos;s Bills</p>
//                     <p className="text-3xl font-bold text-green-600">{summary?.bill_count ?? 0}</p>
//                     <p className="text-xs text-gray-400 mt-1">with staff attribution</p>
//                 </div>
//                 <div className="bg-white rounded-xl border border-purple-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-purple-400">Staff on Duty Today</p>
//                     <p className="text-3xl font-bold text-purple-600">{summary?.by_staff?.length ?? 0}</p>
//                     <p className="text-xs text-gray-400 mt-1">unique codes billed</p>
//                 </div>
//             </div>

//             {summary?.by_staff?.length > 0 && (
//                 <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//                     <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
//                         <BarChart3 size={16} className="text-gray-500" />
//                         <span className="text-xs font-semibold text-gray-500 uppercase">Today — Bills by Staff</span>
//                     </div>
//                     <table className="w-full text-sm">
//                         <thead className="bg-gray-50 border-b">
//                             <tr>
//                                 {["Code", "Name", "Bills", "Total", "Collected"].map((h) => (
//                                     <th key={h} className="px-4 py-2 text-xs font-semibold text-gray-400 text-left uppercase">
//                                         {h}
//                                     </th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-gray-50">
//                             {summary.by_staff.map((row) => (
//                                 <tr key={row.staff_code_value}>
//                                     <td className="px-4 py-2 font-mono text-gray-700">{row.staff_code_value}</td>
//                                     <td className="px-4 py-2 text-gray-800">{row.staff_name_snapshot}</td>
//                                     <td className="px-4 py-2">{row.bill_count}</td>
//                                     <td className="px-4 py-2">₹{Number(row.total_amount).toLocaleString()}</td>
//                                     <td className="px-4 py-2">₹{Number(row.total_collected).toLocaleString()}</td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             )}

//             <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
//                 <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
//                     <span className="text-xs font-semibold text-gray-500 uppercase">Staff Codes</span>
//                     <span className="text-xs text-gray-400 bg-gray-50 border px-2 py-0.5 rounded-full">
//                         {staffCodes.length} records
//                     </span>
//                 </div>

//                 {(isLoading || isFetching) && (
//                     <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
//                 )}

//                 {!isLoading && staffCodes.length === 0 && (
//                     <div className="py-12 text-center text-sm text-gray-400">
//                         No staff codes yet. Add SC001, SC002… for billing staff to select at checkout.
//                     </div>
//                 )}

//                 {!isLoading && staffCodes.length > 0 && (
//                     <table className="w-full text-sm">
//                         <thead className="bg-gray-50 border-b">
//                             <tr>
//                                 {["Code", "Name", "Phone", "Status", "Actions"].map((h) => (
//                                     <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 text-left uppercase">
//                                         {h}
//                                     </th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-gray-50">
//                             {staffCodes.map((row) => (
//                                 <tr key={row.staff_code_id} className="hover:bg-gray-50">
//                                     <td className="px-4 py-3 font-mono font-medium text-gray-800">{row.code}</td>
//                                     <td className="px-4 py-3 text-gray-700">{row.display_name}</td>
//                                     <td className="px-4 py-3 text-gray-500">{row.phone || "—"}</td>
//                                     <td className="px-4 py-3">
//                                         {row.is_active ? (
//                                             <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
//                                                 Active
//                                             </span>
//                                         ) : (
//                                             <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
//                                                 Inactive
//                                             </span>
//                                         )}
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <div className="flex gap-1">
//                                             <button
//                                                 type="button"
//                                                 onClick={() => openEdit(row)}
//                                                 className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md"
//                                             >
//                                                 <Pencil size={14} />
//                                             </button>
//                                             <button
//                                                 type="button"
//                                                 onClick={() => handleDelete(row)}
//                                                 className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md"
//                                             >
//                                                 <Trash2 size={14} />
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 )}
//             </div>

//             <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
//                 <p className="text-xs text-amber-800">
//                     Staff do not need separate logins. They use the shared billing account and select their code on each bill.
//                     When a person leaves, edit the code&apos;s name — old bills keep the original name snapshot.
//                 </p>
//             </div>

//             {showForm && (
//                 <StaffCodeFormModal
//                     shopId={effectiveShopId}
//                     staffCode={editingCode}
//                     onClose={() => {
//                         setShowForm(false);
//                         setEditingCode(null);
//                     }}
//                     onSuccess={() => {
//                         refetch();
//                         refetchSummary();
//                     }}
//                 />
//             )}
//         </div>
//     );
// }
