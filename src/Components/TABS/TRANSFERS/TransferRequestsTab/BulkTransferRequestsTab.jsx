// TABS/TRANSFERS/BulkTransferRequestsTab.jsx
// 
// Complete Bulk Transfer Requests - Create, Approve, Dispatch, Receive
// FIXED: Fetch details for view, dispatch, receive actions

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Plus, RefreshCw, Package, Truck, CheckCircle, XCircle, Ban, Eye, ClipboardList } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { useGetShopsQuery, useGetMyShopQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { useLazyGetWarehouseStockCatalogQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopWarehouseCatalog_api/shopWarehouseCatalogApi";
import { useLazyGetPeerStockCatalogQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/WarehousePeerCatalog_api/warehousePeerCatalogApi";
import VariantCatalogPicker from "./TransferRequestShared/VariantCatalogPicker";
import { useGetBulkTransferRequestsQuery, useCreateBulkTransferRequestMutation, useLazyGetBulkTransferRequestByIdQuery, generateBulkIdempotencyKey } from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferApi";
import {
    setStatusFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openCreateModal,
    openCreateModalWithPrefill,
    closeCreateModal,
    updateCreateForm,
    clearBulkItems,
    setCreateErrors,
    openApproveModal,
    openRejectModal,
    openDispatchModal,
    openReceiveModal,
    openCancelModal,
    openViewModal,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferSlice";
import BulkActionModals from "./BulkActionModals";
import { CURRENT_USER } from "../../../roles";

const STATUS_BADGE = {
    REQUESTED: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
    REJECTED: "bg-red-50 text-red-600 border border-red-200",
    DISPATCHED: "bg-purple-50 text-purple-700 border border-purple-200",
    PARTIALLY_RECEIVED: "bg-orange-50 text-orange-700 border border-orange-200",
    COMPLETED: "bg-green-50 text-green-700 border border-green-200",
    CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
};

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function BulkTransferRequestsTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { statusFilter, currentPage, pageSize, showCreateModal, createForm, createErrors } = useSelector((state) => state.bulkTransfer);
    
    const [catalogMode, setCatalogMode] = useState("all");
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogSelection, setCatalogSelection] = useState({});
    
    const userShopId = user?.shop_id || "";
    const userWarehouseId = user?.warehouse_id || "";
    const userRole = user?.role || "";
    const isWarehouseStaff = userRole === "WH_MANAGER" || userRole === "WH_STOCK_LISTER";
    const isWhBulkFlow = isWarehouseStaff && !!userWarehouseId;
    // const isShopOwnerFlow = userRole === "SHOP_OWNER" && !!userShopId;
    const isShopOwnerFlow = (userRole === "SHOP_OWNER" || userRole === "SHOP_MANAGER") && !!userShopId;
    const canCreateBulk =
        userRole === "SUPER_ADMIN" || isShopOwnerFlow || isWhBulkFlow;
    
    const { data: warehousesData } = useGetWarehousesQuery(
        { page: 1, limit: 50, is_active: "true" },
        { skip: !showCreateModal && !canCreateBulk }
    );
    const { data: shopsData } = useGetShopsQuery(
        { page: 1, limit: 50, is_active: "true" },
        { skip: !showCreateModal || isShopOwnerFlow }
    );
    const { data: myShopData } = useGetMyShopQuery(undefined, { skip: !isShopOwnerFlow });
    const catalogShopId = createForm.to_shop_id || userShopId;
    const [fetchShopCatalog, { data: shopCatalogData, isFetching: shopCatalogLoading }] =
        useLazyGetWarehouseStockCatalogQuery();
    const [fetchPeerCatalog, { data: peerCatalogData, isFetching: peerCatalogLoading }] =
        useLazyGetPeerStockCatalogQuery();
    const catalogData = isWhBulkFlow ? peerCatalogData : shopCatalogData;
    const catalogLoading = isWhBulkFlow ? peerCatalogLoading : shopCatalogLoading;
    const { data: bulkRequestsData, isLoading, refetch } = useGetBulkTransferRequestsQuery({
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        ...(userShopId ? { to_shop_id: userShopId } : {}),
    });
    
    const [createBulkRequest] = useCreateBulkTransferRequestMutation();
    const [fetchBulkRequestDetail] = useLazyGetBulkTransferRequestByIdQuery();
    
    const warehouses = warehousesData?.warehouses || [];
    const peerWarehouses = warehouses.filter((w) => w.warehouse_id !== userWarehouseId);
    const shops = shopsData?.shops || [];
    const myWarehouseLabel = useMemo(() => {
        const mine = warehouses.find((w) => w.warehouse_id === userWarehouseId);
        return mine ? `${mine.warehouse_name} — ${mine.city}` : "Your warehouse";
    }, [warehouses, userWarehouseId]);
    const myShopLabel = useMemo(() => {
        if (myShopData?.shop_name) {
            return `${myShopData.shop_name}${myShopData.city ? ` — ${myShopData.city}` : ""}`;
        }
        const match = shops.find((s) => s.shop_id === (createForm.to_shop_id || userShopId));
        if (match) return `${match.shop_name} — ${match.city}`;
        return userShopId ? "Your shop" : "";
    }, [shops, myShopData, createForm.to_shop_id, userShopId]);
    const requests = bulkRequestsData?.requests || [];
    const meta = bulkRequestsData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    useEffect(() => {
        if (!showCreateModal) {
            setCatalogSelection({});
            return;
        }
        const sel = {};
        for (const item of createForm.items || []) {
            sel[item.variant_id] = {
                selected: true,
                quantity: String(item.quantity || ""),
                product_name: item.product_name,
                sku: item.sku,
                product_code: item.product_code,
                available_stock: item.available_stock,
            };
        }
        setCatalogSelection(sel);
    }, [showCreateModal]);

    const catalogProducts = useMemo(() => {
        const products = catalogData?.products || [];
        if (!isWhBulkFlow) return products;
        return products.map((p) => ({
            ...p,
            variants: (p.variants || []).map((v) => ({
                ...v,
                shop_available: v.dest_available,
            })),
        }));
    }, [catalogData, isWhBulkFlow]);

    useEffect(() => {
        if (!showCreateModal || !createForm.from_warehouse_id) return;
        if (isWhBulkFlow && userWarehouseId) {
            fetchPeerCatalog({
                destWarehouseId: userWarehouseId,
                from_warehouse_id: createForm.from_warehouse_id,
                mode: catalogMode,
                search: catalogSearch.trim(),
                page: 1,
                limit: 100,
            });
        } else if (catalogShopId) {
            fetchShopCatalog({
                shopId: catalogShopId,
                warehouse_id: createForm.from_warehouse_id,
                mode: catalogMode,
                search: catalogSearch.trim(),
                page: 1,
                limit: 100,
            });
        }
    }, [
        showCreateModal,
        createForm.from_warehouse_id,
        catalogShopId,
        catalogMode,
        catalogSearch,
        isWhBulkFlow,
        userWarehouseId,
        fetchPeerCatalog,
        fetchShopCatalog,
    ]);

    const selectedCatalogItems = useMemo(
        () =>
            Object.entries(catalogSelection)
                .filter(([, s]) => s.selected)
                .map(([variantId, s]) => ({
                    variant_id: variantId,
                    product_name: s.product_name,
                    sku: s.sku,
                    product_code: s.product_code,
                    quantity: s.quantity,
                    available_stock: s.available_stock,
                })),
        [catalogSelection]
    );

    const handleCatalogSelectionChange = (variantId, patch) => {
        setCatalogSelection((prev) => ({
            ...prev,
            [variantId]: { ...prev[variantId], ...patch },
        }));
    };

    const handleSelectAllProduct = (product, selectAll) => {
        setCatalogSelection((prev) => {
            const next = { ...prev };
            for (const v of product.variants || []) {
                if (!v.selectable) continue;
                if (selectAll) {
                    next[v.variant_id] = {
                        selected: true,
                        quantity: String(v.suggested_quantity || Math.min(1, v.warehouse_available)),
                        product_name: product.name,
                        sku: v.sku,
                        product_code: v.product_code,
                        available_stock: v.warehouse_available,
                    };
                } else {
                    next[v.variant_id] = { ...next[v.variant_id], selected: false };
                }
            }
            return next;
        });
    };
    
    // Get available actions based on user role and request status
    const getAvailableActions = (request) => {
        const actions = [];
        const status = request.status;
        
        const requestFromWarehouseId = request.from_warehouse?.warehouse_id || request.from_warehouse_id;
        const requestToShopId = request.to_shop?.shop_id || request.to_shop_id;
        const requestToWarehouseId = request.to_warehouse?.warehouse_id || request.to_warehouse_id;
        
        const isSourceWH = userWarehouseId && (requestFromWarehouseId === userWarehouseId);
        const isDestWH = userWarehouseId && (requestToWarehouseId === userWarehouseId);
        const isDestShop = userShopId && (requestToShopId === userShopId);
        const isSuperAdmin = userRole === "SUPER_ADMIN";
        
        // View details - always available
        actions.push({ type: "view", label: "View Details", icon: <Eye size={14} />, color: "text-gray-500" });
        
        if (status === "REQUESTED") {
            if (isSourceWH || isSuperAdmin) {
                actions.push({ type: "approve", label: "Approve", icon: <CheckCircle size={14} />, color: "text-green-600" });
                actions.push({ type: "reject", label: "Reject", icon: <XCircle size={14} />, color: "text-red-600" });
            }
            if (isDestShop || isDestWH || isSuperAdmin) {
                actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-600" });
            }
        }
        
        if (status === "APPROVED") {
            if (isSourceWH || isSuperAdmin) {
                actions.push({ type: "dispatch", label: "Dispatch", icon: <Truck size={14} />, color: "text-blue-600" });
            }
            if (isDestShop || isDestWH || isSuperAdmin) {
                actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-gray-600" });
            }
        }
        
        if (status === "DISPATCHED" || status === "PARTIALLY_RECEIVED") {
            if (isDestShop || isDestWH || isSuperAdmin) {
                actions.push({ type: "receive", label: "Receive", icon: <Package size={14} />, color: "text-green-600" });
            }
        }
        
        return actions;
    };
    
    // FIXED: Handle all actions that need full details
    const handleAction = async (request, actionType) => {
        // Actions that need full details from detail API
        const needsDetail = ["view", "dispatch", "receive", "approve", "reject"].includes(actionType);
        
        if (needsDetail) {
            try {
                const fullRequest = await fetchBulkRequestDetail(request.bulk_request_id).unwrap();
                
                if (actionType === "view") {
                    dispatch(openViewModal(fullRequest));
                } else if (actionType === "approve") {
                    dispatch(openApproveModal(fullRequest));
                } else if (actionType === "reject") {
                    dispatch(openRejectModal(fullRequest));
                } else if (actionType === "dispatch") {
                    dispatch(openDispatchModal(fullRequest));
                } else if (actionType === "receive") {
                    dispatch(openReceiveModal(fullRequest));
                }
            } catch (err) {
                toast.error("Failed to load request details");
            }
        } else if (actionType === "cancel") {
            // Cancel doesn't need items, list data is enough
            dispatch(openCancelModal(request));
        }
    };
    
    const validateCreate = () => {
        const errors = {};
        if (!createForm.from_warehouse_id) errors.from_warehouse_id = "Source warehouse is required";
        if (isWhBulkFlow) {
            if (!userWarehouseId) errors.to_warehouse_id = "Your warehouse is required";
        } else if (!createForm.to_shop_id) {
            errors.to_shop_id = "Destination shop is required";
        }
        if (selectedCatalogItems.length === 0) errors.items = "At least one variant is required";
        return errors;
    };
    
    const handleCreateSubmit = async () => {
        const errors = validateCreate();
        if (Object.keys(errors).length > 0) {
            dispatch(setCreateErrors(errors));
            toast.error("Please fix the errors");
            return;
        }
        
        const invalidItems = selectedCatalogItems.filter(
            (item) =>
                !item.quantity ||
                parseInt(item.quantity, 10) <= 0 ||
                parseInt(item.quantity, 10) > (item.available_stock ?? 0)
        );
        if (invalidItems.length > 0) {
            toast.error("Please enter valid quantity for all selected variants (within warehouse stock)");
            return;
        }
        
        try {
            const payload = isWhBulkFlow
                ? {
                      request_type: "WH_TO_WH",
                      from_warehouse_id: createForm.from_warehouse_id,
                      to_warehouse_id: userWarehouseId,
                      request_remarks: createForm.request_remarks?.trim() || null,
                      items: selectedCatalogItems.map((item) => ({
                          variant_id: item.variant_id,
                          quantity: parseInt(item.quantity, 10),
                      })),
                  }
                : {
                      to_shop_id: createForm.to_shop_id,
                      from_warehouse_id: createForm.from_warehouse_id,
                      request_type: "WH_TO_SHOP",
                      request_remarks: createForm.request_remarks?.trim() || null,
                      items: selectedCatalogItems.map((item) => ({
                          variant_id: item.variant_id,
                          quantity: parseInt(item.quantity, 10),
                      })),
                  };
            
            await createBulkRequest({ idempotencyKey: generateBulkIdempotencyKey(), ...payload }).unwrap();
            toast.success("Bulk transfer request created successfully");
            dispatch(closeCreateModal());
            dispatch(clearBulkItems());
            refetch();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const be = {};
                err.data.errors.forEach(({ field, message }) => { be[field] = message; });
                dispatch(setCreateErrors(be));
            } else {
                toast.error(err?.data?.message || "Failed to create bulk request");
            }
        }
    };
    
    const inputCls = (name, errors) => `w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 ${errors?.[name] ? "border-red-400" : "border-gray-200"}`;
    
    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                        <ClipboardList size={20} className="text-gray-400" />
                        Bulk Transfer Requests
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {isWhBulkFlow
                            ? "WH → WH bulk requests — or use Request from WH tab. Approve/dispatch when you are the source warehouse."
                            : "WH → Shop bulk — Request → Approve → Dispatch → Receive → Complete"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canCreateBulk && (
                    <button
                        onClick={() => {
                            if (isWhBulkFlow) {
                                dispatch(openCreateModalWithPrefill({ to_warehouse_id: userWarehouseId }));
                            } else if (userShopId) {
                                dispatch(openCreateModalWithPrefill({ to_shop_id: userShopId }));
                            } else {
                                dispatch(openCreateModal());
                            }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        <Plus size={14} /> New Bulk Request
                    </button>
                    )}
                    <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Requests</p>
                    <p className="text-3xl font-bold text-gray-800">{meta.total}</p>
                </div>
                <div className="bg-white rounded-xl border border-yellow-100 p-4">
                    <p className="text-xs text-yellow-500 uppercase tracking-wide mb-1">Pending</p>
                    <p className="text-3xl font-bold text-yellow-600">{requests.filter(r => r.status === "REQUESTED").length}</p>
                </div>
                <div className="bg-white rounded-xl border border-purple-100 p-4">
                    <p className="text-xs text-purple-400 uppercase tracking-wide mb-1">Dispatched</p>
                    <p className="text-3xl font-bold text-purple-600">{requests.filter(r => r.status === "DISPATCHED" || r.status === "PARTIALLY_RECEIVED").length}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-100 p-4">
                    <p className="text-xs text-green-500 uppercase tracking-wide mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{requests.filter(r => r.status === "COMPLETED").length}</p>
                </div>
            </div>
            
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                    <select value={statusFilter} onChange={(e) => dispatch(setStatusFilter(e.target.value))} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 w-48 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer">
                        <option value="">All Status</option>
                        <option value="REQUESTED">REQUESTED</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="DISPATCHED">DISPATCHED</option>
                        <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="CANCELLED">CANCELLED</option>
                    </select>
                    <select value={pageSize} onChange={(e) => dispatch(setPageSize(Number(e.target.value)))} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 ml-auto focus:outline-none focus:ring-2 focus:ring-gray-300">
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>
            
            {/* Requests Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bulk Transfer Requests</span>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{meta.total} records</span>
                </div>
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Request #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">From WH</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">To</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Items</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(isLoading) && (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    </div>
                                </td>
                            </tr>
                        )}
                        {!isLoading && requests.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-14 text-center text-gray-400 text-sm">No bulk transfer requests found</td>
                            </tr>
                        )}
                        {!isLoading && requests.map((req) => {
                            const totalQty = req.total_quantity || 0;
                            const actions = getAvailableActions(req);
                            
                            return (
                                <tr key={req.bulk_request_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                                            {req.bulk_request_number}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{req.from_warehouse?.warehouse_name || req.from_warehouse_id}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {req.request_type === "WH_TO_WH"
                                            ? req.to_warehouse?.warehouse_name || req.to_warehouse_id
                                            : req.to_shop?.shop_name || req.to_shop_id}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500">{req.items_count || 0}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{totalQty}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                                            {req.status?.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(req.requested_at || req.created_at)}</td>
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
                        <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Previous</button>
                        <span className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">{currentPage} / {meta.totalPages}</span>
                        <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
                    </div>
                </div>
            )}
            
            {/* Create Bulk Request Modal - Keep existing */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                    <div className="relative bg-white rounded-xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Create Bulk Transfer Request</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {isWhBulkFlow
                                        ? "Request stock from a peer warehouse to your warehouse"
                                        : isShopOwnerFlow
                                          ? "Request stock from a warehouse to your shop (destination fixed)"
                                          : "Warehouse → shop: add multiple variants in one request"}
                                </p>
                            </div>
                            <button onClick={() => dispatch(closeCreateModal())} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {isWhBulkFlow ? (
                                    <>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Destination (your warehouse)</label>
                                            <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
                                                {myWarehouseLabel}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Source warehouse <span className="text-red-400">*</span></label>
                                            <select
                                                value={createForm.from_warehouse_id}
                                                onChange={(e) => {
                                                    dispatch(updateCreateForm({ from_warehouse_id: e.target.value, items: [] }));
                                                    setCatalogSelection({});
                                                }}
                                                className={inputCls("from_warehouse_id", createErrors)}
                                            >
                                                <option value="">Select peer warehouse</option>
                                                {peerWarehouses.map((w) => (
                                                    <option key={w.warehouse_id} value={w.warehouse_id}>
                                                        {w.warehouse_name} — {w.city}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Source Warehouse <span className="text-red-400">*</span></label>
                                            <select
                                                value={createForm.from_warehouse_id}
                                                onChange={(e) => {
                                                    dispatch(updateCreateForm({ from_warehouse_id: e.target.value, items: [] }));
                                                    setCatalogSelection({});
                                                }}
                                                className={inputCls("from_warehouse_id", createErrors)}
                                            >
                                                <option value="">Select warehouse</option>
                                                {warehouses.map((w) => (
                                                    <option key={w.warehouse_id} value={w.warehouse_id}>
                                                        {w.warehouse_name} — {w.city}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Destination Shop <span className="text-red-400">*</span></label>
                                            {isShopOwnerFlow ? (
                                                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
                                                    {myShopLabel || "Your shop"}
                                                </div>
                                            ) : (
                                                <select
                                                    value={createForm.to_shop_id}
                                                    onChange={(e) => dispatch(updateCreateForm({ to_shop_id: e.target.value }))}
                                                    className={inputCls("to_shop_id", createErrors)}
                                                >
                                                    <option value="">Select shop</option>
                                                    {shops.map((s) => (
                                                        <option key={s.shop_id} value={s.shop_id}>
                                                            {s.shop_name} — {s.city}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {createForm.from_warehouse_id && (isWhBulkFlow ? userWarehouseId : catalogShopId) && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Catalog mode</label>
                                            <select
                                                value={catalogMode}
                                                onChange={(e) => {
                                                    setCatalogMode(e.target.value);
                                                    setCatalogSelection({});
                                                }}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            >
                                                <option value="all">All with WH stock</option>
                                                <option value="existing">Existing at shop</option>
                                                <option value="new">New at shop</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Search</label>
                                            <input
                                                type="text"
                                                value={catalogSearch}
                                                onChange={(e) => setCatalogSearch(e.target.value)}
                                                placeholder="Name, code, SKU..."
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <VariantCatalogPicker
                                        products={catalogProducts}
                                        selection={catalogSelection}
                                        onSelectionChange={handleCatalogSelectionChange}
                                        onSelectAllProduct={handleSelectAllProduct}
                                        isLoading={catalogLoading}
                                        emptyMessage="No products in catalog for this warehouse and mode."
                                    />
                                    {createErrors.items && (
                                        <p className="text-xs text-red-500">{createErrors.items}</p>
                                    )}
                                    {selectedCatalogItems.length > 0 && (
                                        <p className="text-xs text-gray-500">
                                            {selectedCatalogItems.length} variant(s) selected for this request
                                        </p>
                                    )}
                                </div>
                            )}
                            {createForm.from_warehouse_id && !catalogShopId && (
                                <p className="text-xs text-amber-600">Select destination shop to load variant catalog.</p>
                            )}
                            
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Remarks</label>
                                <textarea 
                                    value={createForm.request_remarks} 
                                    onChange={(e) => dispatch(updateCreateForm({ request_remarks: e.target.value }))} 
                                    rows={2} 
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300" 
                                    placeholder="Monthly restock notes" 
                                />
                            </div>
                        </div>
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
                            <button onClick={() => dispatch(closeCreateModal())} className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                            <button 
                                onClick={handleCreateSubmit} 
                                disabled={selectedCatalogItems.length === 0} 
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                Create Bulk Request
                            </button>
                        </div>
                    </div>
    </div>
</div>
            )}
            
            {/* Action Modals */}
            <BulkActionModals onSuccess={() => refetch()} />
        </div>
    );
}