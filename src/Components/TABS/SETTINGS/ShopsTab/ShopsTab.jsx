// TABS/SETTINGS/ShopsTab.jsx
//
// Shop Management - Complete CRUD
// Features: List view with filters, Add Shop, Edit Shop, Deactivate Shop

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Plus, Eye, Edit, Building2, MapPin, Phone, Mail, Hash } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useGetShopsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import {
    openAddForm,
    openEditForm,
    setSearch,
    setCityFilter,
    setActiveFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopSlice";
import ShopAddForm from "./ShopShared/ShopAddForm";
import ShopEditForm from "./ShopShared/ShopEditForm";
import {
    displayShopTypeLabel,
    isOrgLevelAdminRole,
    canMutateFranchiseShop,
} from "../../../roles";

const StatusBadge = ({ isActive }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
    }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
        {isActive ? "Active" : "Inactive"}
    </span>
);

export default function ShopsTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const {
        showAddForm,
        showEditForm,
        search,
        cityFilter,
        activeFilter,
        currentPage,
        pageSize,
    } = useSelector((state) => state.shop);

    const canAddShop = isOrgLevelAdminRole(user?.role);
    const canEditShop = (shop) =>
        canMutateFranchiseShop(user?.role) || (isOrgLevelAdminRole(user?.role) && shop?.shop_type !== "FRANCHISE");

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data, isLoading, isFetching, refetch } = useGetShopsQuery({
        page: currentPage,
        limit: pageSize,
        search,
        city: cityFilter,
        is_active: activeFilter,
    });

    const shops = data?.shops || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    // Get unique cities for filter dropdown
    const uniqueCities = [...new Set(shops.map(s => s.city).filter(Boolean))];

    const handleRefresh = () => {
        refetch();
    };

    const handleSaveSuccess = () => {
        refetch();
    };

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Shop Configuration</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage shop details, GST numbers, and bank accounts
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleRefresh}
                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg cursor-pointer"
                    >
                        Refresh
                    </button>
                    {canAddShop && (
                        <button
                            onClick={() => dispatch(openAddForm())}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                        >
                            <Plus size={16} /> Add Shop
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex gap-3">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search by shop name, code, phone, city..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => dispatch(resetFilters())}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {/* City Filter */}
                    <select
                        value={cityFilter}
                        onChange={(e) => dispatch(setCityFilter(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer"
                    >
                        <option value="">All Cities</option>
                        {uniqueCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={activeFilter}
                        onChange={(e) => dispatch(setActiveFilter(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active Only</option>
                        <option value="false">Inactive Only</option>
                    </select>

                    {/* Page Size */}
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 ml-auto cursor-pointer"
                    >
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>

            {/* Shop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {(isLoading || isFetching) && (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!isLoading && !isFetching && shops.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <Building2 size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No shops found</p>
                        {canAddShop && (
                            <button onClick={() => dispatch(openAddForm())} className="text-blue-600 text-xs font-medium hover:underline mt-2">
                                Add your first shop
                            </button>
                        )}
                    </div>
                )}

                {!isLoading && shops.map((shop) => (
                    <div
                        key={shop.shop_id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-gray-800">{shop.shop_name}</h3>
                                        <StatusBadge isActive={shop.is_active} />
                                    </div>
                                    <p className="text-xs font-mono text-gray-400 mt-1">{shop.shop_code}</p>
                                    {shop.shop_type && (
                                        <p className="text-xs text-indigo-600 mt-1">{displayShopTypeLabel(shop.shop_type)}</p>
                                    )}
                                </div>
                                {canEditShop(shop) && (
                                    <button
                                        onClick={() => dispatch(openEditForm(shop))}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit Shop"
                                    >
                                        <Edit size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                            {/* Location */}
                            <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-700">{shop.address || "Address not provided"}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{shop.city}</p>
                                </div>
                            </div>

                            {/* Contact */}
                            {shop.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400 shrink-0" />
                                    <span className="text-sm text-gray-600">{shop.phone}</span>
                                </div>
                            )}
                            {shop.email && (
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-gray-400 shrink-0" />
                                    <span className="text-sm text-gray-600">{shop.email}</span>
                                </div>
                            )}

                            {/* Sales Channels */}
                            {shop.sales_channels && shop.sales_channels.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {shop.sales_channels.map(channel => (
                                        <span key={channel} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                                            {channel}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Owner & Remarks */}
                            {shop.owner_user_id && (
                                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-2">
                                    <Hash size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-500">Owner ID: {shop.owner_user_id}</span>
                                </div>
                            )}
                            {shop.remarks && (
                                <p className="text-xs text-gray-400 italic">{shop.remarks}</p>
                            )}
                        </div>

                        {/* Card Footer */}
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                            Created: {new Date(shop.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                            disabled={currentPage === meta.totalPages}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showAddForm && <ShopAddForm onSuccess={handleSaveSuccess} />}
            {showEditForm && <ShopEditForm onSuccess={handleSaveSuccess} />}

        </div>
    );
}