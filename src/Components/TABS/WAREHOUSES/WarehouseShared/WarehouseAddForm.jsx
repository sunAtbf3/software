// TABS/WAREHOUSES/WarehouseShared/WarehouseAddForm.jsx
//
// Responsibility: POST /warehouses
// Receives formData + dispatch handlers from WarehouseOverviewTab.
// Uses WarehouseFormBody for rendering fields.

import React from "react";
import { useDispatch } from "react-redux";
import { useCreateWarehouseMutation } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import {
    closeAddForm,
    updateFormData,
    setFormErrors,
    clearFormErrors,
    setSubmitting,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseSlice";
import WarehouseFormBody from "./WarehouseFormBody";
import { toast } from "../../../shared/ToastConfig";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";

export default function WarehouseAddForm({ formData, formErrors, onSave }) {
    const dispatch = useDispatch();
    const [createWarehouse, { isLoading }] = useCreateWarehouseMutation();

    // ── Client-side validation (simplified to required checks only) ───────────────────────────
    const validate = () => {
        const errors = {};
        const code = formData.warehouse_code?.trim();
        const name = formData.warehouse_name?.trim();
        const addr = formData.address?.trim();
        const city = formData.city?.trim();

        if (!code) {
            errors.warehouse_code = "Warehouse code is required";
        }

        if (!name) {
            errors.warehouse_name = "Warehouse name is required";
        }

        if (!addr) {
            errors.address = "Address is required";
        }

        if (!city) {
            errors.city = "City is required";
        }

        return errors;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        dispatch(clearFormErrors());
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            dispatch(setFormErrors(errors));
            toast.error(Object.values(errors)[0] || "Please fill all required fields.");
            return;
        }

        dispatch(setSubmitting(true));
        try {
            const payload = {
                warehouse_code: formData.warehouse_code.trim().toUpperCase(),
                warehouse_name: formData.warehouse_name.trim(),
                address: formData.address.trim(),
                city: formData.city.trim(),
                manager_name: formData.manager_name?.trim() || undefined,
                remarks: formData.remarks?.trim() || undefined,
                gstin: formData.gstin?.trim()?.toUpperCase() || undefined,
                legal_name: formData.legal_name?.trim() || undefined,
                state_code: formData.state_code?.trim() || undefined,
            };

            await createWarehouse(payload).unwrap();
            onSave(); // tells parent to close + refetch
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to create warehouse. Please try again.");
            if (err?.data?.details?.fields?.length) {
                const backendErrors = {};
                err.data.details.fields.forEach(({ field, message: msg }) => {
                    backendErrors[field] = msg;
                });
                dispatch(setFormErrors(backendErrors));
            } else if (err?.data?.errors?.length) {
                const backendErrors = {};
                err.data.errors.forEach(({ field, message: msg }) => {
                    backendErrors[field] = msg;
                });
                dispatch(setFormErrors(backendErrors));
            } else {
                dispatch(setFormErrors({ general: message }));
            }
            toast.error(message);
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
                    <h3 className="text-base font-semibold text-gray-800">Add New Warehouse</h3>
                    <button
                        onClick={() => dispatch(closeAddForm())}
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
                        onClick={() => dispatch(closeAddForm())}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                    >
                        {isLoading ? "Saving…" : "Save Warehouse"}
                    </button>
                </div>

            </div>
    </div>
</div>
    );
}