// TABS/INVENTORY/ShopStockShared/StockQuantityModal.jsx
//
// Adjust single shop stock quantity
// Supports: set, increment, decrement operations

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, AlertTriangle, CloudOff } from "lucide-react";
import { toast } from "../../../../shared/ToastConfig";
import { useUpdateShopStockMutation } from "../../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi";
import {
    closeQuantityModal,
    updateQuantityForm,
    setQuantityErrors,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockSlice";
import { createOfflineStockAdjustment } from "../../../../../offline/inventory/offlineStockAdjustment.service";
import { getUserShopId } from "../../../../../offline/constants";

export default function StockQuantityModal({ onSuccess }) {
    const dispatch = useDispatch();
    const { selectedStock, quantityForm, quantityErrors } = useSelector((state) => state.shopStock);
    const { user } = useSelector((state) => state.auth);
    const isOnline = useSelector((state) => state.offline.isOnline);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updateStock] = useUpdateShopStockMutation();

    if (!selectedStock) return null;

    const currentQty = quantityForm.current_quantity;
    const newQty = parseInt(quantityForm.new_quantity) || 0;
    const operation = quantityForm.operation;
    const diff = operation === "increment" ? newQty : (operation === "decrement" ? -newQty : newQty - currentQty);
    const isIncrease = diff > 0;
    const isDecrease = diff < 0;

    const inputCls = (name) =>
        `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${quantityErrors[name] ? "border-red-400" : "border-gray-300"}`;

    const errorMsg = (name) => quantityErrors[name] ? <p className="text-xs text-red-500 mt-1">{quantityErrors[name]}</p> : null;

    const validate = () => {
        const errors = {};
        if (quantityForm.new_quantity === "" || Number.isNaN(newQty) || newQty < 0) {
            errors.new_quantity = "Valid quantity is required";
        } else if (operation === "increment" || (operation === "set" && newQty > currentQty)) {
            errors.new_quantity = `Cannot set above current stock (${currentQty}). Shop stock can only be reduced.`;
        } else if (operation === "decrement") {
            if (newQty <= 0) errors.new_quantity = "Quantity to remove must be at least 1";
            else if (newQty > currentQty) {
                errors.new_quantity = `Cannot remove more than current stock (${currentQty})`;
            }
        }
        if (!quantityForm.reason?.trim()) {
            errors.reason = "Reason is required for stock adjustment";
        }
        return errors;
    };

    const handleSave = async () => {
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            dispatch(setQuantityErrors(errors));
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                variantId: selectedStock.variant_id,
                quantity: operation === "set" ? newQty : Math.abs(newQty),
                operation: operation,
                reason: quantityForm.reason.trim(),
                low_stock_threshold: quantityForm.low_stock_threshold,
                remarks: quantityForm.remarks?.trim() || null,
            };

            if (!isOnline) {
                const result = await createOfflineStockAdjustment({
                    user,
                    shopId: getUserShopId(user),
                    variantId: payload.variantId,
                    operation: payload.operation,
                    quantity: payload.quantity,
                    reason: payload.reason,
                    remarks: payload.remarks,
                    low_stock_threshold: payload.low_stock_threshold,
                    productName: quantityForm.product_name,
                });
                toast.success(
                    `Offline adjustment saved (${result.offline_reference}): ${result.before} → ${result.after} units — will sync when online`
                );
            } else {
                await updateStock(payload).unwrap();
                toast.success(`Stock updated: ${currentQty} → ${operation === "set" ? newQty : (operation === "increment" ? currentQty + newQty : currentQty - newQty)} units`);
            }
            dispatch(closeQuantityModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || err?.message || "Failed to update stock");
            if (err?.data?.errors?.length) {
                const be = {};
                err.data.errors.forEach(({ field, message }) => { be[field] = message; });
                dispatch(setQuantityErrors(be));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 text-gray-700">
                <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Adjust Stock</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{quantityForm.product_name}</p>
                    </div>
                    <button onClick={() => dispatch(closeQuantityModal())} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Current Quantity</p>
                        <p className="text-2xl font-bold text-gray-800">{currentQty} units</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Operation <span className="text-red-500">*</span></label>
                        <select value={operation} onChange={(e) => dispatch(updateQuantityForm({ operation: e.target.value, new_quantity: "" }))} className={inputCls("operation")}>
                            <option value="set">Set to exact quantity</option>
                            <option value="decrement">Remove (Decrement)</option>
                        </select>
                        <p className="text-[11px] text-gray-400 mt-1">
                            Shop stock can only be reduced here. To add stock, request from the warehouse.
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{operation === "set" ? "New Quantity" : operation === "increment" ? "Quantity to Add" : "Quantity to Remove"} <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            min="0"
                            max={operation === "set" ? currentQty : undefined}
                            value={quantityForm.new_quantity}
                            onChange={(e) => dispatch(updateQuantityForm({ new_quantity: e.target.value }))}
                            placeholder="Enter quantity"
                            className={inputCls("new_quantity")}
                            autoFocus
                        />
                        {errorMsg("new_quantity")}
                        {quantityForm.new_quantity && operation !== "set" && (
                            <div className={`mt-1 text-xs ${isIncrease ? "text-green-600" : "text-red-600"}`}>
                                {operation === "increment" ? `➕ New total: ${currentQty + newQty} units` : `➖ New total: ${currentQty - newQty} units`}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                        <textarea value={quantityForm.reason} onChange={(e) => dispatch(updateQuantityForm({ reason: e.target.value }))} rows={2} placeholder="e.g., Physical stock count, Sold to customer, Damaged items" className={`${inputCls("reason")} resize-none`} />
                        {errorMsg("reason")}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                        <input type="number" min="0" value={quantityForm.low_stock_threshold} onChange={(e) => dispatch(updateQuantityForm({ low_stock_threshold: parseInt(e.target.value) || 0 }))} className={inputCls("low_stock_threshold")} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                        <textarea value={quantityForm.remarks} onChange={(e) => dispatch(updateQuantityForm({ remarks: e.target.value }))} rows={2} placeholder="Additional notes" className={`${inputCls("remarks")} resize-none`} />
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700">
                            {isOnline
                                ? "Stock ledger entry will be created for this adjustment. This change is permanent and tracked in audit trail."
                                : "Offline mode: adjustment is saved on this device and will upload when internet returns."}
                        </p>
                    </div>
                    {!isOnline && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2">
                            <CloudOff size={16} className="text-slate-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-600">
                                Ref: will be assigned on save. View pending items in Offline &amp; Sync tab.
                            </p>
                        </div>
                    )}
                </div>
                <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                    <button onClick={() => dispatch(closeQuantityModal())} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSubmitting} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">{isSubmitting ? "Updating..." : "Update Stock"}</button>
                </div>
            </div>
    </div>
</div>
    );
}