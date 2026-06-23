// TABS/SALES/BillingTab_Compo/EditCustomerModal.jsx
//
// Modal for editing/updating customer details during billing
// Supports BOTH online (direct API) and offline (IndexedDB + outbox queue) modes.

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Save, Building2, UserRound, CloudOff, WifiOff } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useUpdateCustomerMutation } from "../../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
import { updateOfflineCustomer } from "../../../../offline/billing/offlineCustomer.service";
import { getUserShopId } from "../../../../offline";
import {
    closeEditCustomer,
    setSelectedCustomer,
    setCustomerMobileInput,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import IndianStatePicker from "../../../shared/IndianStatePicker";
import { stateCodeFromGstin } from "../../../../utils/billingPlaceOfSupply";
import { CUSTOMER_TYPES } from "../../../../constants/customerTypes";
import {
    validateCustomerForm,
    buildCustomerSubmitPayload,
    hasCustomerFormErrors,
} from "../../../../utils/customerForm.utils";

const emptyForm = {
    customer_type: CUSTOMER_TYPES.WALK_IN,
    mobile: "",
    name: "",
    email: "",
    company_name: "",
    gst_number: "",
    address: "",
    city: "",
    state_code: "",
    pincode: "",
    remarks: "",
};

export default function EditCustomerModal() {
    const dispatch = useDispatch();
    const isOnline = useSelector((state) => state.offline.isOnline);
    const { user } = useSelector((state) => state.auth);
    const { showEditCustomer, selectedCustomer } = useSelector((state) => state.billing);
    const [updateCustomer, { isLoading: isOnlineLoading }] = useUpdateCustomerMutation();
    const [isOfflineSaving, setIsOfflineSaving] = useState(false);

    // Combined loading flag — tracks whichever path is active
    const isLoading = isOnline ? isOnlineLoading : isOfflineSaving;

    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});

    React.useEffect(() => {
        if (showEditCustomer && selectedCustomer) {
            setFormData({
                customer_type: selectedCustomer.is_gst_registered ? CUSTOMER_TYPES.GST : CUSTOMER_TYPES.WALK_IN,
                mobile: selectedCustomer.mobile || "",
                name: selectedCustomer.name || "",
                email: selectedCustomer.email || "",
                company_name: selectedCustomer.company_name || "",
                gst_number: selectedCustomer.gst_number || "",
                address: selectedCustomer.address || "",
                city: selectedCustomer.city || "",
                state_code: selectedCustomer.state_code || "",
                pincode: selectedCustomer.pincode || "",
                remarks: selectedCustomer.remarks || "",
            });
            setErrors({});
        }
    }, [showEditCustomer, selectedCustomer]);

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

    const setCustomerType = (customerType) => {
        setFormData((prev) => ({ ...prev, customer_type: customerType }));
        setErrors({});
    };

    const handleSubmit = async () => {
        const fieldErrors = validateCustomerForm(formData, { requireMobile: true, mode: "edit" });
        if (hasCustomerFormErrors(fieldErrors)) {
            setErrors(fieldErrors);
            toast.error("Please fill all required fields");
            return;
        }

        const payload = buildCustomerSubmitPayload(formData, { isUpdate: true });

        // ── Offline path ──────────────────────────────────────────────────────
        if (!isOnline) {
            setIsOfflineSaving(true);
            try {
                const result = await updateOfflineCustomer({
                    user,
                    shopId: getUserShopId(user),
                    customerId: selectedCustomer.customer_id,
                    data: payload,
                });
                toast.success(
                    `Customer ${result.name} updated offline — changes will sync when you reconnect`
                );
                dispatch(setSelectedCustomer(result));
                dispatch(setCustomerMobileInput(result.mobile));
                dispatch(closeEditCustomer());
            } catch (err) {
                toast.error(err?.message || "Failed to save customer details offline");
            } finally {
                setIsOfflineSaving(false);
            }
            return;
        }

        // ── Online path ───────────────────────────────────────────────────────
        try {
            const result = await updateCustomer({
                customerId: selectedCustomer.customer_id,
                ...payload,
            }).unwrap();

            toast.success(`Customer ${result.name} updated successfully`);
            dispatch(setSelectedCustomer(result));
            dispatch(setCustomerMobileInput(result.mobile));
            dispatch(closeEditCustomer());
        } catch (err) {
            if (err?.data?.errors?.length) {
                const fieldErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                setErrors(fieldErrors);
                toast.error("Please fix the errors");
            } else {
                toast.error(err?.data?.message || err?.message || "Failed to update customer");
            }
        }
    };

    if (!showEditCustomer || !selectedCustomer) return null;

    const isGst = formData.customer_type === CUSTOMER_TYPES.GST;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Edit Customer Details</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Update account information</p>
                        </div>
                        <button onClick={() => dispatch(closeEditCustomer())} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* ── Offline info banner (non-blocking) ──────────────────────── */}
                    {!isOnline && (
                        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                            <WifiOff size={16} className="shrink-0 mt-0.5" />
                            <span>
                                <strong>You're offline.</strong> Changes will be saved locally and
                                synced to the server automatically when internet is restored.
                            </span>
                        </div>
                    )}

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Customer Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCustomerType(CUSTOMER_TYPES.GST)}
                                    className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                                        isGst
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <Building2 size={14} />
                                    GST Customer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomerType(CUSTOMER_TYPES.WALK_IN)}
                                    className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                                        !isGst
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <UserRound size={14} />
                                    Walk-in Customer
                                </button>
                            </div>
                        </div>

                        {isGst && (
                            <>
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
                            </>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Customer Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="Full name"
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.name ? "border-red-400" : "border-gray-300"}`}
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Mobile Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                value={formData.mobile}
                                onChange={(e) => handleChange("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile number"
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${errors.mobile ? "border-red-400" : "border-gray-300"}`}
                            />
                            {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                placeholder="customer@example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
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

                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={() => dispatch(closeEditCustomer())}
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
                                    {isOnline ? "Saving..." : "Saving offline..."}
                                </>
                            ) : (
                                <>
                                    <Save size={14} />
                                    {isOnline ? "Save Changes" : "Save Offline"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
