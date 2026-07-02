// TABS/TeamMembersTab/TeamMembersTab.jsx
//
// Shop Owner / WH Manager: scoped team via /users/team
// Super Admin: full user list via /users (Settings also has Users tab)

import React, { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Users, RefreshCw } from "lucide-react";
import {
    useGetUsersQuery,
    useGetTeamMembersQuery,
    useGetTeamContextQuery,
} from "../../../REDUX_FEATURES/REDUX_SLICES/User_Api/userApi";
import {
    openAddForm,
    closeAddForm,
    openEditForm,
    closeEditForm,
    setSearch,
    setRoleFilter,
    setActiveFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
} from "../../../REDUX_FEATURES/REDUX_SLICES/User_Api/userSlice";
import UserAddForm from "../SETTINGS/UserTab/UserShared/UserAddForm";
import UserEditForm from "../SETTINGS/UserTab/UserShared/UserEditForm";
import { USER_ROLES } from "../SETTINGS/UserTab/UserShared/userRoles";
import { can, CURRENT_USER } from "../../roles";
import {
    isTeamManagerRole,
    getTeamRoleFilterOptions,
    canCreateTeamMember,
    canEditTeamMember,
} from "../../../constants/teamPermissions";

const ROLE_BADGE_CLASSES = {
    SUPER_ADMIN: "bg-purple-50 text-purple-700 border border-purple-200",
    WH_MANAGER: "bg-blue-50 text-blue-700 border border-blue-200",
    WH_STOCK_LISTER: "bg-sky-50 text-sky-700 border border-sky-200",
    SHOP_OWNER: "bg-green-50 text-green-700 border border-green-200",
    BILLING_STAFF: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    SHOP_MANAGER: "bg-teal-50 text-teal-700 border border-teal-200",
};
const ROLE_BADGE_DEFAULT = "bg-gray-100 text-gray-600 border border-gray-200";

