// TABS/SETTINGS/ShopShared/ShopAddForm.jsx
//
// POST /shops - Create new shop
// Opens when user clicks "Add Shop" button

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { X } from "lucide-react";
import { toast } from "../../../../shared/ToastConfig";
import { useCreateShopMutation } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import {
    closeAddForm,
    updateFormData,
    setFormErrors,
    clearFormErrors,
    setSubmitting,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopSlice";
import ShopFormBody from "./ShopFormBody";

export default function ShopAddForm({ onSuccess }) {
    const dispatch = useDispatch();
    const { formData, formErrors, isSubmitting } = useSelector((state) => state.shop);
    const [createShop] = useCreateShopMutation();

    const validate = () => {
        const errors = {};
        if (!formData.shop_code?.trim()) errors.shop_code = "Shop code is required";
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
                shop_code: formData.shop_code.trim(),
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
            };

            await createShop(payload).unwrap();
            toast.success("Shop created successfully");
            dispatch(closeAddForm());
            if (onSuccess) onSuccess();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const be = {};
                err.data.errors.forEach(({ field, message }) => { be[field] = message; });
                dispatch(setFormErrors(be));
            } else {
                toast.error(err?.data?.message || "Failed to create shop");
            }
        } finally {
            dispatch(setSubmitting(false));
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div
                    className="fixed inset-0 bg-black/40"
                    onClick={() => dispatch(closeAddForm())}
                />
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Add New Shop</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Create a new shop in the system</p>
                    </div>
                    <button
                        onClick={() => dispatch(closeAddForm())}
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
                        isEdit={false}
                    />
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={() => dispatch(closeAddForm())}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                    >
                        {isSubmitting ? "Creating..." : "Create Shop"}
                    </button>
                </div>

                </div>
            </div>
        </div>
    );
}
