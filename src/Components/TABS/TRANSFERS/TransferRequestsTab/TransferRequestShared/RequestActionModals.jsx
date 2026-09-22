// TABS/TRANSFERS/TransferRequestShared/RequestActionModals.jsx
// 
// FIXED: Moved all useState hooks to top level to prevent hook order issues

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "../../../../shared/ToastConfig";
import { useGetWarehousesQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { useGetShopsQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { useGetProductStocksQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockApi";
import {
    useCreateTransferRequestMutation,
    useCreateEmergencyTransferRequestMutation,
    useApproveTransferRequestMutation,
    useRejectTransferRequestMutation,
    useDispatchTransferRequestMutation,
    useReceiveTransferRequestMutation,
    useCancelTransferRequestMutation,
    generateIdempotencyKey,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
import {
    closeCreateModal,
    updateCreateForm,
    setCreateErrors,
    clearCreateErrors,
    closeApproveRejectModal,
    setRejectReason,
    setTransferBillType,
    closeDispatchModal,
    setTrackingNumber,
    setExpectedDelivery,
    closeReceiveModal,
    setReceivedQuantity,
    setReceiveRemarks,
    closeCancelModal,
    setCancelReason,
    setActionErrors,
    clearActionErrors,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestSlice";
import { getApiErrorMessage } from "../../../../../utils/apiErrorMessage";
import { TRANSFER_BILL_TYPES } from "../../../../../constants/transferBillTypes";
import { CURRENT_USER, isAdmin } from "../../../../roles";

/**
 * Align with backend commercial bill gate (WH→shop / shop→shop to OWNER|FRANCHISE).
 * When to_shop.shop_type is missing on the list row, still treat shop-dest transfers
 * as commercial so approve always sends transfer_bill_type (avoids backend 400).
 */
const requiresTransferBillType = (req) => {
    if (!req) return false;
    if (req.is_franchise_transfer) return true;
    const type = req.request_type;
    if (type !== "WH_TO_SHOP" && type !== "SHOP_TO_SHOP") return false;
    const destType = req.to_shop?.shop_type;
    if (destType === "FRANCHISE" || destType === "OWNER") return true;
    // Incomplete list payload: destination shop id present → commercial bill path on backend
    if (!destType && req.to_shop_id) return true;
    return false;
};

const resolveApproveBillType = (billType) =>
    billType || TRANSFER_BILL_TYPES.NON_GST;

export default function RequestActionModals({ onSuccess }) {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const {
        showCreateModal,
        showApproveRejectModal,
        showDispatchModal,
        showReceiveModal,
        showCancelModal,
        selectedRequest,
        createForm,
        createErrors,
        rejectReason,
        transferBillType,
        trackingNumber,
        expectedDelivery,
        receivedQuantity,
        receiveRemarks,
        cancelReason,
        actionErrors,
    } = useSelector((state) => state.transferRequest);

    // ✅ ALL HOOKS AT TOP LEVEL - never inside conditionals
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEmergency, setIsEmergency] = useState(false);
    const [approveRejectAction, setApproveRejectAction] = useState("approve"); // Moved from conditional

    const { data: warehousesData } = useGetWarehousesQuery({ page: 1, limit: 50, is_active: "true" });
    const { data: shopsData } = useGetShopsQuery({ page: 1, limit: 100, is_active: "true" });
    const { data: stocksData } = useGetProductStocksQuery({ page: 1, limit: 100 });

    const warehouses = warehousesData?.warehouses || [];
    const shops = shopsData?.shops || [];
    const stocks = stocksData?.stocks || [];

    const userWarehouseId = user?.warehouse_id || "";
    const userShopId = user?.shop_id || "";
    const isShopOwner = user?.role === "SHOP_OWNER";
    const isShopManager = user?.role === "SHOP_MANAGER";
    const isWHManager = ["WH_MANAGER", "WH_STOCK_LISTER"].includes(user?.role);

    const [createRequest] = useCreateTransferRequestMutation();
    const [createEmergencyRequest] = useCreateEmergencyTransferRequestMutation();
    const [approveRequest] = useApproveTransferRequestMutation();
    const [rejectRequest] = useRejectTransferRequestMutation();
    const [dispatchRequest] = useDispatchTransferRequestMutation();
    const [receiveRequest] = useReceiveTransferRequestMutation();
    const [cancelRequest] = useCancelTransferRequestMutation();

    const getAvailableRequestTypes = () => {
        if (isShopOwner) {
            return [
                { value: "WH_TO_SHOP", label: "Warehouse → My Shop" },
                { value: "SHOP_TO_SHOP", label: "Other Shop → My Shop" }
            ];
        }
        if (isWHManager) {
            return [
                { value: "WH_TO_SHOP", label: "Warehouse → Shop" },
                { value: "WH_TO_WH", label: "Warehouse → Warehouse" }
            ];
        }
        return [
            { value: "WH_TO_SHOP", label: "Warehouse → Shop" },
            { value: "WH_TO_WH", label: "Warehouse → Warehouse" },
            { value: "SHOP_TO_SHOP", label: "Shop → Shop" }
        ];
    };

    const availableRequestTypes = getAvailableRequestTypes();

    React.useEffect(() => {
        if (showCreateModal && isShopOwner && userShopId) {
            dispatch(updateCreateForm({
                from_shop_id: userShopId,
                request_type: "SHOP_TO_SHOP"
            }));
        }
    }, [showCreateModal, isShopOwner, userShopId]);

    const getAvailableVariants = () => {
        if (createForm.request_type === "WH_TO_SHOP" || createForm.request_type === "WH_TO_WH") {
            const warehouseId = createForm.from_warehouse_id;
            if (!warehouseId) return [];
            return stocks.filter(s => s.warehouse_id === warehouseId && s.quantity > 0);
        }
        return [];
    };

    const validateCreate = () => {
        const errors = {};
        if (!createForm.request_type) errors.request_type = "Request type is required";
        if (createForm.request_type === "WH_TO_SHOP") {
            if (!createForm.from_warehouse_id) errors.from_warehouse_id = "Source warehouse is required";
            if (!createForm.to_shop_id) errors.to_shop_id = "Destination shop is required";
        } else if (createForm.request_type === "WH_TO_WH") {
            if (!createForm.from_warehouse_id) errors.from_warehouse_id = "Source warehouse is required";
            if (!createForm.to_warehouse_id) errors.to_warehouse_id = "Destination warehouse is required";
            if (createForm.from_warehouse_id === createForm.to_warehouse_id) errors.to_warehouse_id = "Source and destination cannot be the same";
        } else if (createForm.request_type === "SHOP_TO_SHOP") {
            if (!createForm.from_shop_id) errors.from_shop_id = "Source shop is required";
            if (!createForm.to_shop_id) errors.to_shop_id = "Destination shop is required";
            if (createForm.from_shop_id === createForm.to_shop_id) errors.to_shop_id = "Source and destination cannot be the same";
        }
        if (!createForm.variant_id) errors.variant_id = "Product is required";
        if (!createForm.quantity || createForm.quantity <= 0) errors.quantity = "Valid quantity is required";
        return errors;
    };

    const handleCreateSubmit = async () => {
        const errors = validateCreate();
        if (Object.keys(errors).length > 0) {
            dispatch(setCreateErrors(errors));
            toast.error("Please fix the errors");
            return;
        }

        setIsSubmitting(true);
        dispatch(clearCreateErrors());

        try {
            const payload = {
                request_type: createForm.request_type,
                quantity: parseInt(createForm.quantity),
                variant_id: createForm.variant_id,
                request_remarks: createForm.request_remarks?.trim() || null,
            };

            if (isEmergency) {
                payload.priority = createForm.priority || "HIGH";
                if (createForm.expected_delivery) {
                    payload.expected_delivery = new Date(createForm.expected_delivery).toISOString();
                }
            }

            if (createForm.request_type === "WH_TO_SHOP") {
                payload.from_warehouse_id = createForm.from_warehouse_id;
                payload.to_shop_id = createForm.to_shop_id;
            } else if (createForm.request_type === "WH_TO_WH") {
                payload.from_warehouse_id = createForm.from_warehouse_id;
                payload.to_warehouse_id = createForm.to_warehouse_id;
            } else if (createForm.request_type === "SHOP_TO_SHOP") {
                payload.from_shop_id = createForm.from_shop_id;
                payload.to_shop_id = createForm.to_shop_id;
            }

            const mutation = isEmergency ? createEmergencyRequest : createRequest;
            await mutation({ idempotencyKey: generateIdempotencyKey(), ...payload }).unwrap();
            
            toast.success(isEmergency ? "Emergency transfer request created" : "Transfer request created successfully");
            dispatch(closeCreateModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const be = {};
                err.data.errors.forEach(({ field, message }) => { be[field] = message; });
                dispatch(setCreateErrors(be));
            } else {
                toast.error(err?.data?.message || "Failed to create request");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // APPROVE / REJECT / DISPATCH / RECEIVE / CANCEL handlers
    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            const needsBillType = requiresTransferBillType(selectedRequest);
            const billType = resolveApproveBillType(transferBillType);

            await approveRequest({
                requestId: selectedRequest.request_id,
                ...(needsBillType ? { transfer_bill_type: billType } : {}),
                idempotencyKey: generateIdempotencyKey(),
            }).unwrap();
            toast.success(
                needsBillType ? "Request approved — transfer bill generated" : "Request approved successfully"
            );
            dispatch(closeApproveRejectModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(getApiErrorMessage(err) || "Failed to approve");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason?.trim()) {
            dispatch(setActionErrors({ reject_reason: "Rejection reason is required" }));
            return;
        }
        setIsSubmitting(true);
        try {
            await rejectRequest({ requestId: selectedRequest.request_id, rejection_reason: rejectReason, idempotencyKey: generateIdempotencyKey() }).unwrap();
            toast.success("Request rejected");
            dispatch(closeApproveRejectModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to reject");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDispatch = async () => {
        setIsSubmitting(true);
        try {
            await dispatchRequest({
                requestId: selectedRequest.request_id,
                tracking_number: trackingNumber?.trim() || null,
                expected_delivery: expectedDelivery || null,
                idempotencyKey: generateIdempotencyKey(),
            }).unwrap();
            toast.success("Goods dispatched successfully");
            dispatch(closeDispatchModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to dispatch");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReceive = async () => {
        const remaining =
            (selectedRequest?.approved_quantity ?? selectedRequest?.quantity ?? 0) -
            (selectedRequest?.received_quantity || 0);
        // Receive confirms full remaining qty only — no partial qty edit in UI.
        const qty = remaining;

        if (!Number.isInteger(qty) || qty <= 0) {
            dispatch(setActionErrors({ received_quantity: "Nothing left to receive" }));
            toast.error("Nothing left to receive.");
            return;
        }
        setIsSubmitting(true);
        try {
            await receiveRequest({
                requestId: selectedRequest.request_id,
                received_quantity: qty,
                receive_remarks: receiveRemarks?.trim() || undefined,
                idempotencyKey: generateIdempotencyKey(),
            }).unwrap();
            toast.success(`Received ${qty} units successfully`);
            dispatch(closeReceiveModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to receive goods. Please try again."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason?.trim()) {
            dispatch(setActionErrors({ cancel_reason: "Cancellation reason is required" }));
            return;
        }
        setIsSubmitting(true);
        try {
            await cancelRequest({
                requestId: selectedRequest.request_id,
                cancel_reason: cancelReason,
                idempotencyKey: generateIdempotencyKey(),
            }).unwrap();
            toast.success("Request cancelled");
            dispatch(closeCancelModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to cancel");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputCls = (name, errors) => `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors?.[name] ? "border-red-400" : "border-gray-300"}`;

    // ─────────────────────────────────────────────────────────────
    // CREATE MODAL RENDER
    // ─────────────────────────────────────────────────────────────
    if (showCreateModal) {
        const availableVariants = getAvailableVariants();
        const selectedVariant = stocks.find(s => s.variant_id === createForm.variant_id);

        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto text-gray-700">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">
                                {isEmergency ? "🚨 Emergency Transfer Request" : "New Transfer Request"}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {isEmergency ? "High priority — immediate approval required" : "Request stock from another location"}
                            </p>
                        </div>
                        <button onClick={() => dispatch(closeCreateModal())} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Emergency Toggle */}
                        <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-yellow-800">🚨 Emergency Request</p>
                                <p className="text-xs text-yellow-600">Priority: HIGH, faster approval</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isEmergency}
                                    onChange={(e) => setIsEmergency(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Request Type <span className="text-red-500">*</span></label>
                            <select value={createForm.request_type} onChange={(e) => dispatch(updateCreateForm({ request_type: e.target.value, variant_id: "", from_warehouse_id: "", to_shop_id: "", from_shop_id: "", to_warehouse_id: "" }))} className={inputCls("request_type", createErrors)}>
                                {availableRequestTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {isEmergency && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Priority <span className="text-red-500">*</span></label>
                                    <select value={createForm.priority} onChange={(e) => dispatch(updateCreateForm({ priority: e.target.value }))} className={inputCls("priority", createErrors)}>
                                        <option value="HIGH">🔴 HIGH — Emergency</option>
                                        <option value="NORMAL">🟢 NORMAL — Regular</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                                    <input type="datetime-local" value={createForm.expected_delivery} onChange={(e) => dispatch(updateCreateForm({ expected_delivery: e.target.value }))} className={inputCls("expected_delivery", createErrors)} />
                                </div>
                            </>
                        )}

                        {createForm.request_type === "WH_TO_SHOP" && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Source Warehouse <span className="text-red-500">*</span></label>
                                    <select value={createForm.from_warehouse_id} onChange={(e) => dispatch(updateCreateForm({ from_warehouse_id: e.target.value, variant_id: "" }))} className={inputCls("from_warehouse_id", createErrors)}>
                                        <option value="">Select warehouse</option>
                                        {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name} — {w.city}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Destination Shop <span className="text-red-500">*</span></label>
                                    <select value={createForm.to_shop_id} onChange={(e) => dispatch(updateCreateForm({ to_shop_id: e.target.value }))} className={inputCls("to_shop_id", createErrors)}>
                                        <option value="">Select shop</option>
                                        {shops.filter(s => !isShopOwner || s.shop_id !== userShopId).map(s => <option key={s.shop_id} value={s.shop_id}>{s.shop_name} — {s.city}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        {createForm.request_type === "WH_TO_WH" && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Source Warehouse <span className="text-red-500">*</span></label>
                                    <select value={createForm.from_warehouse_id} onChange={(e) => dispatch(updateCreateForm({ from_warehouse_id: e.target.value, variant_id: "" }))} className={inputCls("from_warehouse_id", createErrors)}>
                                        <option value="">Select warehouse</option>
                                        {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name} — {w.city}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Destination Warehouse <span className="text-red-500">*</span></label>
                                    <select value={createForm.to_warehouse_id} onChange={(e) => dispatch(updateCreateForm({ to_warehouse_id: e.target.value }))} className={inputCls("to_warehouse_id", createErrors)}>
                                        <option value="">Select warehouse</option>
                                        {warehouses.filter(w => w.warehouse_id !== createForm.from_warehouse_id).map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name} — {w.city}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        {createForm.request_type === "SHOP_TO_SHOP" && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Source Shop <span className="text-red-500">*</span></label>
                                    {isShopOwner ? (
                                        <input type="text" value={shops.find(s => s.shop_id === userShopId)?.shop_name || userShopId} readOnly disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
                                    ) : (
                                        <select value={createForm.from_shop_id} onChange={(e) => dispatch(updateCreateForm({ from_shop_id: e.target.value, variant_id: "" }))} className={inputCls("from_shop_id", createErrors)}>
                                            <option value="">Select shop</option>
                                            {shops.filter(s => isAdmin() || s.shop_id === userShopId).map(s => <option key={s.shop_id} value={s.shop_id}>{s.shop_name} — {s.city}</option>)}
                                        </select>
                                    )}
                                    <input type="hidden" name="from_shop_id_hidden" value={userShopId} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Destination Shop <span className="text-red-500">*</span></label>
                                    <select value={createForm.to_shop_id} onChange={(e) => dispatch(updateCreateForm({ to_shop_id: e.target.value }))} className={inputCls("to_shop_id", createErrors)}>
                                        <option value="">Select shop</option>
                                        {shops.filter(s => s.shop_id !== createForm.from_shop_id).map(s => <option key={s.shop_id} value={s.shop_id}>{s.shop_name} — {s.city}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Product <span className="text-red-500">*</span></label>
                            <select value={createForm.variant_id} onChange={(e) => dispatch(updateCreateForm({ variant_id: e.target.value }))} className={inputCls("variant_id", createErrors)}>
                                <option value="">Select product</option>
                                {availableVariants.map(v => (
                                    <option key={v.variant_id} value={v.variant_id}>
                                        {v.variant?.product?.name} ({v.variant?.sku}) - Stock: {v.quantity}
                                    </option>
                                ))}
                            </select>
                            {selectedVariant && <p className="text-xs text-gray-400 mt-1">Available stock: {selectedVariant.quantity} units</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                            <input type="number" min="1" value={createForm.quantity} onChange={(e) => dispatch(updateCreateForm({ quantity: e.target.value }))} className={inputCls("quantity", createErrors)} />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                            <textarea value={createForm.request_remarks} onChange={(e) => dispatch(updateCreateForm({ request_remarks: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                        </div>
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeCreateModal())} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                        <button onClick={handleCreateSubmit} disabled={isSubmitting} className={`px-5 py-2 rounded-lg text-sm font-medium text-white ${isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-60`}>
                            {isSubmitting ? "Creating..." : isEmergency ? "Create Emergency Request" : "Create Request"}
                        </button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // APPROVE/REJECT MODAL RENDER (FIXED - using top-level action state)
    // ─────────────────────────────────────────────────────────────
    if (showApproveRejectModal && selectedRequest) {
        const isEmergencyRequest = selectedRequest.priority === "HIGH";
        const needsBillType = requiresTransferBillType(selectedRequest);
        const activeBillType = resolveApproveBillType(transferBillType);
        
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">
                                {isEmergencyRequest && "🚨 "}Review Request
                            </h3>
                            <p className="text-xs text-gray-400">{selectedRequest.request_number}</p>
                        </div>
                        <button onClick={() => {
                            dispatch(closeApproveRejectModal());
                            setApproveRejectAction("approve"); // Reset on close
                        }} className="text-gray-400"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {isEmergencyRequest && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                                <p className="text-xs text-red-600 font-medium">⚠️ EMERGENCY REQUEST — Priority HIGH</p>
                            </div>
                        )}
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p><strong>Product:</strong> {selectedRequest.variant?.product?.name}</p>
                            <p><strong>Quantity:</strong> {selectedRequest.quantity}</p>
                            <p><strong>Remarks:</strong> {selectedRequest.request_remarks || "—"}</p>
                        </div>
                        {needsBillType && approveRejectAction === "approve" && (
                            <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-semibold text-blue-900">Transfer bill type (required)</p>
                                <p className="text-[11px] text-blue-800/80">
                                    Default is Non-GST. Change only if GST invoice or receipt is needed.
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setTransferBillType(TRANSFER_BILL_TYPES.NON_GST))}
                                        className={`py-2 rounded-lg text-xs font-medium border ${
                                            activeBillType === TRANSFER_BILL_TYPES.NON_GST
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-700 border-gray-200"
                                        }`}
                                    >
                                        Non-GST
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setTransferBillType(TRANSFER_BILL_TYPES.GST))}
                                        className={`py-2 rounded-lg text-xs font-medium border ${
                                            activeBillType === TRANSFER_BILL_TYPES.GST
                                                ? "bg-green-600 text-white border-green-600"
                                                : "bg-white text-gray-700 border-gray-200"
                                        }`}
                                    >
                                        GST
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setTransferBillType(TRANSFER_BILL_TYPES.RECEIPT))}
                                        className={`py-2 rounded-lg text-xs font-medium border ${
                                            activeBillType === TRANSFER_BILL_TYPES.RECEIPT
                                                ? "bg-amber-600 text-white border-amber-600"
                                                : "bg-white text-gray-700 border-gray-200"
                                        }`}
                                    >
                                        Receipt
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setApproveRejectAction("approve")} 
                                className={`flex-1 py-2 rounded-lg text-sm font-medium ${approveRejectAction === "approve" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}
                            >
                                Approve
                            </button>
                            <button 
                                onClick={() => setApproveRejectAction("reject")} 
                                className={`flex-1 py-2 rounded-lg text-sm font-medium ${approveRejectAction === "reject" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
                            >
                                Reject
                            </button>
                        </div>
                        {approveRejectAction === "reject" && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Rejection Reason <span className="text-red-500">*</span></label>
                                <textarea 
                                    value={rejectReason} 
                                    onChange={(e) => dispatch(setRejectReason(e.target.value))} 
                                    rows={2} 
                                    className={inputCls("reject_reason", actionErrors)} 
                                    placeholder="Why is this request being rejected?" 
                                />
                                {actionErrors.reject_reason && <p className="text-xs text-red-500 mt-1">{actionErrors.reject_reason}</p>}
                            </div>
                        )}
                    </div>
                    <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => {
                            dispatch(closeApproveRejectModal());
                            setApproveRejectAction("approve");
                        }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                        <button 
                            onClick={approveRejectAction === "approve" ? handleApprove : handleReject} 
                            disabled={isSubmitting} 
                            className={`px-5 py-2 rounded-lg text-sm font-medium text-white ${approveRejectAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} disabled:opacity-60`}
                        >
                            {isSubmitting ? "Processing..." : approveRejectAction === "approve" ? "Approve" : "Reject"}
                        </button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // DISPATCH MODAL RENDER
    // ─────────────────────────────────────────────────────────────
    if (showDispatchModal && selectedRequest) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <div><h3 className="text-base font-semibold text-gray-800">Dispatch Goods</h3><p className="text-xs text-gray-400">{selectedRequest.request_number}</p></div>
                        <button onClick={() => dispatch(closeDispatchModal())} className="text-gray-400"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p><strong>Product:</strong> {selectedRequest.variant?.product?.name}</p>
                            <p><strong>Quantity:</strong> {selectedRequest.quantity}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tracking Number</label>
                            <input value={trackingNumber} onChange={(e) => dispatch(setTrackingNumber(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Optional" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                            <input type="date" value={expectedDelivery} onChange={(e) => dispatch(setExpectedDelivery(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                            <AlertTriangle size={16} className="text-amber-500" />
                            <p className="text-xs text-amber-700">Stock will be deducted from source and marked as in-transit.</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeDispatchModal())} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                        <button onClick={handleDispatch} disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{isSubmitting ? "Processing..." : "Dispatch"}</button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // RECEIVE MODAL RENDER
    // ─────────────────────────────────────────────────────────────
    if (showReceiveModal && selectedRequest) {
        const sentQty = selectedRequest?.approved_quantity ?? selectedRequest?.quantity ?? 0;
        const remaining = sentQty - (selectedRequest.received_quantity || 0);
        const sentLabel =
            selectedRequest?.request_type === "SHOP_TO_SHOP"
                ? "Sent by source shop"
                : selectedRequest?.request_type === "WH_TO_SHOP"
                  ? "Sent by warehouse"
                  : "Sent quantity";
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <div><h3 className="text-base font-semibold text-gray-800">Receive Goods</h3><p className="text-xs text-gray-400">{selectedRequest.request_number}</p></div>
                        <button onClick={() => dispatch(closeReceiveModal())} className="text-gray-400"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p><strong>Product:</strong> {selectedRequest.variant?.product?.name}</p>
                            <p><strong>Total Requested:</strong> {selectedRequest.quantity}</p>
                            <p><strong>{sentLabel}:</strong> {sentQty}</p>
                            <p><strong>Already Received:</strong> {selectedRequest.received_quantity || 0}</p>
                            <p><strong>Receiving Now:</strong> <span className="font-bold text-green-700">{remaining}</span></p>
                        </div>
                        <p className="text-xs text-gray-500 bg-green-50 border border-green-100 rounded-lg p-3">
                            Confirm to receive <strong>{remaining}</strong> unit(s) — same as dispatched quantity remaining.
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (optional)</label>
                            <textarea value={receiveRemarks} onChange={(e) => dispatch(setReceiveRemarks(e.target.value))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Optional" />
                        </div>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeReceiveModal())} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                        <button onClick={handleReceive} disabled={isSubmitting || remaining <= 0} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">{isSubmitting ? "Processing..." : "Receive"}</button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // CANCEL MODAL RENDER
    // ─────────────────────────────────────────────────────────────
    if (showCancelModal && selectedRequest) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <div><h3 className="text-base font-semibold text-gray-800">Cancel Request</h3><p className="text-xs text-gray-400">{selectedRequest.request_number}</p></div>
                        <button onClick={() => dispatch(closeCancelModal())} className="text-gray-400"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            <p><strong>Warning:</strong> This action cannot be undone.</p>
                            {selectedRequest.status === "DISPATCHED" && <p className="text-xs mt-1">Stock will be reversed to source location.</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cancellation Reason <span className="text-red-500">*</span></label>
                            <textarea value={cancelReason} onChange={(e) => dispatch(setCancelReason(e.target.value))} rows={2} className={inputCls("cancel_reason", actionErrors)} text-gray-700 placeholder="Why is this request being cancelled?" />
                            {actionErrors.cancel_reason && <p className="text-xs text-red-500 mt-1">{actionErrors.cancel_reason}</p>}
                        </div>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeCancelModal())} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                        <button onClick={handleCancel} disabled={isSubmitting} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">{isSubmitting ? "Processing..." : "Confirm Cancel"}</button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    return null;
}