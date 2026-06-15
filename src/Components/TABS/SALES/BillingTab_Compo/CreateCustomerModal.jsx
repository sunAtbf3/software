// TABS/SALES/BillingTab_Compo/CreateCustomerModal.jsx
//
// Modal for creating new customer during billing

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Save } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useCreateCustomerMutation } from "../../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
import { createOfflineCustomer } from "../../../../offline/billing/offlineCustomer.service";
import { getUserShopId } from "../../../../offline";
import {
    closeCreateCustomer,
    setSelectedCustomer,
    setCustomerMobileInput,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import IndianStatePicker from "../../../shared/IndianStatePicker";
import { stateCodeFromGstin } from "../../../../utils/billingPlaceOfSupply";
import {
    validateCustomerForm,
    buildCustomerSubmitPayload,
    hasCustomerFormErrors,
} from "../../../../utils/customerForm.utils";

export default function CreateCustomerModal() {
    const dispatch = useDispatch();
    const isOnline = useSelector((state) => state.offline.isOnline);
    const { user } = useSelector((state) => state.auth);
    const { showCreateCustomer, customerMobileInput } = useSelector((state) => state.billing);
    const [createCustomer, { isLoading: isOnlineLoading }] = useCreateCustomerMutation();
    const [isOfflineSaving, setIsOfflineSaving] = useState(false);
    const isLoading = isOnline ? isOnlineLoading : isOfflineSaving;

    const [formData, setFormData] = useState({
        mobile: "",
        name: "",
        email: "",
        gst_number: "",
        address: "",
        city: "",
        state_code: "",
        pincode: "",
        remarks: "",
    });
    const [errors, setErrors] = useState({});

    // Pre-fill mobile from billing input when modal opens
    React.useEffect(() => {
        if (showCreateCustomer) {
            setFormData(prev => ({ ...prev, mobile: customerMobileInput || "" }));
        }
    }, [showCreateCustomer, customerMobileInput]);

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
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleSubmit = async () => {
        const fieldErrors = validateCustomerForm(formData);
        if (hasCustomerFormErrors(fieldErrors)) {
            setErrors(fieldErrors);
            toast.error("Please fill all required fields");
            return;
        }

        try {
            const payload = buildCustomerSubmitPayload(formData);
            let result;

            if (!isOnline) {
                setIsOfflineSaving(true);
                result = await createOfflineCustomer({
                    user,
                    shopId: getUserShopId(user),
                    data: payload,
                });
                toast.success(`Customer ${result.name} saved offline — will sync when online`);
            } else {
                result = await createCustomer(payload).unwrap();
                toast.success(`Customer ${result.name} created successfully`);
            }

            dispatch(setSelectedCustomer(result));
            dispatch(setCustomerMobileInput(result.mobile));
            dispatch(closeCreateCustomer());
            setFormData({
                mobile: "",
                name: "",
                email: "",
                gst_number: "",
                address: "",
                city: "",
                state_code: "",
                pincode: "",
                remarks: "",
            });
        } catch (err) {
            if (isOnline && err?.data?.errors?.length) {
                const fieldErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                setErrors(fieldErrors);
                toast.error("Please fix the errors");
            } else {
                toast.error(err?.data?.message || err?.message || "Failed to create customer");
            }
        } finally {
            setIsOfflineSaving(false);
        }
    };

    if (!showCreateCustomer) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Add New Customer</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Create customer account</p>
                    </div>
                    <button onClick={() => dispatch(closeCreateCustomer())} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={formData.mobile}
                            onChange={(e) => handleChange("mobile", e.target.value)}
                            placeholder="10-digit mobile number"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.mobile ? "border-red-400" : "border-gray-300"
                            }`}
                        />
                        {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Customer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="Full name"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.name ? "border-red-400" : "border-gray-300"
                            }`}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            placeholder="customer@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                        <input
                            type="text"
                            value={formData.gst_number}
                            onChange={(e) => handleChange("gst_number", e.target.value)}
                            placeholder="22AAAAA0000A1Z"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.gst_number ? "border-red-400" : "border-gray-300"
                            }`}
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
                            placeholder="Street address"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.address ? "border-red-400" : "border-gray-300"
                            }`}
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
                            placeholder="City"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.city ? "border-red-400" : "border-gray-300"
                            }`}
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
                            placeholder="6-digit pincode"
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.pincode ? "border-red-400" : "border-gray-300"
                            }`}
                        />
                        {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                        <input
                            type="text"
                            value={formData.remarks}
                            onChange={(e) => handleChange("remarks", e.target.value)}
                            placeholder="Any notes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={() => dispatch(closeCreateCustomer())}
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
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                Create Customer
                            </>
                        )}
                    </button>
                </div>
            </div>
    </div>
</div>
    );
}