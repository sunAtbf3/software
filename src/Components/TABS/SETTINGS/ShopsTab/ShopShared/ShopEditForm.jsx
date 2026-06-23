// TABS/SETTINGS/ShopShared/ShopEditForm.jsx
//
// PUT /shops/:id - Update shop
// DELETE /shops/:id - Deactivate shop
// Opens when user clicks "Edit" on a shop row

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Trash2 } from "lucide-react";
import { toast } from "../../../../shared/ToastConfig";
import { useUpdateShopMutation, useDeleteShopMutation } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import {
    closeEditForm,
    updateFormData,
    setFormErrors,
    clearFormErrors,
    setSubmitting,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopSlice";
import ShopFormBody from "./ShopFormBody";

export default function ShopEditForm({ onSuccess }) {
    const dispatch = useDispatch();
    const { selectedShop, formData, formErrors, isSubmitting } = useSelector((state) => state.shop);
    const [updateShop] = useUpdateShopMutation();
    const [deleteShop] = useDeleteShopMutation();

    if (!selectedShop) return null;

    const validate = () => {
        const errors = {};
        if (!formData.shop_name?.trim()) errors.shop_name = "Shop name is required";
        if (!formData.city?.trim()) errors.city = "City is required";
        if (!formData.state_code?.trim()) errors.state_code = "State is required";
        return errors;
    };

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
                shop_name: formData.shop_name.trim(),
                address: formData.address?.trim() || null,
                city: formData.city.trim(),
                state_code: formData.state_code.trim(),
                pincode: formData.pincode?.trim() || null,
                phone: formData.phone?.trim() || null,
                email: formData.email?.trim() || null,
                gst_number: formData.gst_number?.trim() || null,
                owner_user_id: formData.owner_user_id?.trim() || null,
                sales_channels: formData.sales_channels || [],
                shop_type: formData.shop_type || "OWNER",
                remarks: formData.remarks?.trim() || null,
                is_active: formData.is_active,
            };

            await updateShop({ shopId: selectedShop.shop_id, ...payload }).unwrap();
            toast.success("Shop updated successfully");
            dispatch(closeEditForm());
            if (onSuccess) onSuccess();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const be = {};
                err.data.errors.forEach(({ field, message }) => { be[field] = message; });
                dispatch(setFormErrors(be));
            } else {
                toast.error(err?.data?.message || "Failed to update shop");
            }
        } finally {
            dispatch(setSubmitting(false));
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Deactivate "${selectedShop.shop_name}"?\n\nThis will soft delete the shop. Shop can be reactivated later.\n\nNote: Deactivation fails if there are active bills or non-zero stock.`)) {
            return;
        }

        dispatch(setSubmitting(true));
        try {
            await deleteShop(selectedShop.shop_id).unwrap();
            toast.success("Shop deactivated successfully");
            dispatch(closeEditForm());
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to deactivate shop");
        } finally {
            dispatch(setSubmitting(false));
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Edit Shop</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {selectedShop.shop_code} — {selectedShop.shop_name}
                        </p>
                    </div>
                    <button
                        onClick={() => dispatch(closeEditForm())}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 text-gray-700">
                    <ShopFormBody
                        formData={formData}
                        onChange={(data) => dispatch(updateFormData(data))}
                        formErrors={formErrors}
                        isEdit={true}
                    />
                </div>

                {/* Footer with Delete Button */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-between">
                    <button
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50 cursor-pointer"
                    >
                        <Trash2 size={14} /> Deactivate Shop
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => dispatch(closeEditForm())}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>

            </div>
    </div>
</div>
    );
}
