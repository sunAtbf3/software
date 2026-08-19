// TABS/SETTINGS/UsersTab.jsx
//
// Full rewrite — real API only, zero localStorage, zero fake data.
// Table view: name, phone, role badge, assigned (warehouse/shop), status, created, actions.
// Actions: Edit (opens UserEditForm which also handles status + reset password).

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { X } from "lucide-react";
import { useGetUsersQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/User_Api/userApi";
import {
    openAddForm,
    closeAddForm,
    openEditForm,
    closeEditForm,
    updateFormData,
    setFormErrors,
    clearFormErrors,
    setSearch,
    setRoleFilter,
    setActiveFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/User_Api/userSlice";
import UserAddForm from "./UserShared/UserAddForm";
import UserEditForm from "./UserShared/UserEditForm";
import { USER_ROLES } from "./UserShared/UserFormBody";
import {
    canAdminMutateUser,
    displayUserRoleLabel,
} from "../../../roles";

// ── Role badge helper ──────────────────────────────────────────────────────
const ROLE_BADGE_CLASSES = {
    SUPER_ADMIN: "bg-purple-50 text-purple-700 border border-purple-200",
    ORG_MANAGER: "bg-violet-50 text-violet-700 border border-violet-200",
    WH_MANAGER: "bg-blue-50 text-blue-700 border border-blue-200",
    SHOP_OWNER: "bg-green-50 text-green-700 border border-green-200",
    SHOP_MANAGER: "bg-teal-50 text-teal-700 border border-teal-200",
};
const ROLE_BADGE_DEFAULT = "bg-gray-100 text-gray-600 border border-gray-200";

const getRoleBadge = (user) => {
    const role = user?.role;
    const r = USER_ROLES.find(item => item.value === role);
    const badgeCls = ROLE_BADGE_CLASSES[role] || ROLE_BADGE_DEFAULT;
    const label = displayUserRoleLabel(user);
    return r
        ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`}>{label}</span>
        : <span className="text-xs text-gray-400 font-mono">{role}</span>;
};

const getRoleBreakdownBadgeClass = (value) => {
    if (value === "SUPER_ADMIN") return "bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-xs font-medium";
    if (value === "ORG_MANAGER") return "bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full text-xs font-medium";
    if (value === "WH_MANAGER") return "bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-medium";
    if (value === "SHOP_OWNER") return "bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-xs font-medium";
    if (value === "SHOP_MANAGER") return "bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full text-xs font-medium";
    return "bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full text-xs font-medium";
};

// ── Assigned-to label ──────────────────────────────────────────────────────
const getAssignedTo = (user) => {
    if (user.warehouse?.warehouse_name) {
        return (
            <span className="text-xs text-gray-600">
                {user.warehouse.warehouse_name}
                <span className="font-mono text-gray-400 ml-1">({user.warehouse.warehouse_code})</span>
            </span>
        );
    }
    if (user.shop?.shop_name) {
        return (
            <span className="text-xs text-gray-600">
                {user.shop.shop_name}
                <span className="font-mono text-gray-400 ml-1">({user.shop.shop_code})</span>
            </span>
        );
    }
    return <span className="text-xs text-gray-400">—</span>;
};

export default function UsersTab() {
    const dispatch = useDispatch();
    const actorRole = useSelector((state) => state.auth?.user?.role);

    // ── Slice state ────────────────────────────────────────────────────────
    const {
        showAddForm,
        showEditForm,
        selectedUser,
        formData,
        formErrors,
        search,
        roleFilter,
        activeFilter,
        currentPage,
        pageSize,
    } = useSelector((state) => state.user);

    // ── API ────────────────────────────────────────────────────────────────
    const {
        data: usersData,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useGetUsersQuery({
        page: currentPage,
        limit: pageSize,
        search,
        role: roleFilter,
        is_active: activeFilter,
    });

    const users = usersData?.users || [];
    const meta = usersData?.meta;
    const totalPages = meta?.totalPages || 1;
    const totalItems = meta?.total || 0;

    // ── Stats from current page ────────────────────────────────────────────
    const activeCount = users.filter(u => u.is_active).length;

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleAddSuccess = () => {
        dispatch(closeAddForm());
        dispatch(clearFormErrors());
        refetch();
    };

    const handleEditSuccess = () => {
        dispatch(closeEditForm());
        dispatch(clearFormErrors());
        refetch();
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Users & Roles</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Deactivate users instead of deleting — audit trail must be preserved
                    </p>
                </div>
                <button
                    onClick={() => dispatch(openAddForm())}
                    className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                    + Add User
                </button>
            </div>

            {/* ── Summary Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-blue-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-blue-400">Total Users</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">{totalItems}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-green-500">Active (this page)</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{activeCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:col-span-2 lg:col-span-1">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Role Breakdown</p>
                    <div className="space-y-1.5">
                        {USER_ROLES.map(r => {
                            const count = users.filter(u => u.role === r.value).length;
                            if (!count) return null;
                            return (
                                <div key={r.value} className="flex justify-between items-center gap-2 py-0.5 min-w-0">
                                    <span className={`${getRoleBreakdownBadgeClass(r.value)} truncate max-w-[75%]`}>{r.label}</span>
                                    <span className="text-sm font-semibold text-gray-700 shrink-0">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Filters Bar ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search by name or phone…"
                        className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button
                        onClick={() => dispatch(resetFilters())}
                        className="shrink-0 bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {/* Role filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => dispatch(setRoleFilter(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        <option value="">All Roles</option>
                        {USER_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>

                    {/* Status filter */}
                    <select
                        value={activeFilter}
                        onChange={(e) => dispatch(setActiveFilter(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>

                    {/* Page size */}
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="w-full sm:w-auto sm:ml-auto bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>

            {/* ── Error ───────────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">
                        Error loading users: {error.data?.message || "Please try again"}
                    </p>
                </div>
            )}

            {/* ── Table ───────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Users & Roles</span>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{totalItems} records</span>
                </div>
                <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                    <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {["User", "Phone", "Role", "Assigned To", "Status", "Created", "Actions"].map(h => (
                                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">

                            {/* Loading rows */}
                            {(isLoading || isFetching) && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center">
                                        <div className="flex justify-center">
                                            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Empty state */}
                            {!isLoading && !isFetching && users.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <p className="mt-2 text-sm text-gray-400">No users found</p>
                                    </td>
                                </tr>
                            )}

                            {/* User rows */}
                            {!isLoading && users.map(u => (
                                <tr
                                    key={u.user_id}
                                    className={`hover:bg-gray-50 transition-colors ${!u.is_active ? "opacity-50" : ""}`}
                                >
                                    {/* User */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                                {u.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                                                <p className="font-mono text-xs text-gray-400">{u.user_id}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Phone */}
                                    <td className="px-4 py-3 text-sm text-gray-500">{u.phone}</td>

                                    {/* Role */}
                                    <td className="px-4 py-3">{getRoleBadge(u)}</td>

                                    {/* Assigned To */}
                                    <td className="px-4 py-3">{getAssignedTo(u)}</td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                                            }`}>
                                            {u.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>

                                    {/* Created */}
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        {canAdminMutateUser(actorRole, u) ? (
                                        <button
                                            onClick={() => dispatch(openEditForm(u))}
                                            className="text-xs border border-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        ) : (
                                            <span className="text-xs text-gray-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Pagination ───────────────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-xs text-gray-400">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
                    </p>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                            disabled={currentPage === 1}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-500">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* ── Add Form Modal ───────────────────────────────────────────────── */}
            {showAddForm && (
                <UserAddForm
                    formData={formData}
                    formErrors={formErrors}
                    onSave={handleAddSuccess}
                />
            )}

            {/* ── Edit Form Modal ──────────────────────────────────────────────── */}
            {showEditForm && (
                <UserEditForm
                    formData={formData}
                    formErrors={formErrors}
                    selectedUser={selectedUser}
                    onSave={handleEditSuccess}
                />
            )}

        </div>
    );
}