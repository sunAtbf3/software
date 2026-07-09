// TABS/TRANSFERS/TransferRequestShared/ViewRequestModal.jsx
//
// Modal for viewing transfer request details
// Shows all details including rejection reason if rejected

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, CheckCircle, XCircle, Truck, Package, Ban, Calendar, MapPin, User, FileText, Download } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { closeViewRequestModal } from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestSlice";
import {
    useLazyDownloadTransferChallanPdfQuery,
    useLazyGetTransferRequestByIdQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
import { downloadBlobFile, CHALLAN_READY_STATUSES } from "../../../../utils/downloadBlob";
import { ROLES } from "../../../roles";

const STATUS_BADGE = {
    REQUESTED: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-blue-100 text-blue-700",
    REJECTED: "bg-red-100 text-red-600",
    DISPATCHED: "bg-purple-100 text-purple-700",
    PARTIALLY_RECEIVED: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-500",
};

const fmtDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

export default function ViewRequestModal({ onSuccess }) {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { showViewRequestModal, viewRequestData } = useSelector((state) => state.transferRequest);
    const [downloadChallan, { isFetching: isDownloading }] = useLazyDownloadTransferChallanPdfQuery();
    const [fetchRequestDetail, { data: requestDetail }] = useLazyGetTransferRequestByIdQuery();

    useEffect(() => {
        if (showViewRequestModal && viewRequestData?.request_id) {
            fetchRequestDetail(viewRequestData.request_id);
        }
    }, [showViewRequestModal, viewRequestData?.request_id, fetchRequestDetail]);

    if (!showViewRequestModal || !viewRequestData) return null;

    const request = requestDetail || viewRequestData;
    const isWarehouseUser = [ROLES.SUPER_ADMIN, ROLES.WH_MANAGER, ROLES.WH_STOCK_LISTER].includes(user?.role);
    const isFranchiseTransfer = request.is_franchise_transfer || request.to_shop?.shop_type === "FRANCHISE";
    const franchisePricing = request.franchise_pricing;
    const isEmergency = request.priority === "HIGH";
    const isRejected = request.status === "REJECTED";
    const canPrintChallan = CHALLAN_READY_STATUSES.has(request.status);

    const handleDownloadChallan = async () => {
        try {
            const blob = await downloadChallan(request.request_id).unwrap();
            downloadBlobFile(blob, `transfer-challan-${request.request_number}.pdf`);
            toast.success("Transfer challan downloaded");
        } catch (err) {
            toast.error(err?.data?.message || "Failed to download challan");
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                            Request Details
                            {isEmergency && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">🚨 EMERGENCY</span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono">{request.request_number}</p>
                    </div>
                    <button onClick={() => dispatch(closeViewRequestModal())} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Status Banner */}
                    <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[request.status]}`}>
                            {request.status?.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400">Created: {fmtDateTime(request.created_at)}</span>
                    </div>

                    {/* Rejection Reason (if rejected) */}
                    {isRejected && request.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <XCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                                    <p className="text-sm text-red-700 mt-1">{request.rejection_reason}</p>
                                    {request.approved_by && (
                                        <p className="text-xs text-red-600 mt-2">Rejected by: {request.approver?.name || request.approved_by}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">Product Details</p>
                        <p className="font-semibold text-gray-800">{request.variant?.product?.name || "—"}</p>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            <span>SKU: {request.variant?.sku || "—"}</span>
                            <span>Variant ID: {request.variant_id}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-sm"><strong>Quantity:</strong> {request.quantity} units</p>
                        </div>
                    </div>

                    {/* Location Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
                                <MapPin size={12} /> Source
                            </p>
                            <p className="font-medium text-gray-800">
                                {request.from_warehouse?.warehouse_name || request.from_shop?.shop_name || "—"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {request.from_warehouse?.city || request.from_shop?.city || "—"}
                            </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-green-800 mb-2 flex items-center gap-1">
                                <MapPin size={12} /> Destination
                            </p>
                            <p className="font-medium text-gray-800">
                                {request.to_warehouse?.warehouse_name || request.to_shop?.shop_name || "—"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {request.to_warehouse?.city || request.to_shop?.city || "—"}
                            </p>
                        </div>
                    </div>

                    {/* Remarks */}
                    {request.request_remarks && (
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                <FileText size={12} /> Remarks
                            </p>
                            <p className="text-sm text-gray-700">{request.request_remarks}</p>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-500 mb-3">Timeline</p>
                        <div className="space-y-2 text-sm">
                            {request.requested_by && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Requested:</span>
                                    <span className="text-gray-700">{fmtDateTime(request.requested_at)} by {request.requester?.name}</span>
                                </div>
                            )}
                            {request.approved_by && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Approved:</span>
                                    <span className="text-gray-700">{fmtDateTime(request.approved_at)} by {request.approver?.name}</span>
                                </div>
                            )}
                            {request.dispatched_by && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Dispatched:</span>
                                    <span className="text-gray-700">{fmtDateTime(request.dispatched_at)} by {request.dispatcher?.name}</span>
                                </div>
                            )}
                            {request.received_by && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Received:</span>
                                    <span className="text-gray-700">{fmtDateTime(request.received_at)} by {request.receiver?.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tracking Info (if dispatched) */}
                    {request.tracking_number && (
                        <div className="bg-purple-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-purple-800 mb-1">Tracking Information</p>
                            <p className="text-sm font-semibold">Tracking #: {request.tracking_number}</p>
                            {request.expected_delivery && (
                                <p className="text-xs text-gray-600 mt-1">Expected: {fmtDateTime(request.expected_delivery)}</p>
                            )}
                        </div>
                    )}

                    {request.unit_cost_snapshot != null && isWarehouseUser && !isFranchiseTransfer && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm">
                            <p className="text-xs text-gray-500">Transfer valuation (at dispatch)</p>
                            <p className="font-medium text-gray-800">
                                Unit cost: ₹{Number(request.unit_cost_snapshot).toFixed(2)} × {request.quantity} = ₹
                                {Number(request.line_value_snapshot || 0).toFixed(2)}
                            </p>
                        </div>
                    )}

                    {isFranchiseTransfer && franchisePricing && (
                        <div className="bg-indigo-50 rounded-lg p-3 text-sm space-y-1">
                            <p className="text-xs font-medium text-indigo-800">Franchise transfer pricing</p>
                            <p>
                                MRP: ₹{Number(franchisePricing.mrp || 0).toFixed(2)} × {request.quantity} = ₹
                                {Number(franchisePricing.mrp_line_value || 0).toFixed(2)}
                            </p>
                            <p>
                                F.Price ({franchisePricing.markup_percent}%): ₹
                                {Number(franchisePricing.franchise_unit_price || 0).toFixed(2)} × {request.quantity} = ₹
                                {Number(franchisePricing.franchise_line_value || 0).toFixed(2)}
                            </p>
                            {isWarehouseUser && request.variant && (
                                <p className="text-xs text-gray-600 pt-1 border-t border-indigo-100">
                                    Purchase: ₹{Number(request.variant.purchase_price || 0).toFixed(2)}
                                    {" · "}
                                    Special: ₹{Number(request.variant.special_price || 0).toFixed(2)}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
                    {canPrintChallan && (
                        <button
                            type="button"
                            onClick={handleDownloadChallan}
                            disabled={isDownloading}
                            className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Download size={16} />
                            {isDownloading ? "Downloading…" : isFranchiseTransfer ? "Franchise Transfer Bill (PDF)" : "Transfer Challan (PDF)"}
                        </button>
                    )}
                    <button 
                        onClick={() => dispatch(closeViewRequestModal())} 
                        className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                    >
                        Close
                    </button>
                </div>
            </div>
    </div>
</div>
    );
}