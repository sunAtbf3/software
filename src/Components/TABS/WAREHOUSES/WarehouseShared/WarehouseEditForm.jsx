// TABS/WAREHOUSES/WarehouseShared/WarehouseEditForm.jsx
//
// Responsibility: PUT /warehouses/:warehouseId
// Pre-filled from selectedWarehouse (set in slice via openEditForm).
// Uses WarehouseFormBody for rendering fields.

import React from "react";
import { useDispatch } from "react-redux";
import { useUpdateWarehouseMutation } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import {
    closeEditForm,
    updateFormData,
    setFormErrors,
    clearFormErrors,
    setSubmitting,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseSlice";
import WarehouseFormBody from "./WarehouseFormBody";

export default function WarehouseEditForm({ formData, formErrors, selectedWarehouse, onSave }) {
    const dispatch = useDispatch();
    const [updateWarehouse, { isLoading }] = useUpdateWarehouseMutation();

    // ── Client-side validation (disabled) ────────
    const validate = () => {
        return {};
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        dispatch(clearFormErrors());
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            dispatch(setFormErrors(errors));
            return;
        }

        dispatch(setSubmitting(true));
        try {
            const payload = {
                warehouseId: selectedWarehouse.warehouse_id,
                warehouse_code: formData.warehouse_code?.trim().toUpperCase() || undefined,
                warehouse_name: formData.warehouse_name?.trim() || undefined,
                address: formData.address?.trim() || undefined,
                city: formData.city?.trim() || undefined,
                manager_name: formData.manager_name?.trim() || undefined,
                is_active: formData.is_active,
                remarks: formData.remarks?.trim() || undefined,
                gstin: formData.gstin?.trim()?.toUpperCase() || null,
                legal_name: formData.legal_name?.trim() || null,
                state_code: formData.state_code?.trim() || null,
            };

            await updateWarehouse(payload).unwrap();
            onSave(); // tells parent to close + refetch
        } catch (err) {
            if (err?.data?.errors?.length) {
                const backendErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    backendErrors[field] = message;
                });
                dispatch(setFormErrors(backendErrors));
            } else {
                dispatch(setFormErrors({ general: err?.data?.message || "Failed to update warehouse" }));
            }
        } finally {
            dispatch(setSubmitting(false));
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Edit Warehouse</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {selectedWarehouse?.warehouse_code} — {selectedWarehouse?.warehouse_name}
                        </p>
                    </div>
                    <button
                        onClick={() => dispatch(closeEditForm())}
                        className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* General error */}
                {formErrors?.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        <p className="text-sm text-red-600">{formErrors.general}</p>
                    </div>
                )}

                {/* Form Fields */}
                <WarehouseFormBody
                    formData={formData}
                    onChange={(data) => dispatch(updateFormData(data))}
                    formErrors={formErrors}
                />

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button
                        onClick={() => dispatch(closeEditForm())}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                    >
                        {isLoading ? "Updating…" : "Update Warehouse"}
                    </button>
                </div>

            </div>
    </div>
</div>
    );
}