const getRoleBadge = (role) => {
    const r = USER_ROLES.find((item) => item.value === role);
    const badgeCls = ROLE_BADGE_CLASSES[role] || ROLE_BADGE_DEFAULT;
    return r
        ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeCls}`}>{r.label}</span>
        : <span className="text-xs text-gray-400 font-mono">{role}</span>;
};

const getRoleBreakdownBadgeClass = (value) => {
    const base = ROLE_BADGE_CLASSES[value] || ROLE_BADGE_DEFAULT;
    return `${base} px-2 py-0.5 rounded-full text-xs font-medium`;
};

const getAssignedTo = (user) => {
    if (user.shop?.shop_name) {
        return (
            <span className="text-xs text-gray-600">
                {user.shop.shop_name}
                <span className="font-mono text-gray-400 ml-1">({user.shop.shop_code})</span>
            </span>
        );
    }
    if (user.warehouse?.warehouse_name) {
        return (
            <span className="text-xs text-gray-600">
                {user.warehouse.warehouse_name}
                <span className="font-mono text-gray-400 ml-1">({user.warehouse.warehouse_code})</span>
            </span>
        );
    }
    if (user.warehouse_id) return <span className="font-mono text-xs text-gray-400">{user.warehouse_id}</span>;
    if (user.shop_id) return <span className="font-mono text-xs text-gray-400">{user.shop_id}</span>;
    return <span className="font-mono text-xs text-gray-400">—</span>;
};

const getStaffId = (userId) => {
    if (!userId) return "SM-—";
    const suffix = String(userId).slice(-3).toUpperCase();
    return `SM-${suffix}`;
};

const fmtJoined = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function TeamMembersTab() {
    const dispatch = useDispatch();
    const authUser = useSelector((state) => state.auth.user);

    const teamMode = isTeamManagerRole(CURRENT_USER.role);
    const canAdd = teamMode ? canCreateTeamMember(CURRENT_USER.role) : can("user.create");
    const roleFilterOptions = useMemo(
        () => getTeamRoleFilterOptions(CURRENT_USER.role, USER_ROLES),
        []
    );

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

    const queryArgs = {
        page: currentPage,
        limit: pageSize,
        search,
        role: roleFilter,
        is_active: activeFilter,
    };

    const {
        data: adminData,
        isLoading: adminLoading,
        isFetching: adminFetching,
        error: adminError,
        refetch: refetchAdmin,
    } = useGetUsersQuery(queryArgs, { skip: teamMode });

    const {
        data: teamData,
        isLoading: teamLoading,
        isFetching: teamFetching,
        error: teamError,
        refetch: refetchTeam,
    } = useGetTeamMembersQuery(queryArgs, { skip: !teamMode });

    const { data: teamContext } = useGetTeamContextQuery(undefined, { skip: !teamMode });

    const usersData = teamMode ? teamData : adminData;
    const isLoading = teamMode ? teamLoading : adminLoading;
    const isFetching = teamMode ? teamFetching : adminFetching;
    const error = teamMode ? teamError : adminError;
    const refetch = teamMode ? refetchTeam : refetchAdmin;

    const users = usersData?.users || [];
    const meta = usersData?.meta;
    const totalPages = meta?.totalPages || 1;
    const totalItems = meta?.total || 0;
    const creatableRoles = teamMode
        ? (meta?.creatable_roles || teamContext?.creatable_roles || [])
        : [];

    const activeCount = users.filter((u) => u.is_active).length;
    const rolesAssignedCount = roleFilterOptions.filter((r) => users.some((u) => u.role === r.value)).length;
    const inactiveCount = users.filter((u) => !u.is_active).length;

    const currentUserId = authUser?.user_id;

    const handleAddClick = () => {
        if (teamMode && creatableRoles.length) {
            const defaultRole = creatableRoles[0];
            const prefill = { role: defaultRole };
            if (teamContext?.scope === "shop") prefill.shop_id = teamContext.shop_id;
            if (teamContext?.scope === "warehouse") prefill.warehouse_id = teamContext.warehouse_id;
            dispatch(openAddForm(prefill));
        } else {
            dispatch(openAddForm());
        }
    };

    const handleEditClick = (user) => {
        dispatch(openEditForm(user));
    };

    const handleAddSuccess = () => {
        dispatch(closeAddForm());
        refetch();
    };

    const handleEditSuccess = () => {
        dispatch(closeEditForm());
        refetch();
    };

    const editReadOnly = teamMode && selectedUser
        ? !canEditTeamMember(CURRENT_USER.role, selectedUser, currentUserId)
        : false;

    const scopeSubtitle = teamMode && teamContext
        ? teamContext.scope === "shop"
            ? `Managing team for ${teamContext.shop?.shop_name || "your shop"}`
            : `Managing team for ${teamContext.warehouse?.warehouse_name || "your warehouse"}`
        : "Create, manage and track your staff — assign roles, locations and monitor performance";

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{scopeSubtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="bg-white border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5 transition-colors"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                    {canAdd && (
                        <button
                            type="button"
                            onClick={handleAddClick}
                            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                        >
                            + Add Member
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-blue-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-blue-400">Total Members</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">{totalItems}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-green-500">Active Staff</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{activeCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-purple-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-purple-400">Roles Assigned</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{rolesAssignedCount}</p>
                    <p className="text-xs text-gray-400 mt-1">unique roles on page</p>
                </div>
                <div className="bg-white rounded-xl border border-red-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-red-400">Inactive</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{inactiveCount}</p>
                    <p className="text-xs text-gray-400 mt-1">deactivated</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 mr-1">Roles on this page:</span>
                {roleFilterOptions.map((r) => {
                    const count = users.filter((u) => u.role === r.value).length;
                    if (!count) return null;
                    return (
                        <span key={r.value} className={getRoleBreakdownBadgeClass(r.value)}>
                            {r.label} · {count}
                        </span>
                    );
                })}
                {users.length === 0 && (
                    <span className="text-xs text-gray-400">No roles to show</span>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex gap-3">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search by name or phone…"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button
                        type="button"
                        onClick={() => dispatch(resetFilters())}
                        className="bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 inline-flex items-center gap-1.5 transition-colors"
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <select
                        value={roleFilter}
                        onChange={(e) => dispatch(setRoleFilter(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        <option value="">All Roles</option>
                        {roleFilterOptions.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                    <select
                        value={activeFilter}
                        onChange={(e) => dispatch(setActiveFilter(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 ml-auto"
                    >
                        {[10, 20, 50].map((s) => (
                            <option key={s} value={s}>{s} per page</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">
                        Error loading team members: {error.data?.message || "Please try again"}
                    </p>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team Members</span>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                        {totalItems} members
                    </span>
                </div>
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Member", "Staff ID", "Phone", "Role", "Assigned To", "Status", "Joined", "Actions"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(isLoading || isFetching) && (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!isLoading && !isFetching && users.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center">
                                    <Users className="mx-auto h-8 w-8 text-gray-300" strokeWidth={1.5} />
                                    <p className="mt-2 text-sm text-gray-400">No team members found</p>
                                </td>
                            </tr>
                        )}

                        {!isLoading && !isFetching && users.map((u) => {
                            const editable = teamMode
                                ? canEditTeamMember(CURRENT_USER.role, u, currentUserId)
                                : can("user.edit");
                            const isSelf = u.user_id === currentUserId;

                            return (
                                <tr
                                    key={u.user_id}
                                    className={`hover:bg-gray-50 transition-colors ${!u.is_active ? "opacity-50" : ""}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                                {u.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">
                                                    {u.name}
                                                    {isSelf && <span className="text-xs text-gray-400 ml-1">(You)</span>}
                                                </p>
                                                <p className="font-mono text-xs text-gray-400">{u.user_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                                            {getStaffId(u.user_id)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{u.phone}</td>
                                    <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                                    <td className="px-4 py-3">{getAssignedTo(u)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                                            {u.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{fmtJoined(u.created_at)}</td>
                                    <td className="px-4 py-3">
                                        {teamMode ? (
                                            isSelf ? (
                                                <span className="text-xs text-gray-400">—</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(u)}
                                                    className="text-xs border border-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    {editable ? "Edit" : "View"}
                                                </button>
                                            )
                                        ) : (
                                            can("user.edit") && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(u)}
                                                    className="text-xs border border-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-xs text-gray-400">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
                    </p>
                    <div className="flex gap-2 items-center">
                        <button
                            type="button"
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
                            type="button"
                            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-600">
                    Staff IDs are used for commission tracking. At month end, filter sales by Staff ID to calculate individual performance and commissions.
                </p>
            </div>

            {showAddForm && (
                <UserAddForm
                    formData={formData}
                    formErrors={formErrors}
                    onSave={handleAddSuccess}
                    teamMode={teamMode}
                    teamContext={teamContext}
                    allowedRoles={teamMode ? creatableRoles : null}
                />
            )}

            {showEditForm && (
                <UserEditForm
                    formData={formData}
                    formErrors={formErrors}
                    selectedUser={selectedUser}
                    onSave={handleEditSuccess}
                    teamMode={teamMode}
                    teamContext={teamContext}
                    readOnly={editReadOnly}
                />
            )}
        </div>
    );
}
