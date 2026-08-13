
// TABS/TRANSFERS/TransferRequestShared/CreateFromSearchModal.jsx
// 
// Modal for creating transfer requests from search results
// FIXED: Emergency toggle pre-enabled, form reset on open

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "../../../../shared/ToastConfig";
import {
    useCreateTransferRequestMutation,
    useCreateEmergencyTransferRequestMutation,
    generateIdempotencyKey,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
import {
    closeCreateFromSearchModal,
    clearPrefilledRequestData,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestSlice";

export default function CreateFromSearchModal({ onSuccess, initialIsEmergency = false }) {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const {
        showCreateFromSearchModal,
        prefilledRequestData,
    } = useSelector((state) => state.transferRequest);

    const [isEmergency, setIsEmergency] = useState(false);
    const [quantity, setQuantity] = useState("");
    const [priority, setPriority] = useState("NORMAL");
    const [expectedDelivery, setExpectedDelivery] = useState("");
    const [requestRemarks, setRequestRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [createRequest] = useCreateTransferRequestMutation();
    const [createEmergencyRequest] = useCreateEmergencyTransferRequestMutation();

    // Reset form when modal opens
    useEffect(() => {
        if (showCreateFromSearchModal && prefilledRequestData) {
            setQuantity("");
            setRequestRemarks("");
            setIsEmergency(initialIsEmergency);
            setPriority(initialIsEmergency ? "HIGH" : "NORMAL");
            setExpectedDelivery("");
        }
    }, [showCreateFromSearchModal, prefilledRequestData, initialIsEmergency]);

    if (!showCreateFromSearchModal || !prefilledRequestData) return null;

    const handleSubmit = async () => {
        const qty = parseInt(quantity);
        if (!quantity || qty <= 0) {
            toast.error("Please enter valid quantity");
            return;
        }
        if (qty > prefilledRequestData.max_quantity) {
            toast.error(`Maximum available quantity is ${prefilledRequestData.max_quantity}`);
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                request_type: prefilledRequestData.request_type,
                quantity: qty,
                variant_id: prefilledRequestData.variant_id,
                request_remarks: requestRemarks.trim() || null,
            };

            // Add source based on type
            if (prefilledRequestData.source_type === "warehouse") {
                if (prefilledRequestData.request_type === "WH_TO_SHOP") {
                    payload.from_warehouse_id = prefilledRequestData.source_id;
                    payload.to_shop_id = prefilledRequestData.destination_id;
                } else if (prefilledRequestData.request_type === "WH_TO_WH") {
                    payload.from_warehouse_id = prefilledRequestData.source_id;
                    payload.to_warehouse_id = prefilledRequestData.destination_id;
                }
            } else {
                // Source is shop
                payload.from_shop_id = prefilledRequestData.source_id;
                payload.to_shop_id = prefilledRequestData.destination_id;
            }

            // Add emergency fields if emergency request
            if (isEmergency) {
                payload.priority = priority;
                if (expectedDelivery) {
                    payload.expected_delivery = new Date(expectedDelivery).toISOString();
                }
                // Add emergency indicator in remarks
                if (!payload.request_remarks) {
                    payload.request_remarks = "[EMERGENCY] ";
                } else if (!payload.request_remarks.startsWith("[EMERGENCY]")) {
                    payload.request_remarks = `[EMERGENCY] ${payload.request_remarks}`;
                }
            }

            const mutation = isEmergency ? createEmergencyRequest : createRequest;
            await mutation({ idempotencyKey: generateIdempotencyKey(), ...payload }).unwrap();
            
            toast.success(isEmergency ? "🚨 Emergency transfer request created successfully" : "Transfer request created successfully");
            dispatch(closeCreateFromSearchModal());
            dispatch(clearPrefilledRequestData());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to create request");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get destination display name
    const getDestinationName = () => {
        if (prefilledRequestData.destination_type === "shop") {
            return user?.shop_name || "My Shop";
        }
        return user?.warehouse_name || "My Warehouse";
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">
                            {isEmergency ? "🚨 Emergency Transfer Request" : "Create Transfer Request"}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isEmergency ? "High priority — immediate approval required" : "Request stock from search results"}
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            dispatch(closeCreateFromSearchModal());
                            dispatch(clearPrefilledRequestData());
                        }} 
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Emergency Toggle */}
                    <div className={`flex items-center justify-between rounded-lg p-3 ${isEmergency ? 'bg-red-50 border border-red-200' : 'bg-yellow-50'}`}>
                        <div>
                            <p className="text-sm font-medium text-yellow-800">🚨 Emergency Request</p>
                            <p className="text-xs text-yellow-600">Priority: HIGH, faster approval</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isEmergency}
                                onChange={(e) => {
                                    setIsEmergency(e.target.checked);
                                    if (e.target.checked) {
                                        setPriority("HIGH");
                                    } else {
                                        setPriority("NORMAL");
                                    }
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                    </div>

                    {/* Pre-filled Source Info */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-medium text-blue-800 mb-2">📦 Source Location</p>
                        <p className="text-sm font-semibold text-gray-800">{prefilledRequestData.source_name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                            {prefilledRequestData.source_city} • Available: {prefilledRequestData.available_quantity} units
                        </p>
                    </div>

                    {/* Pre-filled Destination Info */}
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <p className="text-xs font-medium text-green-800 mb-2">🎯 Destination</p>
                        <p className="text-sm font-semibold text-gray-800">{getDestinationName()}</p>
                        <p className="text-xs text-gray-600 mt-1">
                            {prefilledRequestData.destination_type === "shop" ? "Shop" : "Warehouse"}
                        </p>
                    </div>

                    {/* Product Info */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">📦 Product Details</p>
                        <p className="text-sm font-semibold text-gray-800">{prefilledRequestData.product_name}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                            <span className="font-semibold text-blue-600">Code: {prefilledRequestData.product_code}</span>
                            <span>SKU: {prefilledRequestData.sku}</span>
                        </div>
                    </div>

                    {isEmergency && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Priority <span className="text-red-500">*</span></label>
                                <select 
                                    value={priority} 
                                    onChange={(e) => setPriority(e.target.value)} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="HIGH">🔴 HIGH — Emergency</option>
                                    <option value="NORMAL">🟢 NORMAL — Regular</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                                <input 
                                    type="datetime-local" 
                                    value={expectedDelivery} 
                                    onChange={(e) => setExpectedDelivery(e.target.value)} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Request Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={prefilledRequestData.max_quantity}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder={`Max ${prefilledRequestData.max_quantity} units`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Available: {prefilledRequestData.available_quantity} units</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                        <textarea
                            value={requestRemarks}
                            onChange={(e) => setRequestRemarks(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                            placeholder="Add any additional notes..."
                        />
                    </div>

                    {isEmergency && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-xs text-red-600 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                ⚠️ This will create a HIGH priority emergency request. Source manager will be notified immediately.
                            </p>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                    <button 
                        onClick={() => {
                            dispatch(closeCreateFromSearchModal());
                            dispatch(clearPrefilledRequestData());
                        }} 
                        className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !quantity}
                        className={`px-5 py-2 rounded-lg text-sm font-medium text-white ${
                            isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                        } disabled:opacity-60`}
                    >
                        {isSubmitting ? "Creating..." : isEmergency ? "Create Emergency Request" : "Create Request"}
                    </button>
                </div>
            </div>
    </div>
</div>
    );
}