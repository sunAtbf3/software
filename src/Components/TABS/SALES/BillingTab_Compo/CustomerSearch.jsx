// TABS/SALES/BillingTab_Compo/CustomerSearch.jsx
//
// Customer search component for billing - finds customer by mobile
// UPDATED: Explicit "Select Customer" button; uses is_gst_registered boolean

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, ShoppingBag, Building2, UserCheck } from "lucide-react";
import {
    setCustomerMobileInput,
    setSelectedCustomer,
    openCreateCustomer,
    openEditCustomer,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { useCustomerSearch } from "../../../../hooks/useCustomerSearch";

const getLoyaltyBadge = (tier) => {
    switch (tier) {
        case "BRONZE":
            return "bg-amber-100 text-amber-700";
        case "SILVER":
            return "bg-gray-200 text-gray-700";
        case "GOLD":
            return "bg-yellow-100 text-yellow-700";
        default:
            return null;
    }
};

export default function CustomerSearch() {
    const dispatch = useDispatch();
    const { customerMobileInput, selectedCustomer } = useSelector((state) => state.billing);
    const { foundCustomer, isSearching, clearSearch } = useCustomerSearch(customerMobileInput);

    const handleMobileChange = (e) => {
        const value = e.target.value;
        if (/^\d{0,10}$/.test(value)) {
            dispatch(setCustomerMobileInput(value));
        }
    };

    const handleSelectCustomer = () => {
        if (foundCustomer) {
            dispatch(setSelectedCustomer(foundCustomer));
        }
    };

    const handleClearCustomer = () => {
        clearSearch();
        dispatch(setSelectedCustomer(null));
        dispatch(setCustomerMobileInput(""));
    };

    return (
        <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer Mobile</label>
            <div className="relative text-gray-700">
                <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={customerMobileInput}
                    onChange={handleMobileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {customerMobileInput && (
                    <button
                        onClick={handleClearCustomer}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                )}
            </div>

            {(isSearching) && customerMobileInput.length === 10 && (
                <div className="mt-2 text-center">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                    <span className="text-xs text-gray-500 ml-2">Searching...</span>
                </div>
            )}

            {/* Found but not yet selected: show "Select" button */}
            {foundCustomer && !selectedCustomer && (
                <div className="mt-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            {foundCustomer.is_gst_registered ? (
                                <Building2 size={16} className="text-green-700 shrink-0" />
                            ) : (
                                <User size={16} className="text-blue-600 shrink-0" />
                            )}
                            <p className="font-semibold text-gray-800 truncate">{foundCustomer.name}</p>
                            {foundCustomer.is_gst_registered && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-green-100 text-green-700 border border-green-200">
                                    GST Registered
                                </span>
                            )}
                            {getLoyaltyBadge(foundCustomer.loyalty_tier) && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getLoyaltyBadge(foundCustomer.loyalty_tier)}`}>
                                    {foundCustomer.loyalty_tier}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleSelectCustomer}
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 self-start sm:self-auto"
                        >
                            <UserCheck size={12} /> Select
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                        <span>📞 {foundCustomer.mobile}</span>
                        <span>💰 Total: ₹{foundCustomer.total_spent?.toFixed(2) || "0"}</span>
                        <span>📦 Orders: {foundCustomer.total_orders || 0}</span>
                    </div>
                    {foundCustomer.is_gst_registered && foundCustomer.gst_number && (
                        <p className="text-xs text-gray-600 mt-1">GST: {foundCustomer.gst_number}</p>
                    )}
                </div>
            )}

            {/* Selected customer card */}
            {selectedCustomer && (
                <div className={`mt-3 p-3 border rounded-lg ${
                    selectedCustomer.is_gst_registered
                        ? "bg-green-50 border-green-200"
                        : "bg-blue-50 border-blue-200"
                }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            {selectedCustomer.is_gst_registered ? (
                                <Building2 size={16} className="text-green-700 shrink-0" />
                            ) : (
                                <User size={16} className="text-blue-600 shrink-0" />
                            )}
                            <p className="font-semibold text-gray-800 truncate">{selectedCustomer.name}</p>
                            {selectedCustomer.is_gst_registered && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-green-100 text-green-700 border border-green-200">
                                    GST Registered
                                </span>
                            )}
                            {getLoyaltyBadge(selectedCustomer.loyalty_tier) && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getLoyaltyBadge(selectedCustomer.loyalty_tier)}`}>
                                    {selectedCustomer.loyalty_tier}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2.5 shrink-0 self-start sm:self-auto items-center">
                            <button
                                type="button"
                                onClick={() => dispatch(openEditCustomer())}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                            >
                                Edit Details
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                type="button"
                                onClick={handleClearCustomer}
                                className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                        <span>📞 {selectedCustomer.mobile}</span>
                        <span>💰 Total: ₹{selectedCustomer.total_spent?.toFixed(2) || "0"}</span>
                        <span>📦 Orders: {selectedCustomer.total_orders || 0}</span>
                    </div>
                    {selectedCustomer.is_gst_registered && selectedCustomer.gst_number && (
                        <p className="text-xs text-gray-600 mt-1">GST: {selectedCustomer.gst_number}</p>
                    )}
                </div>
            )}

            {customerMobileInput.length === 10 && !foundCustomer && !isSearching && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm text-yellow-800 font-medium">New Customer</p>
                        <p className="text-xs text-yellow-600">No existing account found</p>
                    </div>
                    <button
                        onClick={() => dispatch(openCreateCustomer())}
                        className="shrink-0 px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-lg hover:bg-yellow-700 self-start sm:self-auto"
                    >
                        Add Customer
                    </button>
                </div>
            )}

            {!customerMobileInput && !selectedCustomer && (
                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                    <ShoppingBag size={12} />
                    <span>Enter mobile to search or create a customer</span>
                </div>
            )}
        </div>
    );
}
