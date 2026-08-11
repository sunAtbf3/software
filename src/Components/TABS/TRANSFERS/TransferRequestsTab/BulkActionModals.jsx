// TABS/TRANSFERS/BulkTransferShared/BulkActionModals.jsx
//
// Complete Action Modals for Bulk Transfer Requests
// Handles: Approve (partial/full), Dispatch, Receive, Cancel, View Details

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, AlertTriangle, Package, Truck, CheckCircle, XCircle, Eye, Download, MessageCircle } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useApproveBulkTransferRequestMutation,
    useRejectBulkTransferRequestMutation,
    useDispatchBulkTransferRequestMutation,
    useReceiveBulkTransferRequestMutation,
    useCancelBulkTransferRequestMutation,
    useLazyDownloadBulkChallanPdfQuery,
    useLazyGetBulkTransferRequestByIdQuery,
    generateBulkIdempotencyKey,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferApi";
import { downloadBlobFile, CHALLAN_READY_STATUSES } from "../../../../utils/downloadBlob";
import { openTransferBillWhatsApp, canViewTransferBill } from "../../../../utils/transferBillWhatsApp";
import {
    getBulkDispatchQty,
    getBulkInTransitQty,
    getBulkRequestedQty,
    formatBulkSentQty,
    sumBulkDispatchedQtyForRequest,
    sumBulkDispatchedQty,
    sumBulkInTransitQty,
    sumBulkReceivedQty,
    sumBulkRequestedQty,
    getBulkReceiveableItems,
} from "../../../../utils/bulkTransfer.utils";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";
import { TRANSFER_BILL_TYPES, getTransferBillTypeShortLabel } from "../../../../constants/transferBillTypes";
import { ROLES } from "../../../roles";
import {
    closeApproveModal,
    closeRejectModal,
    setRejectReason,
    closeDispatchModal,
    closeReceiveModal,
    closeCancelModal,
    closeViewModal,
    setApproveType,
    setTransferBillType,
    setApproveItem,
    setApproveItemQuantity,
    setTrackingNumber,
    setExpectedDelivery,
    setReceiveItemQuantity,
    setReceiveRemarks,
    setCancelReason,
    setActionErrors,
    clearActionErrors,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferSlice";

const STATUS_BADGE = {
    REQUESTED: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-blue-100 text-blue-700",
    DISPATCHED: "bg-purple-100 text-purple-700",
    PARTIALLY_RECEIVED: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-500",
    REJECTED: "bg-red-100 text-red-600",
};

const bulkDestLabel = (req) =>
    req?.request_type === "WH_TO_WH" ? "To Warehouse" : "To Shop";
const bulkDestName = (req) =>
    req?.request_type === "WH_TO_WH"
        ? req?.to_warehouse?.warehouse_name || req?.to_warehouse_id
        : req?.to_shop?.shop_name || req?.to_shop_id;

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function BulkActionModals({ onSuccess }) {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const {
        showApproveModal,
        showRejectModal,
        showDispatchModal,
        showReceiveModal,
        showCancelModal,
        showViewModal,
        selectedRequest,
        approveItems,
        approveType,
        transferBillType,
        trackingNumber,
        expectedDelivery,
        receiveItems,
        receiveRemarks,
        cancelReason,
        rejectReason,
        actionErrors,
    } = useSelector((state) => state.bulkTransfer);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [downloadBulkChallan, { isFetching: isDownloadingChallan }] = useLazyDownloadBulkChallanPdfQuery();
    const [fetchBulkDetail, { data: bulkDetail }] = useLazyGetBulkTransferRequestByIdQuery();

    const isWarehouseUser = [ROLES.SUPER_ADMIN, ROLES.WH_MANAGER, ROLES.WH_STOCK_LISTER].includes(user?.role);

    useEffect(() => {
        if (showViewModal && selectedRequest?.bulk_request_id) {
            fetchBulkDetail(selectedRequest.bulk_request_id);
        }
    }, [showViewModal, selectedRequest?.bulk_request_id, fetchBulkDetail]);

    const [approveBulkRequest] = useApproveBulkTransferRequestMutation();
    const [rejectBulkRequest] = useRejectBulkTransferRequestMutation();
    const [dispatchBulkRequest] = useDispatchBulkTransferRequestMutation();
    const [receiveBulkRequest] = useReceiveBulkTransferRequestMutation();
    const [cancelBulkRequest] = useCancelBulkTransferRequestMutation();

    const inputCls = (name, errors) => `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors?.[name] ? "border-red-400" : "border-gray-300"}`;

    useEffect(() => {
        if (showReceiveModal && selectedRequest?.bulk_request_id) {
            fetchBulkDetail(selectedRequest.bulk_request_id);
        }
    }, [showReceiveModal, selectedRequest?.bulk_request_id, fetchBulkDetail]);

    const receiveDisplayRequest =
        bulkDetail?.bulk_request_id && bulkDetail.bulk_request_id === selectedRequest?.bulk_request_id
            ? bulkDetail
            : selectedRequest;

    const receiveSourceItems = receiveDisplayRequest?.items || [];
    const receiveRequestedTotal = sumBulkRequestedQty(receiveSourceItems);
    const receiveDispatchedTotal = sumBulkDispatchedQty(receiveSourceItems);
    const receiveAlreadyTotal = sumBulkReceivedQty(receiveSourceItems);
    const receiveInTransitTotal = sumBulkInTransitQty(receiveSourceItems);
    const receiveableItems = getBulkReceiveableItems(receiveSourceItems);
    const isShopBulkReceive =
        receiveDisplayRequest?.request_type === "WH_TO_SHOP" &&
        [ROLES.SHOP_OWNER, ROLES.SHOP_MANAGER].includes(user?.role);

    // Handle Approve
    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            const isFranchise =
                selectedRequest?.is_franchise_transfer ||
                selectedRequest?.to_shop?.shop_type === "FRANCHISE";

            let payload = {};
            if (approveType === "partial") {
                const items = selectedRequest?.items || [];
                payload.items = items
                    .map((item) => {
                        const row = approveItems.find((i) => i.variant_id === item.variant_id);
                        const approved = row ? row.approved !== false : true;
                        const qty =
                            row?.quantity != null && row.quantity !== ""
                                ? parseInt(row.quantity, 10)
                                : getBulkRequestedQty(item);
                        return {
                            variant_id: item.variant_id,
                            approved,
                            quantity: approved ? qty : 0,
                        };
                    })
                    .filter((row) => row.approved && row.quantity > 0);
                if (payload.items.length === 0) {
                    toast.error("Select at least one item with valid quantity");
                    setIsSubmitting(false);
                    return;
                }
            }

            if (isFranchise) {
                payload.transfer_bill_type = transferBillType;
            }

            await approveBulkRequest({
                bulkRequestId: selectedRequest.bulk_request_id,
                ...payload,
                idempotencyKey: generateBulkIdempotencyKey(),
            }).unwrap();

            toast.success(
                isFranchise
                    ? approveType === "full"
                        ? "Bulk request approved — transfer bill generated"
                        : "Bulk request partially approved — transfer bill generated"
                    : approveType === "full"
                      ? "Bulk request approved"
                      : "Bulk request partially approved"
            );
            dispatch(closeApproveModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to approve");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason?.trim()) {
            dispatch(setActionErrors({ rejection_reason: "Rejection reason is required" }));
            toast.error("Please enter rejection reason.");
            return;
        }
        setIsSubmitting(true);
        try {
            await rejectBulkRequest({
                bulkRequestId: selectedRequest.bulk_request_id,
                rejection_reason: rejectReason.trim(),
                idempotencyKey: generateBulkIdempotencyKey(),
            }).unwrap();
            toast.success("Bulk request rejected");
            dispatch(closeRejectModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to reject");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Dispatch
    const handleDispatch = async () => {
        setIsSubmitting(true);
        try {
            await dispatchBulkRequest({
                bulkRequestId: selectedRequest.bulk_request_id,
                tracking_number: trackingNumber?.trim() || null,
                expected_delivery: expectedDelivery || null,
                idempotencyKey: generateBulkIdempotencyKey(),
            }).unwrap();
            toast.success("🚚 Bulk request dispatched successfully");
            dispatch(closeDispatchModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to dispatch");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Receive
   // In the handleReceive function, REPLACE with this (uncomment the validation):

    const handleReceive = async () => {
        const items = receiveDisplayRequest?.items || [];
        const payloadItems = [];

        for (const item of items) {
            const inTransit = getBulkInTransitQty(item);
            if (inTransit <= 0) continue;

            let qty = inTransit;
            if (!isShopBulkReceive) {
                const row = receiveItems.find((r) => r.variant_id === item.variant_id);
                const rawQty = row?.quantity ?? "";
                qty = rawQty === "" ? inTransit : parseInt(rawQty, 10);
                if (!Number.isInteger(qty) || qty < 0) {
                    toast.error(`Please enter a valid receive quantity for ${item.variant?.product?.name || "product"}.`);
                    return;
                }
                if (qty > inTransit) {
                    toast.error(`Cannot receive more than ${inTransit} for ${item.variant?.product?.name || "product"}.`);
                    return;
                }
                if (qty === 0) continue;
            }

            payloadItems.push({
                variant_id: item.variant_id,
                received_quantity: qty,
            });
        }

        if (payloadItems.length === 0) {
            toast.error("No goods are pending to receive on this request.");
            return;
        }

        const receivingNow = payloadItems.reduce((sum, row) => sum + row.received_quantity, 0);

        setIsSubmitting(true);
        try {
            await receiveBulkRequest({
                bulkRequestId: receiveDisplayRequest.bulk_request_id,
                items: payloadItems,
                receive_remarks: receiveRemarks?.trim() || undefined,
                idempotencyKey: generateBulkIdempotencyKey(),
            }).unwrap();

            toast.success(`Received ${receivingNow} unit(s) successfully.`);
            dispatch(closeReceiveModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to receive goods. Please try again."));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Cancel
    const handleCancel = async () => {
        if (!cancelReason?.trim()) {
            dispatch(setActionErrors({ cancel_reason: "Cancellation reason is required" }));
            toast.error("Please enter cancellation reason.");
            return;
        }
        setIsSubmitting(true);
        try {
            await cancelBulkRequest({
                bulkRequestId: selectedRequest.bulk_request_id,
                cancel_reason: cancelReason,
                idempotencyKey: generateBulkIdempotencyKey(),
            }).unwrap();
            toast.success("❌ Bulk request cancelled");
            dispatch(closeCancelModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to cancel");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================================
    // APPROVE MODAL
    // ============================================================
    if (showApproveModal && selectedRequest) {
        const items = selectedRequest.items || [];
        const approveTotalQty = items.reduce((s, i) => s + getBulkRequestedQty(i), 0);
        const isFranchiseApprove =
            selectedRequest?.is_franchise_transfer ||
            selectedRequest?.to_shop?.shop_type === "FRANCHISE";
        
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[min(1536px,calc(100vw-2rem))] mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <CheckCircle size={18} className="text-green-600" />
                                Approve Bulk Request
                            </h3>
                            <p className="text-xs text-gray-400">{selectedRequest.bulk_request_number}</p>
                        </div>
                        <button onClick={() => dispatch(closeApproveModal())} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p><strong>From Warehouse:</strong> {selectedRequest.from_warehouse?.warehouse_name || selectedRequest.from_warehouse_id}</p>
                            <p><strong>{bulkDestLabel(selectedRequest)}:</strong> {bulkDestName(selectedRequest)}</p>
                            <p><strong>Total Items:</strong> {items.length} | <strong>Total Quantity:</strong> {approveTotalQty} units</p>
                        </div>

                        {isFranchiseApprove && (
                            <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-semibold text-blue-900">Transfer bill type (required)</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setTransferBillType(TRANSFER_BILL_TYPES.NON_GST))}
                                        className={`py-2 rounded-lg text-sm font-medium border ${
                                            transferBillType === TRANSFER_BILL_TYPES.NON_GST
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        Non-GST Bill
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setTransferBillType(TRANSFER_BILL_TYPES.GST))}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                                            transferBillType === TRANSFER_BILL_TYPES.GST
                                                ? "bg-green-600 text-white border-green-600"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        GST Bill
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(setTransferBillType(TRANSFER_BILL_TYPES.RECEIPT))}
                                        className={`py-2 rounded-lg text-sm font-medium border ${
                                            transferBillType === TRANSFER_BILL_TYPES.RECEIPT
                                                ? "bg-amber-600 text-white border-amber-600"
                                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        Receipt
                                    </button>
                                </div>
                                <p className="text-[11px] text-blue-800">
                                    Bill uses MRP + Franchise Price. GST is calculated on franchise price per product (GST bill only).
                                </p>
                            </div>
                        )}
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => dispatch(setApproveType("full"))} 
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    approveType === "full" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                ✅ Approve All Items
                            </button>
                            <button 
                                onClick={() => dispatch(setApproveType("partial"))} 
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    approveType === "partial" ? "bg-yellow-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                ⚡ Partial Approve
                            </button>
                        </div>
                        
                        {approveType === "partial" && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                                <table className="w-full min-w-[640px] text-sm">
                                    <colgroup>
                                        <col className="w-[46%]" />
                                        <col className="w-[18%]" />
                                        <col className="w-[22%]" />
                                        <col className="w-[14%]" />
                                    </colgroup>
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Requested</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Approve / Send</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 w-20">Approve</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">
                                                    <p className="font-medium text-gray-800">{item.variant?.product?.name || "Unknown"}</p>
                                                    <p className="text-xs text-gray-400">{item.variant?.sku || "—"}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold">{getBulkRequestedQty(item)}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={getBulkRequestedQty(item)}
                                                        defaultValue={getBulkRequestedQty(item)}
                                                        className="w-20 border border-gray-200 rounded px-2 py-1 text-right text-sm"
                                                        onChange={(e) =>
                                                            dispatch(
                                                                setApproveItemQuantity({
                                                                    variant_id: item.variant_id,
                                                                    quantity: e.target.value,
                                                                })
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        onChange={(e) =>
                                                            dispatch(
                                                                setApproveItem({
                                                                    variant_id: item.variant_id,
                                                                    approved: e.target.checked,
                                                                    quantity: item.quantity,
                                                                })
                                                            )
                                                        } 
                                                        className="w-4 h-4 text-green-600 rounded"
                                                        defaultChecked={true}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeApproveModal())} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        <button 
                            onClick={handleApprove} 
                            disabled={isSubmitting} 
                            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                        >
                            {isSubmitting ? "Processing..." : "Confirm Approval"}
                        </button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ============================================================
    // REJECT MODAL
    // ============================================================
    if (showRejectModal && selectedRequest) {
        const rejectTotalQty = selectedRequest.items?.reduce((s, i) => s + i.quantity, 0) || 0;
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
                <div className="flex items-center justify-center min-h-screen px-4 py-8">
                    <div className="fixed inset-0 bg-black/40" />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                    <XCircle size={18} className="text-red-600" />
                                    Reject Bulk Request
                                </h3>
                                <p className="text-xs text-gray-400">{selectedRequest.bulk_request_number}</p>
                            </div>
                            <button onClick={() => dispatch(closeRejectModal())} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                <p><strong>From Warehouse:</strong> {selectedRequest.from_warehouse?.warehouse_name || selectedRequest.from_warehouse_id}</p>
                                <p><strong>{bulkDestLabel(selectedRequest)}:</strong> {bulkDestName(selectedRequest)}</p>
                                <p><strong>Total Quantity:</strong> {rejectTotalQty} units</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Rejection Reason <span className="text-red-500">*</span></label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => dispatch(setRejectReason(e.target.value))}
                                    rows={3}
                                    className={inputCls("rejection_reason", actionErrors)}
                                    placeholder="Why is this request being rejected?"
                                />
                                {actionErrors.rejection_reason && <p className="text-xs text-red-500 mt-1">{actionErrors.rejection_reason}</p>}
                            </div>
                        </div>
                        <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => dispatch(closeRejectModal())} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                            <button onClick={handleReject} disabled={isSubmitting} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                                {isSubmitting ? "Processing..." : "Confirm Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // DISPATCH MODAL
    // ============================================================
    if (showDispatchModal && selectedRequest) {
        const dispatchTotalQty = selectedRequest.items?.reduce((s, i) => s + i.quantity, 0) || 0;
        
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <Truck size={18} className="text-blue-600" />
                                Dispatch Bulk Request
                            </h3>
                            <p className="text-xs text-gray-400">{selectedRequest.bulk_request_number}</p>
                        </div>
                        <button onClick={() => dispatch(closeDispatchModal())} className="text-gray-400"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p><strong>{bulkDestLabel(selectedRequest)}:</strong> {bulkDestName(selectedRequest)}</p>
                            <p><strong>Total Items:</strong> {selectedRequest.items?.length || 0}</p>
                            <p><strong>Total Quantity:</strong> {dispatchTotalQty} units</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tracking Number</label>
                            <input 
                                value={trackingNumber} 
                                onChange={(e) => dispatch(setTrackingNumber(e.target.value))} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                placeholder="e.g., TRK-2026-001" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                            <input 
                                type="date" 
                                value={expectedDelivery} 
                                onChange={(e) => dispatch(setExpectedDelivery(e.target.value))} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">Stock will be deducted from warehouse and marked as in-transit.</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeDispatchModal())} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        <button onClick={handleDispatch} disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                            {isSubmitting ? "Processing..." : "Confirm Dispatch"}
                        </button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ============================================================
    // RECEIVE MODAL (NO HOOKS INSIDE CONDITIONAL)
    // ============================================================
    if (showReceiveModal && selectedRequest) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <Package size={18} className="text-green-600" />
                                Receive Bulk Request
                            </h3>
                            <p className="text-xs text-gray-400">{receiveDisplayRequest.bulk_request_number}</p>
                        </div>
                        <button onClick={() => dispatch(closeReceiveModal())} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                            <p><strong>Requested:</strong> {receiveRequestedTotal} units</p>
                            <p><strong>Approved / Sent:</strong> {receiveDispatchedTotal} units</p>
                            <p><strong>Already Received:</strong> {receiveAlreadyTotal} units</p>
                            <p><strong>In Transit:</strong> <span className="font-bold text-blue-600">{receiveInTransitTotal}</span> units</p>
                        </div>

                        <p className="text-xs text-gray-500">
                            {isShopBulkReceive
                                ? "Warehouse sent quantity is fixed — confirm to receive exactly what was dispatched."
                                : "Enter received quantity per product if delivery was short."}
                        </p>

                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                            <table className="w-full min-w-[760px] lg:min-w-0 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product / Code</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Requested</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Sent</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Received</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">In Transit</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                            {isShopBulkReceive ? "Receiving" : "Receive Now"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {receiveableItems.map((item) => {
                                        const dispatched = getBulkDispatchQty(item);
                                        const alreadyReceived = Number(item.received_quantity ?? 0);
                                        const inTransit = getBulkInTransitQty(item);
                                        const row = receiveItems.find((r) => r.variant_id === item.variant_id);
                                        const fieldKey = `receive_${item.variant_id}`;
                                        const code = item.variant?.product_code || item.variant?.sku || "—";
                                        return (
                                            <tr key={item.variant_id}>
                                                <td className="px-3 py-2">
                                                    <p className="font-medium text-gray-800">{item.variant?.product?.name || "Unknown"}</p>
                                                    <p className="text-xs text-gray-400">{code}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-600">{getBulkRequestedQty(item)}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-gray-800">{dispatched}</td>
                                                <td className="px-3 py-2 text-right text-gray-600">{alreadyReceived}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-blue-700">{inTransit}</td>
                                                <td className="px-3 py-2 text-right">
                                                    {isShopBulkReceive ? (
                                                        <span className="inline-block min-w-[2.5rem] px-2 py-1 rounded bg-green-50 text-green-800 font-semibold text-sm">
                                                            {inTransit}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={inTransit}
                                                                value={row?.quantity ?? ""}
                                                                onChange={(e) =>
                                                                    dispatch(
                                                                        setReceiveItemQuantity({
                                                                            variant_id: item.variant_id,
                                                                            quantity: e.target.value,
                                                                        })
                                                                    )
                                                                }
                                                                className={`w-20 border rounded px-2 py-1 text-right text-sm ${
                                                                    actionErrors[fieldKey] ? "border-red-400" : "border-gray-200"
                                                                }`}
                                                            />
                                                            {actionErrors[fieldKey] && (
                                                                <p className="text-[10px] text-red-500 mt-1">{actionErrors[fieldKey]}</p>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        {receiveableItems.length === 0 && (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                No products are pending receive on this request.
                            </p>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (optional)</label>
                            <textarea
                                value={receiveRemarks}
                                onChange={(e) => dispatch(setReceiveRemarks(e.target.value))}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g. 1 unit damaged for Odonil Room Spray"
                            />
                        </div>
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeReceiveModal())} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        <button
                            onClick={handleReceive}
                            disabled={isSubmitting || receiveableItems.length === 0}
                            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                        >
                            {isSubmitting ? "Processing..." : "Confirm Receive"}
                        </button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ============================================================
    // CANCEL MODAL
    // ============================================================
    if (showCancelModal && selectedRequest) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <XCircle size={18} className="text-red-600" />
                                Cancel Bulk Request
                            </h3>
                            <p className="text-xs text-gray-400">{selectedRequest.bulk_request_number}</p>
                        </div>
                        <button onClick={() => dispatch(closeCancelModal())} className="text-gray-400"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700 font-medium">⚠️ Warning: This action cannot be undone.</p>
                            {selectedRequest.status === "DISPATCHED" && (
                                <p className="text-xs text-red-600 mt-1">Stock will be reversed to source warehouse.</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cancellation Reason <span className="text-red-500">*</span></label>
                            <textarea 
                                value={cancelReason} 
                                onChange={(e) => dispatch(setCancelReason(e.target.value))} 
                                rows={2} 
                                className={inputCls("cancel_reason", actionErrors)} 
                                placeholder="Why is this request being cancelled?"
                            />
                            {actionErrors.cancel_reason && <p className="text-xs text-red-500 mt-1">{actionErrors.cancel_reason}</p>}
                        </div>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button onClick={() => dispatch(closeCancelModal())} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        <button onClick={handleCancel} disabled={isSubmitting} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                            {isSubmitting ? "Processing..." : "Confirm Cancel"}
                        </button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    // ============================================================
    // VIEW DETAILS MODAL
    // ============================================================
    if (showViewModal && selectedRequest) {
        const displayRequest = bulkDetail || selectedRequest;
        const status = displayRequest.status;
        const viewTotalRequested = sumBulkRequestedQty(displayRequest.items);
        const viewTotalSent = sumBulkDispatchedQtyForRequest(displayRequest.items, status);
        const viewTotalReceived = sumBulkReceivedQty(displayRequest.items);
        const canPrintChallan =
            canViewTransferBill(displayRequest) ||
            (CHALLAN_READY_STATUSES.has(status) && !displayRequest.transfer_bill_number);
        const isFranchiseTransfer =
            displayRequest.is_franchise_transfer || displayRequest.to_shop?.shop_type === "FRANCHISE";
        const franchiseTotals = displayRequest.franchise_bill_totals;

        const handleDownloadBulkChallan = async () => {
            try {
                const blob = await downloadBulkChallan(displayRequest.bulk_request_id).unwrap();
                const fname = displayRequest.transfer_bill_number
                    ? `transfer-bill-${displayRequest.transfer_bill_number}.pdf`
                    : `bulk-challan-${displayRequest.bulk_request_number}.pdf`;
                downloadBlobFile(blob, fname);
                toast.success("Transfer bill downloaded");
            } catch (err) {
                toast.error(err?.data?.message || "Failed to download bill");
            }
        };

        const handleWhatsAppBill = () => {
            const result = openTransferBillWhatsApp(displayRequest);
            if (!result.ok) {
                if (result.reason === "missing_phone") {
                    toast.error("Franchise shop phone number is not configured");
                } else {
                    toast.error("Transfer bill link is not available yet");
                }
            }
        };
        
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[min(1536px,calc(100vw-2rem))] mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <Eye size={18} className="text-blue-600" />
                                Bulk Request Details
                            </h3>
                            <p className="text-xs text-gray-400">{displayRequest.bulk_request_number}</p>
                        </div>
                        <button onClick={() => dispatch(closeViewModal())} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[status] || "bg-gray-100 text-gray-600"}`}>
                                {status?.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-gray-400">Created: {fmtDate(displayRequest.created_at)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3">
                            <div>
                                <p className="text-xs text-gray-500">Source Warehouse</p>
                                <p className="font-medium text-gray-800">{displayRequest.from_warehouse?.warehouse_name || displayRequest.from_warehouse_id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{bulkDestLabel(displayRequest)}</p>
                                <p className="font-medium text-gray-800">{bulkDestName(displayRequest)}</p>
                            </div>
                        </div>

                        {status === "REJECTED" && displayRequest.rejection_reason && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-red-800">Rejection Reason</p>
                                <p className="text-sm text-red-700 mt-1">{displayRequest.rejection_reason}</p>
                            </div>
                        )}
                        
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Items ({displayRequest.items?.length || 0})</p>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                                <table className="w-full min-w-[980px] text-sm">
                                    <colgroup>
                                        <col className="w-[38%]" />
                                        <col className="w-[8%]" />
                                        <col className="w-[8%]" />
                                        <col className="w-[8%]" />
                                        {isFranchiseTransfer && <col className="w-[10%]" />}
                                        {isFranchiseTransfer && <col className="w-[10%]" />}
                                        {isFranchiseTransfer && isWarehouseUser && <col className="w-[9%]" />}
                                        {isFranchiseTransfer && isWarehouseUser && <col className="w-[9%]" />}
                                        <col className="w-[10%]" />
                                    </colgroup>
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product / Code</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Requested</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Sent</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Received</th>
                                            {isFranchiseTransfer && (
                                                <>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">MRP</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">F.Price</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 leading-tight">
                                                        Combo<br />Price
                                                    </th>
                                                </>
                                            )}
                                            {isFranchiseTransfer && isWarehouseUser && (
                                                <>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Purchase</th>
                                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Special</th>
                                                </>
                                            )}
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {displayRequest.items?.map((item, idx) => {
                                            const dispatched = getBulkDispatchQty(item);
                                            const sentDisplay = formatBulkSentQty(item, status);
                                            const received = Number(item.received_quantity ?? 0);
                                            let itemStatus = "Pending";
                                            let statusTone = "bg-gray-100 text-gray-600";
                                            if (status === "REQUESTED") {
                                                itemStatus = item.is_approved === false ? "Not Approved" : "Awaiting Approval";
                                                statusTone = "bg-yellow-100 text-yellow-800";
                                            } else if (item.is_approved === false) {
                                                itemStatus = "Not Approved";
                                                statusTone = "bg-red-100 text-red-700";
                                            } else if (dispatched === 0) {
                                                itemStatus = "—";
                                            } else if (received === 0) {
                                                itemStatus = "Pending";
                                            } else if (received >= dispatched) {
                                                itemStatus = "Completed";
                                                statusTone = "bg-green-100 text-green-700";
                                            } else {
                                                itemStatus = `Short (${received}/${dispatched})`;
                                                statusTone = "bg-yellow-100 text-yellow-800";
                                            }
                                            const fp = item.franchise_pricing;
                                            const code = item.variant?.product_code || item.variant?.sku || "—";
                                            return (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2 align-top">
                                                        <p className="font-medium text-gray-800 leading-5 break-words">
                                                            {item.variant?.product?.name || "Unknown"}
                                                        </p>
                                                        <p className="text-xs text-gray-400 break-all">{code}</p>
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold">{getBulkRequestedQty(item)}</td>
                                                    <td className="px-3 py-2 text-right font-semibold text-gray-500">{sentDisplay}</td>
                                                    <td className="px-3 py-2 text-right text-gray-600">{received}</td>
                                                    {isFranchiseTransfer && (
                                                        <>
                                                            <td className="px-3 py-2 text-right text-gray-600">
                                                                {fp?.mrp != null ? `₹${Number(fp.mrp).toFixed(2)}` : "—"}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-indigo-700 font-medium">
                                                                {fp?.franchise_unit_price != null
                                                                    ? `₹${Number(fp.franchise_unit_price).toFixed(2)}`
                                                                    : "—"}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-blue-700 font-medium">
                                                                {fp?.combo_applied && fp?.combo_unit_price != null
                                                                    ? `₹${Number(fp.combo_unit_price).toFixed(2)}`
                                                                    : "—"}
                                                            </td>
                                                        </>
                                                    )}
                                                    {isFranchiseTransfer && isWarehouseUser && (
                                                        <>
                                                            <td className="px-3 py-2 text-right text-gray-500">
                                                                {item.variant?.purchase_price != null
                                                                    ? `₹${Number(item.variant.purchase_price).toFixed(2)}`
                                                                    : "—"}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-500">
                                                                {item.variant?.special_price != null
                                                                    ? `₹${Number(item.variant.special_price).toFixed(2)}`
                                                                    : "—"}
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="px-3 py-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusTone}`}>
                                                            {itemStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td className="px-3 py-2 font-semibold">Total</td>
                                            <td className="px-3 py-2 text-right font-semibold">{viewTotalRequested}</td>
                                            <td className="px-3 py-2 text-right font-semibold">{viewTotalSent ?? "—"}</td>
                                            <td className="px-3 py-2 text-right font-semibold">{viewTotalReceived}</td>
                                            <td className="px-3 py-2" colSpan={isFranchiseTransfer ? (isWarehouseUser ? 6 : 4) : 1}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                </div>
                            </div>
                        </div>
                        
                        {isFranchiseTransfer && franchiseTotals && (
                            <div className="bg-indigo-50 rounded-lg p-3 text-sm space-y-1">
                                <p className="text-xs font-medium text-indigo-800">
                                    {status === "REQUESTED"
                                        ? "Estimated franchise bill (requested qty)"
                                        : "Franchise bill totals"}
                                </p>
                                <p>Subtotal (MRP): ₹{Number(franchiseTotals.mrp_subtotal || 0).toFixed(2)}</p>
                                <p>
                                    Total Special Price: ₹
                                    {Number(franchiseTotals.special_subtotal || 0).toFixed(2)}
                                </p>
                                <p className="font-semibold text-indigo-900">
                                    Final (F.Price): ₹{Number(franchiseTotals.final_amount || 0).toFixed(2)}
                                </p>
                            </div>
                        )}

                        {displayRequest.request_remarks && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Remarks</p>
                                <p className="text-sm text-gray-700">{displayRequest.request_remarks}</p>
                            </div>
                        )}
                        
                        {displayRequest.tracking_number && (
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Tracking Information</p>
                                <p className="text-sm font-medium text-gray-700">Tracking #: {displayRequest.tracking_number}</p>
                                {displayRequest.expected_delivery && (
                                    <p className="text-xs text-gray-500 mt-1">Expected: {fmtDate(displayRequest.expected_delivery)}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
                        {canPrintChallan && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleDownloadBulkChallan}
                                    disabled={isDownloadingChallan}
                                    className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    {isDownloadingChallan
                                        ? "Downloading…"
                                        : displayRequest.transfer_bill_number
                                          ? `Transfer Bill (${getTransferBillTypeShortLabel(displayRequest.transfer_bill_type)})`
                                          : isFranchiseTransfer
                                            ? "Franchise Transfer Bill (PDF)"
                                            : "Transfer Challan (PDF)"}
                                </button>
                                {displayRequest.transfer_bill_number && isWarehouseUser && (
                                    <button
                                        type="button"
                                        onClick={handleWhatsAppBill}
                                        className="px-4 py-2 border border-green-200 text-green-700 rounded-lg text-sm hover:bg-green-50 flex items-center gap-2"
                                    >
                                        <MessageCircle size={16} />
                                        WhatsApp to Shop
                                    </button>
                                )}
                            </>
                        )}
                        <button onClick={() => dispatch(closeViewModal())} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Close</button>
                    </div>
                </div>
    </div>
</div>
        );
    }

    return null;
}