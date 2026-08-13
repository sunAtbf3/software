// TABS/TRANSFERS/TransferRequestsTab.jsx
// 
// Main view for Transfer Requests with Integrated Stock Search
// FIXED: Added View Details (Eye) icon, Emergency badge, Rejection reason display
// UI: Restyled to match Purchase Bills clean/calm aesthetic

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { X, Plus, Eye, RefreshCw, CheckCircle, XCircle, Truck, Package, Ban, Search, MapPin, Warehouse, Store, Info, ShoppingCart } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useGetTransferRequestsQuery, useLazyGetTransferRequestByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
import { useLazySearchStockQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/StockSearch_api/stockSearchApi";
import {
    setStatusFilter,
    setTypeFilter,
    setSearch,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openCreateModal,
    openApproveRejectModal,
    openDispatchModal,
    openReceiveModal,
    openCancelModal,
    openCreateFromSearchModal,
    setPrefilledRequestData,
    openViewRequestModal,
    setViewRequestData,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestSlice";
import { CURRENT_USER, isAdmin } from "../../../roles";
import RequestActionModals from "./TransferRequestShared/RequestActionModals";
import CreateFromSearchModal from "./TransferRequestShared/CreateFromSearchModal";
import ViewRequestModal from "./ViewRequestModal";
import { openCreateModalWithPrefill } from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferSlice";

const STATUS_BADGE = {
    REQUESTED: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
    REJECTED: "bg-red-50 text-red-600 border border-red-200",
    DISPATCHED: "bg-purple-50 text-purple-700 border border-purple-200",
    PARTIALLY_RECEIVED: "bg-orange-50 text-orange-700 border border-orange-200",
    COMPLETED: "bg-green-50 text-green-700 border border-green-200",
    CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
};

const REQUEST_TYPE_LABEL = {
    WH_TO_SHOP: "Warehouse → Shop",
    WH_TO_WH: "Warehouse → Warehouse",
    SHOP_TO_SHOP: "Shop → Shop",
};

const SEARCH_TYPES = [
    { value: "product_code", label: "Product Code", placeholder: "e.g., IP15CASE" },
    { value: "sku", label: "SKU", placeholder: "e.g., SKU-IP15-001" },
    { value: "barcode", label: "Barcode", placeholder: "e.g., 8901234567890" },
    { value: "variant_id", label: "Variant ID", placeholder: "e.g., var_iphone_001" },
];

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatVariantAttributes = (attributes) => {
    if (!attributes) return "";
    if (Array.isArray(attributes)) {
        return attributes
            .map((a) => {
                if (!a) return "";
                if (typeof a === "string") return a;
                const key = a.key ?? a.name;
                const value = a.value;
                if (key && value != null) return `${key}: ${value}`;
                return value != null ? String(value) : "";
            })
            .filter(Boolean)
            .join(" · ");
    }
    if (typeof attributes === "object") {
        return Object.entries(attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ");
    }
    return String(attributes);
};

const normalizeStockSearchVariants = (result) => {
    if (!result) return [];
    if (Array.isArray(result.variants) && result.variants.length) {
        return result.variants;
    }
    // Backward compat for older API shape
    if (result.variant) {
        return [
            {
                variant: result.variant,
                warehouses: result.warehouses || [],
                shops: result.shops || [],
            },
        ];
    }
    return [];
};

export default function TransferRequestsTab() {
    const dispatch = useDispatch();
    const [urlSearchParams, setUrlSearchParams] = useSearchParams();
    const { user } = useSelector((state) => state.auth);
    const {
        statusFilter,
        typeFilter,
        search,
        currentPage,
        pageSize,
        showCreateModal,
    } = useSelector((state) => state.transferRequest);

    // Search state
    const [searchParams, setSearchParams] = useState({
        searchType: "product_code",
        searchValue: "",
        city: "",
        nearby_only: false,
    });
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [triggerSearch] = useLazySearchStockQuery();
    const [fetchRequestDetail] = useLazyGetTransferRequestByIdQuery();

    const userRole = user?.role || "";
    const userWarehouseId = user?.warehouse_id || "";
    const userShopId = user?.shop_id || "";

    const { data, isLoading, isFetching, refetch } = useGetTransferRequestsQuery({
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        request_type: typeFilter,
    });

    const requests = data?.requests || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const openRequestId = urlSearchParams.get("openRequestId");

    useEffect(() => {
        if (!openRequestId) return undefined;

        let cancelled = false;
        (async () => {
            try {
                const fullRequest = await fetchRequestDetail(openRequestId).unwrap();
                if (!cancelled) {
                    dispatch(setViewRequestData(fullRequest));
                    dispatch(openViewRequestModal());
                }
            } catch {
                if (!cancelled) toast.error("Failed to load request details");
            } finally {
                if (!cancelled) {
                    setUrlSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete("openRequestId");
                        return next;
                    }, { replace: true });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [openRequestId, dispatch, fetchRequestDetail, setUrlSearchParams]);

    const totalRequests = meta.total;
    const pendingCount = requests.filter(r => r.status === "REQUESTED").length;
    const dispatchedCount = requests.filter(r => r.status === "DISPATCHED").length;
    const completedCount = requests.filter(r => r.status === "COMPLETED").length;

    const handleSearch = async () => {
        if (!searchParams.searchValue.trim()) {
            toast.error("Please enter a search term");
            return;
        }

        setIsSearching(true);
        setSearchError(null);

        try {
            const params = {};
            params[searchParams.searchType] = searchParams.searchValue.trim();
            if (searchParams.city) params.city = searchParams.city;
            if (searchParams.nearby_only) params.nearby_only = true;
            if (userRole === "WH_MANAGER" || userRole === "WH_STOCK_LISTER") {
                params.request_type = "WH_TO_WH";
            }

            const result = await triggerSearch(params).unwrap();
            setSearchResults(result);

            const variantRows = normalizeStockSearchVariants(result);
            const hasStock = variantRows.some(
                (row) => (row.warehouses?.length || 0) > 0 || (row.shops?.length || 0) > 0
            );
            if (!hasStock) {
                toast.info("No stock found matching your search");
            }
        } catch (err) {
            setSearchError(err?.data?.message || "Search failed");
            toast.error("Search failed. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleRequestClick = (location, product, variant, isEmergencyRequest = false) => {
        let requestType = "";
        const isWarehouse = location.warehouse_id;
        
        if (isWarehouse) {
            if (userShopId) {
                requestType = "WH_TO_SHOP";
            } else if (userWarehouseId) {
                requestType = "WH_TO_WH";
            }
        } else {
            requestType = "SHOP_TO_SHOP";
        }

        const prefilledData = {
            request_type: requestType,
            source_id: isWarehouse ? location.warehouse_id : location.shop_id,
            source_type: isWarehouse ? "warehouse" : "shop",
            source_name: isWarehouse ? location.warehouse_name : location.shop_name,
            source_city: location.city,
            variant_id: variant.variant_id,
            product_name: product.name,
            product_code: product.product_code,
            sku: variant.sku,
            available_quantity: location.stock_quantity,
            max_quantity: location.stock_quantity,
            destination_id: userShopId || userWarehouseId,
            destination_type: userShopId ? "shop" : "warehouse",
            is_emergency: isEmergencyRequest,
        };

        dispatch(setPrefilledRequestData(prefilledData));
        dispatch(openCreateFromSearchModal());
    };

    const handleAddToBulkCart = (warehouse, product, variant) => {
        if (!userShopId) {
            toast.error("Link a shop to your account to use bulk requests");
            return;
        }
        dispatch(
            openCreateModalWithPrefill({
                from_warehouse_id: warehouse.warehouse_id,
                to_shop_id: userShopId,
                request_remarks: `From stock search: ${product?.name || ""}`,
                items: [
                    {
                        variant_id: variant.variant_id,
                        product_name: product.name,
                        product_code: variant.product_code || product.product_code,
                        sku: variant.sku,
                        quantity: "1",
                        available_stock: warehouse.stock_quantity,
                    },
                ],
            })
        );
        setUrlSearchParams({ tab: "transfers", ctab: "bulk-requests" });
        toast.info("Added to bulk request — review variants and submit");
    };

    const handleAction = async (request, actionType) => {
        if (actionType === "view") {
            try {
                const fullRequest = await fetchRequestDetail(request.request_id).unwrap();
                dispatch(setViewRequestData(fullRequest));
                dispatch(openViewRequestModal());
            } catch (err) {
                toast.error("Failed to load request details");
            }
        } else if (actionType === "approve") {
            dispatch(openApproveRejectModal(request));
        } else if (actionType === "reject") {
            dispatch(openApproveRejectModal(request));
        } else if (actionType === "dispatch") {
            dispatch(openDispatchModal(request));
        } else if (actionType === "receive") {
            dispatch(openReceiveModal(request));
        } else if (actionType === "cancel") {
            dispatch(openCancelModal(request));
        }
    };

    // Get available actions including View Details
    const getAvailableActions = (request, userRole, userWarehouseId, userShopId) => {
        const actions = [];
        const status = request.status;
        const isSourceWH = userWarehouseId && (request.from_warehouse_id === userWarehouseId);
        const isDestWH = userWarehouseId && (request.to_warehouse_id === userWarehouseId);
        const isSourceShop = userShopId && (request.from_shop_id === userShopId);
        const isDestShop = userShopId && (request.to_shop_id === userShopId);
        const isSuperAdmin = userRole === "SUPER_ADMIN";

        // View details - ALWAYS available for everyone
        actions.push({ type: "view", label: "View Details", icon: <Eye size={14} />, color: "text-gray-400 hover:text-gray-700" });

        if (status === "REQUESTED") {
            if (isSourceWH || isSourceShop || isSuperAdmin) {
                actions.push({ type: "approve", label: "Approve", icon: <CheckCircle size={14} />, color: "text-green-500 hover:text-green-700" });
                actions.push({ type: "reject", label: "Reject", icon: <XCircle size={14} />, color: "text-red-400 hover:text-red-600" });
            }
            if (isDestWH || isDestShop || isSuperAdmin) {
                actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-400 hover:text-gray-600" });
            }
        }

        if (status === "APPROVED") {
            if (isSourceWH || isSourceShop || isSuperAdmin) {
                actions.push({ type: "dispatch", label: "Dispatch", icon: <Truck size={14} />, color: "text-blue-500 hover:text-blue-700" });
            }
            if (isDestWH || isDestShop || isSuperAdmin) {
                actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-400 hover:text-gray-600" });
            }
        }

        if (status === "DISPATCHED" || status === "PARTIALLY_RECEIVED") {
            if (isDestWH || isDestShop || isSuperAdmin) {
                actions.push({ type: "receive", label: "Receive", icon: <Package size={14} />, color: "text-green-500 hover:text-green-700" });
                actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-400 hover:text-gray-600" });
            }
        }

        if (status !== "COMPLETED" && status !== "REJECTED" && status !== "CANCELLED") {
            if (isDestWH || isDestShop || isSourceWH || isSourceShop || isSuperAdmin) {
                if (!actions.find(a => a.type === "cancel")) {
                    actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-400 hover:text-gray-600" });
                }
            }
        }

        return actions;
    };

    const product = searchResults?.product;
    const variantRows = normalizeStockSearchVariants(searchResults);
    const anyStockFound = variantRows.some(
        (row) => (row.warehouses?.length || 0) > 0 || (row.shops?.length || 0) > 0
    );

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Transfer Requests</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Search stock across locations · Create transfer requests · Track workflow
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards — flat, lightly tinted, no gradients */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Requests</p>
                    <p className="text-3xl font-bold text-gray-800">{totalRequests}</p>
                </div>
                <div className="bg-white rounded-xl border border-yellow-100 p-4">
                    <p className="text-xs text-yellow-500 uppercase tracking-wide mb-1">Pending</p>
                    <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-purple-100 p-4">
                    <p className="text-xs text-purple-400 uppercase tracking-wide mb-1">Dispatched</p>
                    <p className="text-3xl font-bold text-purple-600">{dispatchedCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-100 p-4">
                    <p className="text-xs text-green-500 uppercase tracking-wide mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{completedCount}</p>
                </div>
            </div>

            {/* Stock Search Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <Search size={16} className="text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700">Stock Search</h3>
                </div>
                
                <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs text-gray-500 mb-1">Search By</label>
                        <select 
                            value={searchParams.searchType} 
                            onChange={(e) => setSearchParams({ ...searchParams, searchType: e.target.value, searchValue: "" })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            {SEARCH_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-xs text-gray-500 mb-1">Search Value <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={searchParams.searchValue}
                            onChange={(e) => setSearchParams({ ...searchParams, searchValue: e.target.value })}
                            placeholder={SEARCH_TYPES.find(t => t.value === searchParams.searchType)?.placeholder}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                </div>
                
                <div className="flex gap-3 flex-wrap items-end">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">City (Optional)</label>
                        <input
                            type="text"
                            value={searchParams.city}
                            onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                            placeholder="Filter by city"
                            className="w-40 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                        />
                    </div>
                    <label className="flex items-center gap-2 pb-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={searchParams.nearby_only}
                            onChange={(e) => setSearchParams({ ...searchParams, nearby_only: e.target.checked })}
                            className="w-4 h-4 text-gray-600 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Nearby only (same city)</span>
                    </label>
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        <Search size={14} /> {isSearching ? "Searching..." : "Search Stock"}
                    </button>
                    {searchResults && (
                        <button
                            onClick={() => setSearchResults(null)}
                            className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Clear Results
                        </button>
                    )}
                </div>
                {searchError && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-500">
                        {searchError}
                    </div>
                )}
            </div>

            {/* Search Results */}
            {searchResults && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-semibold text-gray-800 text-sm">{product?.name || "Product"}</h3>
                        <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-400">
                            <span className="font-semibold text-blue-600">Code: {product?.product_code || "—"}</span>
                            <span>
                                {variantRows.length} variant{variantRows.length === 1 ? "" : "s"} found
                            </span>
                        </div>
                    </div>

                    {variantRows.map((row) => {
                        const variant = row.variant || {};
                        const warehouses = row.warehouses || [];
                        const shops = row.shops || [];
                        const attrs = formatVariantAttributes(variant.attributes);
                        const stocked = warehouses.length > 0 || shops.length > 0;

                        return (
                            <div
                                key={variant.variant_id || variant.sku}
                                className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-blue-600">
                                            {variant.product_code || variant.sku || "Variant"}
                                        </p>
                                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                                            {variant.sku && variant.sku !== variant.product_code && (
                                                <span className="font-mono">SKU: {variant.sku}</span>
                                            )}
                                            {attrs && <span title={attrs}>{attrs}</span>}
                                            {variant.system_barcode && (
                                                <span className="font-mono">Barcode: {variant.system_barcode}</span>
                                            )}
                                        </div>
                                    </div>
                                    {!stocked && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                            No stock at any location
                                        </span>
                                    )}
                                </div>

                                {warehouses.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <Warehouse size={13} /> Warehouses
                                        </h4>
                                        <div className="space-y-2">
                                            {warehouses.map((wh) => (
                                                <div
                                                    key={`${variant.variant_id}-${wh.warehouse_id}`}
                                                    className="border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                                <Warehouse size={14} className="text-blue-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    {wh.warehouse_name}
                                                                </p>
                                                                <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin size={9} /> {wh.city}
                                                                    </span>
                                                                    <span>
                                                                        Stock:{" "}
                                                                        <span className="font-semibold text-gray-600">
                                                                            {wh.stock_quantity} units
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {userShopId && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleAddToBulkCart(wh, product, variant)
                                                                    }
                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                                                >
                                                                    <ShoppingCart size={12} /> Add to bulk
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRequestClick(wh, product, variant, false)
                                                                }
                                                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                                            >
                                                                Create Request
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {shops.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <Store size={13} /> Shops
                                        </h4>
                                        <div className="space-y-2">
                                            {shops.map((shop) => (
                                                <div
                                                    key={`${variant.variant_id}-${shop.shop_id}`}
                                                    className="border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                                                <Store size={14} className="text-green-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    {shop.shop_name}
                                                                </p>
                                                                <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin size={9} /> {shop.city}
                                                                    </span>
                                                                    <span>
                                                                        Stock:{" "}
                                                                        <span className="font-semibold text-gray-600">
                                                                            {shop.stock_quantity} units
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRequestClick(shop, product, variant, false)
                                                            }
                                                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                                        >
                                                            Create Request
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!anyStockFound && (
                        <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
                            No stock found for any matching variant
                        </div>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex gap-2">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search by request number or remarks..."
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button
                        onClick={() => dispatch(resetFilters())}
                        className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
                    >
                        <X size={13} /> Clear
                    </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={(e) => dispatch(setStatusFilter(e.target.value))}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        <option value="">All Status</option>
                        <option value="REQUESTED">REQUESTED</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="DISPATCHED">DISPATCHED</option>
                        <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => dispatch(setTypeFilter(e.target.value))}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        <option value="">All Types</option>
                        <option value="WH_TO_SHOP">WH → Shop</option>
                        <option value="WH_TO_WH">WH → WH</option>
                        <option value="SHOP_TO_SHOP">Shop → Shop</option>
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 ml-auto focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transfer Requests</span>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{meta.total} records</span>
                </div>
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Request #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">From</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">To</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(isLoading || isFetching) && (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    </div>
                                </td>
                            </tr>
                        )}
                        {!isLoading && !isFetching && requests.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-14 text-center text-gray-400 text-sm">
                                    No transfer requests found
                                </td>
                            </tr>
                        )}
                        {!isLoading && requests.map((req) => {
                            const actions = getAvailableActions(req, userRole, userWarehouseId, userShopId);
                            const productName = req.variant?.product?.name || "—";
                            const fromName = req.from_warehouse?.warehouse_name || req.from_shop?.shop_name || req.from_warehouse_id || req.from_shop_id || "—";
                            const toName = req.to_warehouse?.warehouse_name || req.to_shop?.shop_name || req.to_warehouse_id || req.to_shop_id || "—";
                            const isEmergency = req.priority === "HIGH";
                            const isRejected = req.status === "REJECTED";
                            const rejectionReason = req.rejection_reason;

                            return (
                                <tr key={req.request_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                                            {req.request_number}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-500">{REQUEST_TYPE_LABEL[req.request_type]}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-medium text-gray-800 text-sm">{productName}</p>
                                            {isEmergency && (
                                                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-medium">
                                                    🚨 EMERGENCY
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 font-mono mt-0.5">{req.variant?.sku || req.variant_id?.slice(-8)}</p>
                                        {isRejected && rejectionReason && (
                                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                                <XCircle size={10} /> {rejectionReason?.slice(0, 30)}...
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{req.quantity}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{fromName}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{toName}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                                            {req.status?.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(req.created_at)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {actions.map((action) => (
                                                <button
                                                    key={action.type}
                                                    onClick={() => handleAction(req, action.type)}
                                                    className={`p-1.5 ${action.color} hover:bg-gray-100 rounded-md transition-colors`}
                                                    title={action.label}
                                                >
                                                    {action.icon}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-xs text-gray-400">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
                    </p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
                            {currentPage} / {meta.totalPages}
                        </span>
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                            disabled={currentPage === meta.totalPages}
                            className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <RequestActionModals onSuccess={() => refetch()} />
            <CreateFromSearchModal onSuccess={() => {
                refetch();
                setSearchResults(null);
            }} initialIsEmergency={false} />
            <ViewRequestModal onSuccess={() => refetch()} />
        </div>
    );
}

// down code is working but upper code have updated ui 
// // TABS/TRANSFERS/TransferRequestsTab.jsx
// // 
// // Main view for Transfer Requests with Integrated Stock Search
// // FIXED: Added View Details (Eye) icon, Emergency badge, Rejection reason display

// import React, { useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { X, Plus, Eye, RefreshCw, CheckCircle, XCircle, Truck, Package, Ban, Search, MapPin, Warehouse, Store, Info } from "lucide-react";
// import { toast } from "react-toastify";
// import { useGetTransferRequestsQuery, useLazyGetTransferRequestByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
// import { useLazySearchStockQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/StockSearch_api/stockSearchApi";
// import {
//     setStatusFilter,
//     setTypeFilter,
//     setSearch,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openCreateModal,
//     openApproveRejectModal,
//     openDispatchModal,
//     openReceiveModal,
//     openCancelModal,
//     openCreateFromSearchModal,
//     setPrefilledRequestData,
//     openViewRequestModal,
//     setViewRequestData,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestSlice";
// import { CURRENT_USER, isAdmin } from "../../../roles";
// import RequestActionModals from "./TransferRequestShared/RequestActionModals";
// import CreateFromSearchModal from "./TransferRequestShared/CreateFromSearchModal";
// import ViewRequestModal from "./ViewRequestModal";

// const STATUS_BADGE = {
//     REQUESTED: "bg-yellow-100 text-yellow-700",
//     APPROVED: "bg-blue-100 text-blue-700",
//     REJECTED: "bg-red-100 text-red-600",
//     DISPATCHED: "bg-purple-100 text-purple-700",
//     PARTIALLY_RECEIVED: "bg-orange-100 text-orange-700",
//     COMPLETED: "bg-green-100 text-green-700",
//     CANCELLED: "bg-gray-100 text-gray-500",
// };

// const REQUEST_TYPE_LABEL = {
//     WH_TO_SHOP: "Warehouse → Shop",
//     WH_TO_WH: "Warehouse → Warehouse",
//     SHOP_TO_SHOP: "Shop → Shop",
// };

// const SEARCH_TYPES = [
//     { value: "product_code", label: "Product Code", placeholder: "e.g., IP15CASE" },
//     { value: "sku", label: "SKU", placeholder: "e.g., SKU-IP15-001" },
//     { value: "barcode", label: "Barcode", placeholder: "e.g., 8901234567890" },
//     { value: "variant_id", label: "Variant ID", placeholder: "e.g., var_iphone_001" },
// ];

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// export default function TransferRequestsTab() {
//     const dispatch = useDispatch();
//     const { user } = useSelector((state) => state.auth);
//     const {
//         statusFilter,
//         typeFilter,
//         search,
//         currentPage,
//         pageSize,
//         showCreateModal,
//     } = useSelector((state) => state.transferRequest);

//     // Search state
//     const [searchParams, setSearchParams] = useState({
//         searchType: "product_code",
//         searchValue: "",
//         city: "",
//         nearby_only: false,
//     });
//     const [searchResults, setSearchResults] = useState(null);
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchError, setSearchError] = useState(null);
//     const [triggerSearch] = useLazySearchStockQuery();
//     const [fetchRequestDetail] = useLazyGetTransferRequestByIdQuery();

//     const userRole = user?.role || "";
//     const userWarehouseId = user?.warehouse_id || "";
//     const userShopId = user?.shop_id || "";

//     const { data, isLoading, isFetching, refetch } = useGetTransferRequestsQuery({
//         page: currentPage,
//         limit: pageSize,
//         status: statusFilter,
//         request_type: typeFilter,
//     });

//     const requests = data?.requests || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

//     const totalRequests = meta.total;
//     const pendingCount = requests.filter(r => r.status === "REQUESTED").length;
//     const dispatchedCount = requests.filter(r => r.status === "DISPATCHED").length;
//     const completedCount = requests.filter(r => r.status === "COMPLETED").length;

//     const handleSearch = async () => {
//         if (!searchParams.searchValue.trim()) {
//             toast.error("Please enter a search term");
//             return;
//         }

//         setIsSearching(true);
//         setSearchError(null);

//         try {
//             const params = {};
//             params[searchParams.searchType] = searchParams.searchValue.trim();
//             if (searchParams.city) params.city = searchParams.city;
//             if (searchParams.nearby_only) params.nearby_only = true;

//             const result = await triggerSearch(params).unwrap();
//             setSearchResults(result);
            
//             if (!result.warehouses?.length && !result.shops?.length) {
//                 toast.info("No stock found matching your search");
//             }
//         } catch (err) {
//             setSearchError(err?.data?.message || "Search failed");
//             toast.error("Search failed. Please try again.");
//         } finally {
//             setIsSearching(false);
//         }
//     };

//     const handleRequestClick = (location, product, variant, isEmergencyRequest = false) => {
//         let requestType = "";
//         const isWarehouse = location.warehouse_id;
        
//         if (isWarehouse) {
//             if (userShopId) {
//                 requestType = "WH_TO_SHOP";
//             } else if (userWarehouseId) {
//                 requestType = "WH_TO_WH";
//             }
//         } else {
//             requestType = "SHOP_TO_SHOP";
//         }

//         const prefilledData = {
//             request_type: requestType,
//             source_id: isWarehouse ? location.warehouse_id : location.shop_id,
//             source_type: isWarehouse ? "warehouse" : "shop",
//             source_name: isWarehouse ? location.warehouse_name : location.shop_name,
//             source_city: location.city,
//             variant_id: variant.variant_id,
//             product_name: product.name,
//             product_code: product.product_code,
//             sku: variant.sku,
//             available_quantity: location.stock_quantity,
//             max_quantity: location.stock_quantity,
//             destination_id: userShopId || userWarehouseId,
//             destination_type: userShopId ? "shop" : "warehouse",
//             is_emergency: isEmergencyRequest,
//         };

//         dispatch(setPrefilledRequestData(prefilledData));
//         dispatch(openCreateFromSearchModal());
//     };

//     const handleAction = async (request, actionType) => {
//         if (actionType === "view") {
//             try {
//                 const fullRequest = await fetchRequestDetail(request.request_id).unwrap();
//                 dispatch(setViewRequestData(fullRequest));
//                 dispatch(openViewRequestModal());
//             } catch (err) {
//                 toast.error("Failed to load request details");
//             }
//         } else if (actionType === "approve") {
//             dispatch(openApproveRejectModal(request));
//         } else if (actionType === "reject") {
//             dispatch(openApproveRejectModal(request));
//         } else if (actionType === "dispatch") {
//             dispatch(openDispatchModal(request));
//         } else if (actionType === "receive") {
//             dispatch(openReceiveModal(request));
//         } else if (actionType === "cancel") {
//             dispatch(openCancelModal(request));
//         }
//     };

//     // Get available actions including View Details
//     const getAvailableActions = (request, userRole, userWarehouseId, userShopId) => {
//         const actions = [];
//         const status = request.status;
//         const isSourceWH = userWarehouseId && (request.from_warehouse_id === userWarehouseId);
//         const isDestWH = userWarehouseId && (request.to_warehouse_id === userWarehouseId);
//         const isSourceShop = userShopId && (request.from_shop_id === userShopId);
//         const isDestShop = userShopId && (request.to_shop_id === userShopId);
//         const isSuperAdmin = userRole === "SUPER_ADMIN";

//         // View details - ALWAYS available for everyone
//         actions.push({ type: "view", label: "View Details", icon: <Eye size={14} />, color: "text-gray-500" });

//         if (status === "REQUESTED") {
//             if (isSourceWH || isSourceShop || isSuperAdmin) {
//                 actions.push({ type: "approve", label: "Approve", icon: <CheckCircle size={14} />, color: "text-green-600" });
//                 actions.push({ type: "reject", label: "Reject", icon: <XCircle size={14} />, color: "text-red-600" });
//             }
//             if (isDestWH || isDestShop || isSuperAdmin) {
//                 actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-600" });
//             }
//         }

//         if (status === "APPROVED") {
//             if (isSourceWH || isSourceShop || isSuperAdmin) {
//                 actions.push({ type: "dispatch", label: "Dispatch", icon: <Truck size={14} />, color: "text-blue-600" });
//             }
//             if (isDestWH || isDestShop || isSuperAdmin) {
//                 actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-600" });
//             }
//         }

//         if (status === "DISPATCHED" || status === "PARTIALLY_RECEIVED") {
//             if (isDestWH || isDestShop || isSuperAdmin) {
//                 actions.push({ type: "receive", label: "Receive", icon: <Package size={14} />, color: "text-green-600" });
//                 actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-600" });
//             }
//         }

//         if (status !== "COMPLETED" && status !== "REJECTED" && status !== "CANCELLED") {
//             if (isDestWH || isDestShop || isSourceWH || isSourceShop || isSuperAdmin) {
//                 if (!actions.find(a => a.type === "cancel")) {
//                     actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-600" });
//                 }
//             }
//         }

//         return actions;
//     };

//     const product = searchResults?.product;
//     const variant = searchResults?.variant;
//     const warehouses = searchResults?.warehouses || [];
//     const shops = searchResults?.shops || [];

//     return (
//         <div className="space-y-5">

//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100 text-gray-700">
//                 <div>
//                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Transfer Requests</h2>
//                     <p className="text-sm text-gray-500 mt-1">
//                         Search stock across locations → Create transfer requests → Track workflow
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2.5">
//                     <button onClick={() => refetch()} className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-1">
//                         <RefreshCw size={14} /> Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Stats Cards */}
//             <div className="grid grid-cols-4 gap-4">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Total Requests</p>
//                     <p className="text-3xl font-bold">{totalRequests}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Pending (REQUESTED)</p>
//                     <p className="text-3xl font-bold">{pendingCount}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Dispatched</p>
//                     <p className="text-3xl font-bold">{dispatchedCount}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Completed</p>
//                     <p className="text-3xl font-bold">{completedCount}</p>
//                 </div>
//             </div>

//             {/* Stock Search Section */}
//             <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 text-gray-700">
//                 <div className="flex items-center gap-2 mb-2">
//                     <Search size={18} className="text-blue-500" />
//                     <h3 className="font-semibold text-gray-800">Stock Search</h3>
//                 </div>
                
//                 <div className="flex gap-3 flex-wrap">
//                     <div className="flex-1 min-w-[150px]">
//                         <label className="block text-xs font-medium text-gray-700 mb-1">Search By</label>
//                         <select 
//                             value={searchParams.searchType} 
//                             onChange={(e) => setSearchParams({ ...searchParams, searchType: e.target.value, searchValue: "" })}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                         >
//                             {SEARCH_TYPES.map(t => (
//                                 <option key={t.value} value={t.value}>{t.label}</option>
//                             ))}
//                         </select>
//                     </div>
//                     <div className="flex-[2]">
//                         <label className="block text-xs font-medium text-gray-700 mb-1">Search Value <span className="text-red-500">*</span></label>
//                         <input
//                             type="text"
//                             value={searchParams.searchValue}
//                             onChange={(e) => setSearchParams({ ...searchParams, searchValue: e.target.value })}
//                             placeholder={SEARCH_TYPES.find(t => t.value === searchParams.searchType)?.placeholder}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                             onKeyPress={(e) => e.key === "Enter" && handleSearch()}
//                         />
//                     </div>
//                 </div>
                
//                 <div className="flex gap-3 flex-wrap items-end">
//                     <div>
//                         <label className="block text-xs font-medium text-gray-700 mb-1">City (Optional)</label>
//                         <input
//                             type="text"
//                             value={searchParams.city}
//                             onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
//                             placeholder="Filter by city"
//                             className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                         />
//                     </div>
//                     <label className="flex items-center gap-2 pb-1 cursor-pointer">
//                         <input
//                             type="checkbox"
//                             checked={searchParams.nearby_only}
//                             onChange={(e) => setSearchParams({ ...searchParams, nearby_only: e.target.checked })}
//                             className="w-4 h-4 text-blue-600 rounded border-gray-300"
//                         />
//                         <span className="text-sm text-gray-700">Nearby only (same city)</span>
//                     </label>
//                     <button
//                         onClick={handleSearch}
//                         disabled={isSearching}
//                         className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
//                     >
//                         <Search size={16} /> {isSearching ? "Searching..." : "Search Stock"}
//                     </button>
//                     {searchResults && (
//                         <button
//                             onClick={() => setSearchResults(null)}
//                             className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
//                         >
//                             Clear Results
//                         </button>
//                     )}
//                 </div>
//                 {searchError && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-600">{searchError}</div>}
//             </div>

//             {/* Search Results */}
//             {searchResults && (
//                 <div className="space-y-4">
//                     <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
//                         <div className="flex items-center justify-between flex-wrap gap-2">
//                             <div>
//                                 <h3 className="font-semibold text-gray-800">{product?.name}</h3>
//                                 <div className="flex gap-3 mt-1 text-xs text-gray-500">
//                                     <span className="font-mono">Code: {product?.product_code}</span>
//                                     <span className="font-mono">SKU: {variant?.sku}</span>
//                                     {variant?.system_barcode && <span className="font-mono">Barcode: {variant?.system_barcode}</span>}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {warehouses.length > 0 && (
//                         <div>
//                             <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Warehouse size={16} /> Warehouses</h4>
//                             <div className="space-y-2">
//                                 {warehouses.map((wh, idx) => (
//                                     <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
//                                         <div className="flex items-center justify-between flex-wrap gap-2">
//                                             <div className="flex items-center gap-3">
//                                                 <Warehouse size={16} className="text-blue-500" />
//                                                 <div>
//                                                     <p className="font-medium text-gray-800">{wh.warehouse_name}</p>
//                                                     <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
//                                                         <span className="flex items-center gap-1"><MapPin size={10} /> {wh.city}</span>
//                                                         <span>Stock: <span className="font-semibold text-gray-700">{wh.stock_quantity} units</span></span>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <div className="flex gap-2">
//                                                 <button
//                                                     onClick={() => handleRequestClick(wh, product, variant, false)}
//                                                     className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
//                                                 >
//                                                     Create Request
//                                                 </button>
//                                                 {/* <button
//                                                     onClick={() => handleRequestClick(wh, product, variant, true)}
//                                                     className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
//                                                 >
//                                                     🚨 Emergency
//                                                 </button> */}
//                                             </div>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     )}

//                     {shops.length > 0 && (
//                         <div>
//                             <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Store size={16} /> Shops</h4>
//                             <div className="space-y-2">
//                                 {shops.map((shop, idx) => (
//                                     <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
//                                         <div className="flex items-center justify-between flex-wrap gap-2">
//                                             <div className="flex items-center gap-3">
//                                                 <Store size={16} className="text-green-500" />
//                                                 <div>
//                                                     <p className="font-medium text-gray-800">{shop.shop_name}</p>
//                                                     <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
//                                                         <span className="flex items-center gap-1"><MapPin size={10} /> {shop.city}</span>
//                                                         <span>Stock: <span className="font-semibold text-gray-700">{shop.stock_quantity} units</span></span>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <div className="flex gap-2">
//                                                 <button
//                                                     onClick={() => handleRequestClick(shop, product, variant, false)}
//                                                     className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
//                                                 >
//                                                     Create Request
//                                                 </button>
//                                                 {/* <button
//                                                     onClick={() => handleRequestClick(shop, product, variant, true)}
//                                                     className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
//                                                 >
//                                                     🚨 Emergency
//                                                 </button> */}
//                                             </div>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     )}

//                     {warehouses.length === 0 && shops.length === 0 && (
//                         <div className="text-center py-8 text-gray-400">No stock found</div>
//                     )}
//                 </div>
//             )}

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-gray-700">
//                 <div className="flex gap-3">
//                     <input
//                         value={search}
//                         onChange={(e) => dispatch(setSearch(e.target.value))}
//                         placeholder="Search by request number or remarks..."
//                         className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
//                     />
//                     <button onClick={() => dispatch(resetFilters())} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
//                         <X size={14} /> Clear
//                     </button>
//                 </div>
//                 <div className="flex gap-3 flex-wrap text-gray-700">
//                     <select value={statusFilter} onChange={(e) => dispatch(setStatusFilter(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
//                         <option value="">All Status</option>
//                         <option value="REQUESTED">REQUESTED</option>
//                         <option value="APPROVED">APPROVED</option>
//                         <option value="REJECTED">REJECTED</option>
//                         <option value="DISPATCHED">DISPATCHED</option>
//                         <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
//                         <option value="COMPLETED">COMPLETED</option>
//                         <option value="CANCELLED">CANCELLED</option>
//                     </select>
//                     <select value={typeFilter} onChange={(e) => dispatch(setTypeFilter(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
//                         <option value="">All Types</option>
//                         <option value="WH_TO_SHOP">WH → Shop</option>
//                         <option value="WH_TO_WH">WH → WH</option>
//                         <option value="SHOP_TO_SHOP">Shop → Shop</option>
//                     </select>
//                     <select value={pageSize} onChange={(e) => dispatch(setPageSize(Number(e.target.value)))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm ml-auto">
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Requests Table */}
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Request #</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Quantity</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">From</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">To</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {(isLoading || isFetching) && (
//                             <tr>
//                                 <td colSpan={9} className="px-4 py-10 text-center">
//                                     <div className="flex justify-center">
//                                         <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//                                     </div>
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && !isFetching && requests.length === 0 && (
//                             <tr>
//                                 <td colSpan={9} className="px-4 py-14 text-center text-gray-400">No transfer requests found</td>
//                             </tr>
//                         )}
//                         {!isLoading && requests.map((req) => {
//                             const actions = getAvailableActions(req, userRole, userWarehouseId, userShopId);
//                             const productName = req.variant?.product?.name || "—";
//                             const fromName = req.from_warehouse?.warehouse_name || req.from_shop?.shop_name || req.from_warehouse_id || req.from_shop_id || "—";
//                             const toName = req.to_warehouse?.warehouse_name || req.to_shop?.shop_name || req.to_warehouse_id || req.to_shop_id || "—";
//                             const isEmergency = req.priority === "HIGH";
//                             const isRejected = req.status === "REJECTED";
//                             const rejectionReason = req.rejection_reason;

//                             return (
//                                 <tr key={req.request_id} className="hover:bg-gray-50 transition-colors">
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-500">{req.request_number}</td>
//                                     <td className="px-4 py-3"><span className="text-xs text-gray-600">{REQUEST_TYPE_LABEL[req.request_type]}</span></td>
//                                     <td className="px-4 py-3">
//                                         <div className="flex items-center gap-2">
//                                             <p className="font-medium text-gray-800 text-sm">{productName}</p>
//                                             {isEmergency && (
//                                                 <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">🚨 EMERGENCY</span>
//                                             )}
//                                         </div>
//                                         <p className="text-xs text-gray-400 font-mono">{req.variant?.sku || req.variant_id?.slice(-8)}</p>
//                                         {isRejected && rejectionReason && (
//                                             <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
//                                                 <XCircle size={10} /> Rejected: {rejectionReason?.slice(0, 30)}...
//                                             </p>
//                                         )}
//                                     </td>
//                                     <td className="px-4 py-3 text-right font-semibold text-gray-800">{req.quantity}</td>
//                                     <td className="px-4 py-3 text-xs text-gray-600">{fromName}</td>
//                                     <td className="px-4 py-3 text-xs text-gray-600">{toName}</td>
//                                     <td className="px-4 py-3">
//                                         <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
//                                             {req.status?.replace(/_/g, " ")}
//                                         </span>
//                                     </td>
//                                     <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(req.created_at)}</td>
//                                     <td className="px-4 py-3 text-center">
//                                         <div className="flex items-center justify-center gap-1 flex-wrap">
//                                             {actions.map((action) => (
//                                                 <button
//                                                     key={action.type}
//                                                     onClick={() => handleAction(req, action.type)}
//                                                     className={`p-1.5 ${action.color} hover:bg-gray-100 rounded-lg transition-colors`}
//                                                     title={action.label}
//                                                 >
//                                                     {action.icon}
//                                                 </button>
//                                             ))}
//                                         </div>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Pagination */}
//             {meta.totalPages > 1 && (
//                 <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//                     <p className="text-sm text-gray-500">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}</p>
//                     <div className="flex gap-2">
//                         <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
//                         <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
//                         <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
//                     </div>
//                 </div>
//             )}

//             {/* Modals */}
//             <RequestActionModals onSuccess={() => refetch()} />
//             <CreateFromSearchModal onSuccess={() => {
//                 refetch();
//                 setSearchResults(null);
//             }} initialIsEmergency={false} />
//             <ViewRequestModal onSuccess={() => refetch()} />
//         </div>
//     );
// }