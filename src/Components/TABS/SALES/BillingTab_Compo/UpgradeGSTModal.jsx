// TABS/SALES/BillingTab_Compo/UpgradeGSTModal.jsx
//
// Upgrade walk-in customer to GST during billing

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Save } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useUpgradeCustomerToGstMutation } from "../../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
import {
    closeUpgradeGst,
    setSelectedCustomer,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import IndianStatePicker from "../../../shared/IndianStatePicker";
import { stateCodeFromGstin } from "../../../../utils/billingPlaceOfSupply";
import {
    validateCustomerForm,
    buildUpgradeGstPayload,
    hasCustomerFormErrors,
} from "../../../../utils/customerForm.utils";

export default function UpgradeGSTModal() {
    const dispatch = useDispatch();
    const { showUpgradeGst, selectedCustomer } = useSelector((state) => state.billing);
    const [upgradeCustomer, { isLoading }] = useUpgradeCustomerToGstMutation();

    const [formData, setFormData] = useState({
        company_name: "",
        gst_number: "",
        address: "",
        city: "",
        state_code: "",
        pincode: "",
    });
    const [errors, setErrors] = useState({});

    React.useEffect(() => {
        if (showUpgradeGst && selectedCustomer) {
            setFormData({
                company_name: selectedCustomer.company_name || selectedCustomer.name || "",
                gst_number: selectedCustomer.gst_number || "",
                address: selectedCustomer.address || "",
                city: selectedCustomer.city || "",
                state_code: selectedCustomer.state_code || "",
                pincode: selectedCustomer.pincode || "",
            });
            setErrors({});
        }
    }, [showUpgradeGst, selectedCustomer]);

    const handleChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === "gst_number") {
                const fromGst = stateCodeFromGstin(value);
                if (fromGst) next.state_code = fromGst;
            }
            return next;
        });
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const handleSubmit = async () => {
        const fieldErrors = validateCustomerForm(
            { ...formData, name: selectedCustomer?.name || "x" },
            { requireMobile: false, mode: "upgrade" }
        );
        if (hasCustomerFormErrors(fieldErrors)) {
            setErrors(fieldErrors);
            toast.error("Please fill all required GST fields");
            return;
        }

        try {
            const payload = buildUpgradeGstPayload(formData);
            const result = await upgradeCustomer({
                customerId: selectedCustomer.customer_id,
                ...payload,
            }).unwrap();

            dispatch(setSelectedCustomer(result));
            dispatch(closeUpgradeGst());
            toast.success("Customer upgraded to GST. GST invoice is now available.");
        } catch (err) {
            if (err?.data?.errors?.length) {
                const fieldErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                setErrors(fieldErrors);
            }
            toast.error(err?.data?.message || err?.message || "Failed to upgrade customer");
        }
    };

    if (!showUpgradeGst || !selectedCustomer) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Upgrade to GST Customer</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {selectedCustomer.name} ({selectedCustomer.mobile})
                            </p>
                        </div>
                        <button onClick={() => dispatch(closeUpgradeGst())} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
                            This will upgrade the customer to GST. All future bills will use GST invoices.
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Company Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={(e) => handleChange("company_name", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.company_name ? "border-red-400" : "border-gray-300"}`}
                            />
                            {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                GST Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.gst_number}
                                onChange={(e) => handleChange("gst_number", e.target.value.toUpperCase())}
                                maxLength={15}
                                placeholder="27AABCD1234D1ZR"
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.gst_number ? "border-red-400" : "border-gray-300"}`}
                            />
                            {errors.gst_number && <p className="text-xs text-red-500 mt-1">{errors.gst_number}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleChange("address", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.address ? "border-red-400" : "border-gray-300"}`}
                            />
                            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                City <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => handleChange("city", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.city ? "border-red-400" : "border-gray-300"}`}
                            />
                            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                        </div>

                        <IndianStatePicker
                            label="State"
                            required
                            value={formData.state_code}
                            onChange={(code) => handleChange("state_code", code)}
                            error={errors.state_code}
                        />

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Pincode <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={formData.pincode}
                                onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.pincode ? "border-red-400" : "border-gray-300"}`}
                            />
                            {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={() => dispatch(closeUpgradeGst())}
                            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Upgrading...
                                </>
                            ) : (
                                <>
                                    <Save size={14} />
                                    Upgrade &amp; Continue
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
