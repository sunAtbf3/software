import React, { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useGetMyWarehouseQuery,
    useUpdateMyWarehouseMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import WarehouseProfileFormBody from "./WarehouseProfileFormBody";

const validate = (formData) => {
    const errors = {};
    if (!formData.address?.trim() || formData.address.trim().length < 3) {
        errors.address = "Address is required (min 3 characters)";
    }
    if (formData.manager_name?.trim() && formData.manager_name.trim().length < 2) {
        errors.manager_name = "Manager name must be at least 2 characters";
    }
    return errors;
};

export default function WarehouseProfileTab() {
    const { data: myWarehouse, isLoading, isFetching, refetch } = useGetMyWarehouseQuery();
    const [updateMyWarehouse, { isLoading: isSaving }] = useUpdateMyWarehouseMutation();

    const [formData, setFormData] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (myWarehouse) {
            setFormData({
                warehouse_code: myWarehouse.warehouse_code || "",
                warehouse_name: myWarehouse.warehouse_name || "",
                city: myWarehouse.city || "",
                manager_name: myWarehouse.manager_name || "",
                address: myWarehouse.address || "",
                gstin: myWarehouse.gstin || "",
                legal_name: myWarehouse.legal_name || "",
                state_code: myWarehouse.state_code || "",
                remarks: myWarehouse.remarks || "",
                is_active: myWarehouse.is_active ?? true,
            });
        }
    }, [myWarehouse]);

    const handleChange = (patch) => {
        setFormData((prev) => ({ ...prev, ...patch }));
        setFormErrors((prev) => {
            const next = { ...prev };
            Object.keys(patch).forEach((k) => delete next[k]);
            return next;
        });
    };

    const handleSave = async () => {
        const errors = validate(formData);
        if (Object.keys(errors).length) {
            setFormErrors(errors);
            toast.error("Please fix the highlighted fields");
            return;
        }

        try {
            await updateMyWarehouse({
                manager_name: formData.manager_name?.trim() || null,
                address: formData.address.trim(),
                gstin: formData.gstin?.trim()?.toUpperCase() || null,
                legal_name: formData.legal_name?.trim() || null,
                state_code: formData.state_code?.trim() || null,
            }).unwrap();
            toast.success("Warehouse profile updated");
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to update warehouse profile");
        }
    };

    if (isLoading || !formData) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                Loading warehouse profile...
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Warehouse Profile</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        View your warehouse details and update manager name, address, and GST for transfer bills.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <WarehouseProfileFormBody
                    formData={formData}
                    onChange={handleChange}
                    formErrors={formErrors}
                />

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
