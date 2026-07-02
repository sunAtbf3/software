// TABS/SETTINGS/BankDetailsTab/BankDetailsTab.jsx
//
// Shop-scoped bank accounts for UPI billing. Each shop manages its own accounts.

import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Pencil, Trash2, Plus, RefreshCw, Landmark, QrCode, CheckCircle2, AlertCircle, Building } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useGetShopsQuery,
    useGetMyShopQuery,
    useGetShopBankAccountsQuery,
    useDeleteShopBankAccountMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import BankAccountFormModal from "./BankAccountFormModal";
import { ROLES, can } from "../../../roles";

export default function BankDetailsTab() {
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
    const isShopOwner = user?.role === ROLES.SHOP_OWNER;
    const isShopManager = user?.role === ROLES.SHOP_MANAGER;
    const canManageBank = can("shop.bank.write");
    const isReadOnlyBank = isShopManager || (!canManageBank && user?.role === ROLES.BILLING_STAFF);

    const [selectedShopId, setSelectedShopId] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);

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

    const {
        data: accounts = [],
        isLoading,
        isFetching,
        refetch,
    } = useGetShopBankAccountsQuery(
        { shopId: effectiveShopId, active_only: true },
        { skip: !effectiveShopId }
    );

    const [deleteAccount] = useDeleteShopBankAccountMutation();

    const defaultAccount = accounts.find((a) => a.is_default);
    const upiAccounts = accounts.filter((a) => a.upi_id);

    const managerColumns = ["Institution", "Branch", "Beneficiary Holder", "Default", "Status"];
    const fullColumns = ["Institution", "Beneficiary Holder", "Account Sequence", "Routing (IFSC)", "UPI Interface String", "Default", "Actions"];
    const tableColumns = isReadOnlyBank ? managerColumns : fullColumns;

    const openAdd = () => {
        setEditingAccount(null);
        setShowForm(true);
    };

    const openEdit = (account) => {
        setEditingAccount(account);
        setShowForm(true);
    };

    const handleDelete = async (account) => {
        if (!window.confirm(`Remove bank account "${account.bank_name}" (${account.account_number_masked})?`)) {
            return;
        }
        try {
            const result = await deleteAccount({
                shopId: effectiveShopId,
                bankAccountId: account.bank_account_id,
            }).unwrap();
            toast.success(
                result?.deactivated
                    ? "Account deactivated (used on past bills)"
                    : "Bank account removed"
            );
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to remove account");
        }
    };

    return (
        <div className="space-y-6 bg-transparent px-1 py-1">
            {/* Header Controls Block */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Bank Accounts</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {isReadOnlyBank
                            ? "View linked bank names and account holder details (payment credentials are hidden)."
                            : "Manage UPI-enabled settlement accounts for this shop's billing."}
                    </p>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
                    >
                        <RefreshCw size={13} className={isFetching ? "animate-spin text-blue-500" : ""} />
                        Refresh Panel
                    </button>
                    {canManageBank && (
                    <button
                        type="button"
                        onClick={openAdd}
                        disabled={!effectiveShopId}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm shadow-blue-500/10 hover:shadow-blue-500/20"
                    >
                        <Plus size={14} /> Add Bank Account
                    </button>
                    )}
                </div>
            </div>

            {/* Admin Filter Block */}
            {isSuperAdmin && (
                <div className="bg-gray-50/60 rounded-xl border border-gray-200/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gray-200/60 rounded-lg text-gray-600">
                            <Building size={16} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Administrative Domain Target</span>
                            <p className="text-[11px] text-gray-400">Isolate query parameters to alternative storefront dimensions</p>
                        </div>
                    </div>
                    <select
                        value={selectedShopId || shopsData?.shops?.[0]?.shop_id || ""}
                        onChange={(e) => setSelectedShopId(e.target.value)}
                        className="w-full sm:max-w-xs bg-white border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 shadow-sm outline-none transition-all"
                    >
                        {(shopsData?.shops || []).map((shop) => (
                            <option key={shop.shop_id} value={shop.shop_id}>
                                {shop.shop_name} ({shop.shop_code})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Metrics Dashboard Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 relative overflow-hidden shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Total Accounts</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{accounts.length}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Assigned to shop profile</p>
                    </div>
                    <div className="p-3 bg-gray-50 text-gray-400 rounded-xl border border-gray-100">
                        <Landmark size={20} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 relative overflow-hidden shadow-sm flex items-center justify-between">
                    <div className="max-w-[70%]">
                        <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Primary Gateway</p>
                        <p className="text-sm font-bold text-gray-800 mt-2 truncate">
                            {defaultAccount?.bank_name || "—"}
                        </p>
                        {!isReadOnlyBank && (
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                            {defaultAccount?.upi_id || "Unset Flag"}
                        </p>
                        )}
                        {isReadOnlyBank && defaultAccount?.branch_name && (
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {defaultAccount.branch_name}
                        </p>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl border ${defaultAccount ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-amber-50 text-amber-500 border-amber-100"}`}>
                        <CheckCircle2 size={20} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 relative overflow-hidden shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-gray-400">
                            {isReadOnlyBank ? "Active Accounts" : "UPI Ecosystem"}
                        </p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                            {isReadOnlyBank ? accounts.length : upiAccounts.length}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {isReadOnlyBank ? "Configured for this shop" : "Terminal dynamically active"}
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl border border-blue-100/50">
                        <QrCode size={20} />
                    </div>
                </div>
            </div>

            {/* Main Data Layout Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Configured Interfaces</span>
                    <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-0.5 rounded-lg shadow-sm">
                        {accounts.length} Nodes Matrixed
                    </span>
                </div>

                {/* Loader State */}
                {(isLoading || isFetching) && (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 text-xs font-medium gap-2">
                        <RefreshCw size={18} className="animate-spin text-blue-500" />
                        Synchronizing active registries...
                    </div>
                )}

                {/* Empty Boundary Unselected Shop */}
                {!isLoading && !effectiveShopId && (
                    <div className="py-16 text-center text-xs font-medium text-gray-400 flex flex-col items-center gap-1.5">
                        <AlertCircle size={16} className="text-amber-400" />
                        A targeted operational domain context must be specified.
                    </div>
                )}

                {/* Empty Boundary Records Zero */}
                {!isLoading && effectiveShopId && accounts.length === 0 && (
                    <div className="py-16 px-6 text-center max-w-md mx-auto flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 border border-gray-100 mb-1">
                            <Landmark size={22} />
                        </div>
                        <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">No Linked Payment Targets</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Initialize a bank account endpoint with attached UPI credentials to instantiate real-time point-of-sale dynamic QR generation frameworks.
                        </p>
                    </div>
                )}

                {/* Populated Data Grid */}
                {!isLoading && accounts.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] lg:min-w-0 text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/70 border-b border-gray-100">
                                    {tableColumns.map((h) => (
                                        <th
                                            key={h}
                                            className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                                {accounts.map((row) => (
                                    <tr key={row.bank_account_id} className="hover:bg-gray-50/50 transition-colors">
                                        {isReadOnlyBank ? (
                                            <>
                                                <td className="px-5 py-3.5 font-semibold text-gray-900">{row.bank_name}</td>
                                                <td className="px-5 py-3.5 text-gray-600">{row.branch_name || "—"}</td>
                                                <td className="px-5 py-3.5 text-gray-600 font-medium">{row.account_holder_name}</td>
                                                <td className="px-5 py-3.5">
                                                    {row.is_default ? (
                                                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm">
                                                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span> Primary
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-medium text-gray-400">Secondary</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`text-[11px] font-medium ${row.is_active ? "text-emerald-600" : "text-gray-400"}`}>
                                                        {row.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                        <td className="px-5 py-3.5 font-semibold text-gray-900">{row.bank_name}</td>
                                        <td className="px-5 py-3.5 text-gray-600 font-medium">{row.account_holder_name}</td>
                                        <td className="px-5 py-3.5 font-mono text-gray-500 tracking-wide">
                                            {row.account_number_masked}
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-gray-500 uppercase">{row.ifsc_code}</td>
                                        <td className="px-5 py-3.5 font-mono text-gray-600">
                                            {row.upi_id ? (
                                                <span className="text-blue-600 bg-blue-50/40 border border-blue-100/60 px-2 py-0.5 rounded-md font-medium text-[11px]">{row.upi_id}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">None Provided</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {row.is_default ? (
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span> Primary
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-medium text-gray-400">Secondary</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(row)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Modify Mapping Parameters"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(row)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
                                                    title="Decommission Endpoint"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Information Alert System Footer Block */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
                <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    Financial infrastructure layers operate under rigorous shop-level sandboxing protocols. POS staff operators dynamically load default configurations during checkout execution workflows to auto-render isolated point-of-sale parameters. Entry vectors are explicitly forbidden from transitioning cross-organizational boundaries.
                </p>
            </div>

            {/* Modal Injection Control Element */}
            {showForm && canManageBank && (
                <BankAccountFormModal
                    shopId={effectiveShopId}
                    account={editingAccount}
                    onClose={() => {
                        setShowForm(false);
                        setEditingAccount(null);
                    }}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
// down code is working but upper code have just update the ui
// // TABS/SETTINGS/BankDetailsTab/BankDetailsTab.jsx
// //
// // Shop-scoped bank accounts for UPI billing. Each shop manages its own accounts.

// import React, { useMemo, useState } from "react";
// import { useSelector } from "react-redux";
// import { Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//     useGetShopsQuery,
//     useGetMyShopQuery,
//     useGetShopBankAccountsQuery,
//     useDeleteShopBankAccountMutation,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
// import BankAccountFormModal from "./BankAccountFormModal";

// export default function BankDetailsTab() {
//     const { user } = useSelector((state) => state.auth);
//     const isSuperAdmin = user?.role === "SUPER_ADMIN";
//     const isShopOwner = user?.role === "SHOP_OWNER";

//     const [selectedShopId, setSelectedShopId] = useState("");
//     const [showForm, setShowForm] = useState(false);
//     const [editingAccount, setEditingAccount] = useState(null);

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

//     const {
//         data: accounts = [],
//         isLoading,
//         isFetching,
//         refetch,
//     } = useGetShopBankAccountsQuery(
//         { shopId: effectiveShopId, active_only: true },
//         { skip: !effectiveShopId }
//     );

//     const [deleteAccount] = useDeleteShopBankAccountMutation();

//     const defaultAccount = accounts.find((a) => a.is_default);
//     const upiAccounts = accounts.filter((a) => a.upi_id);

//     const openAdd = () => {
//         setEditingAccount(null);
//         setShowForm(true);
//     };

//     const openEdit = (account) => {
//         setEditingAccount(account);
//         setShowForm(true);
//     };

//     const handleDelete = async (account) => {
//         if (!window.confirm(`Remove bank account "${account.bank_name}" (${account.account_number_masked})?`)) {
//             return;
//         }
//         try {
//             const result = await deleteAccount({
//                 shopId: effectiveShopId,
//                 bankAccountId: account.bank_account_id,
//             }).unwrap();
//             toast.success(
//                 result?.deactivated
//                     ? "Account deactivated (used on past bills)"
//                     : "Bank account removed"
//             );
//             refetch();
//         } catch (err) {
//             toast.error(err?.data?.message || "Failed to remove account");
//         }
//     };

//     return (
//         <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
//                 <div>
//                     <h2 className="text-xl font-semibold text-gray-900">Bank Accounts</h2>
//                     <p className="text-sm text-gray-400 mt-0.5">
//                         Manage UPI-enabled bank accounts for this shop&apos;s billing counter
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     <button
//                         type="button"
//                         onClick={() => refetch()}
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
//                         <Plus size={14} /> Add Bank Account
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
//                     <p className="text-xs uppercase tracking-wide font-medium text-blue-400">Total Accounts</p>
//                     <p className="text-3xl font-bold text-blue-700">{accounts.length}</p>
//                     <p className="text-xs text-gray-400 mt-1">active for this shop</p>
//                 </div>
//                 <div className="bg-white rounded-xl border border-green-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-green-500">Default UPI Account</p>
//                     <p className="text-lg font-bold text-green-600 truncate">
//                         {defaultAccount?.bank_name || "—"}
//                     </p>
//                     <p className="text-xs text-gray-400 mt-1 font-mono truncate">
//                         {defaultAccount?.upi_id || "Not configured"}
//                     </p>
//                 </div>
//                 <div className="bg-white rounded-xl border border-purple-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-purple-400">UPI Ready</p>
//                     <p className="text-3xl font-bold text-purple-600">{upiAccounts.length}</p>
//                     <p className="text-xs text-gray-400 mt-1">accounts with UPI ID</p>
//                 </div>
//             </div>

//             <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
//                 <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
//                     <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Accounts</span>
//                     <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
//                         {accounts.length} records
//                     </span>
//                 </div>

//                 {(isLoading || isFetching) && (
//                     <div className="py-12 text-center text-sm text-gray-400">Loading accounts…</div>
//                 )}

//                 {!isLoading && !effectiveShopId && (
//                     <div className="py-12 text-center text-sm text-gray-400">No shop selected</div>
//                 )}

//                 {!isLoading && effectiveShopId && accounts.length === 0 && (
//                     <div className="py-12 text-center text-sm text-gray-400">
//                         No bank accounts yet. Add one with a UPI ID to accept UPI payments at billing.
//                     </div>
//                 )}

//                 {!isLoading && accounts.length > 0 && (
//                     <table className="w-full text-sm">
//                         <thead className="bg-gray-50 border-b border-gray-100">
//                             <tr>
//                                 {["Bank", "Holder", "Account", "IFSC", "UPI ID", "Default", "Actions"].map((h) => (
//                                     <th
//                                         key={h}
//                                         className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left"
//                                     >
//                                         {h}
//                                     </th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-gray-50">
//                             {accounts.map((row) => (
//                                 <tr key={row.bank_account_id} className="hover:bg-gray-50">
//                                     <td className="px-4 py-3 font-medium text-gray-800">{row.bank_name}</td>
//                                     <td className="px-4 py-3 text-gray-700">{row.account_holder_name}</td>
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-500">
//                                         {row.account_number_masked}
//                                     </td>
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.ifsc_code}</td>
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.upi_id || "—"}</td>
//                                     <td className="px-4 py-3">
//                                         {row.is_default ? (
//                                             <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-xs">
//                                                 Yes
//                                             </span>
//                                         ) : (
//                                             <span className="text-xs text-gray-400">No</span>
//                                         )}
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <div className="flex items-center gap-1">
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

//             <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
//                 <p className="text-xs text-blue-800">
//                     Each shop has its own bank accounts. At billing, staff selects UPI and picks an account — a QR code is generated with the bill amount. Accounts are never shared across shops.
//                 </p>
//             </div>

//             {showForm && (
//                 <BankAccountFormModal
//                     shopId={effectiveShopId}
//                     account={editingAccount}
//                     onClose={() => {
//                         setShowForm(false);
//                         setEditingAccount(null);
//                     }}
//                     onSuccess={() => refetch()}
//                 />
//             )}
//         </div>
//     );
// }
