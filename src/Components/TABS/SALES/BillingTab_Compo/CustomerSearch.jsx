// TABS/SALES/BillingTab_Compo/CustomerSearch.jsx
//
// Customer search component for billing - finds customer by mobile
// UPDATED: Explicit "Select Customer" button; uses is_gst_registered boolean

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, ShoppingBag, Building2, UserCheck, Search } from "lucide-react";
import {
    setCustomerMobileInput,
    setSelectedCustomer,
    openCreateCustomer,
    openEditCustomer,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { useCustomerSearch } from "../../../../hooks/useCustomerSearch";
import { toast } from "../../../shared/ToastConfig";
import { useLazyLookupCreditNoteQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";

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

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return Number.isNaN(num) ? defaultValue : num;
};

const isTenDigitMobile = (value) => /^\d{10}$/.test(value);
const isMobileTyping = (value) => /^\d{0,10}$/.test(value);

export default function CustomerSearch({ shop_id, foundNotes = [], onFound }) {
    const dispatch = useDispatch();
    const isOnline = useSelector((state) => state.offline.isOnline);
    const { customerMobileInput, selectedCustomer } = useSelector((state) => state.billing);
    const { foundCustomer, isSearching, clearSearch } = useCustomerSearch(customerMobileInput);
    const [query, setQuery] = useState("");
    const [lookupCreditNote, { isFetching: isLookingUpCn }] = useLazyLookupCreditNoteQuery();

    const handleQueryChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        const trimmed = value.trim();
        if (isMobileTyping(trimmed)) {
            dispatch(setCustomerMobileInput(trimmed));
        } else if (!selectedCustomer) {
            dispatch(setCustomerMobileInput(""));
        }
    };

    const handleLookupCreditNote = async (number, { silent = false } = {}) => {
        if (!isOnline) {
            if (!silent) toast.error("Credit note lookup requires an internet connection");
            return;
        }
        try {
            const cn = await lookupCreditNote({
                q: number,
                redeeming_shop_id: shop_id,
            }).unwrap();
            const found = [
                cn,
                ...(Array.isArray(cn?.related_credit_notes) ? cn.related_credit_notes : []),
            ].filter(
                (row, idx, arr) =>
                    row?.credit_note_id &&
                    arr.findIndex((r) => r.credit_note_id === row.credit_note_id) === idx
            );

            const usable = found.filter((row) => row.redeemable);
            if (!usable.length) {
                if (!silent) {
                    toast.error(
                        `Credit note not usable (status: ${cn.status}, balance: ₹${toNumber(cn.balance).toFixed(2)})`
                    );
                }
                return;
            }
            onFound?.(usable);
            toast.success(
                `Credit note found — ₹${usable.reduce((s, row) => s + toNumber(row.balance), 0).toFixed(2)}`
            );
        } catch (err) {
            if (!silent) toast.error(err?.data?.message || "Credit note not found");
        }
    };

    const handleFind = async () => {
        const number = query.trim();
        if (!number) {
            toast.error("Enter a mobile, credit note, or bill number");
            return;
        }
        if (isTenDigitMobile(number)) {
            dispatch(setCustomerMobileInput(number));
            await handleLookupCreditNote(number, { silent: true });
            return;
        }
        await handleLookupCreditNote(number);
    };

    const handleSelectCustomer = () => {
        if (foundCustomer) {
            dispatch(setSelectedCustomer(foundCustomer));
        }
    };

    const handleClearQuery = () => {
        setQuery("");
        if (!selectedCustomer) {
            dispatch(setCustomerMobileInput(""));
            clearSearch();
        }
    };

    const handleClearCustomer = () => {
        clearSearch();
        dispatch(setSelectedCustomer(null));
        dispatch(setCustomerMobileInput(""));
        setQuery("");
    };

    return (
        <div className="mb-2 shrink-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
                Customer / credit note
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1 min-w-0 text-gray-700">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Mobile, credit note, or bill number"
                        value={query}
                        onChange={handleQueryChange}
                        onKeyDown={(e) => e.key === "Enter" && handleFind()}
                        className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={handleClearQuery}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleFind}
                    disabled={isLookingUpCn}
                    className="shrink-0 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-900 disabled:opacity-60"
                >
                    {isLookingUpCn ? "..." : "Find"}
                </button>
            </div>
            {!query && !selectedCustomer && foundNotes.length === 0 && (
                <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                    <ShoppingBag size={12} />
                    <span>10-digit mobile for customer · CN or bill number + Find for credit</span>
                </div>
            )}
            {foundNotes.length > 0 && (
                <div className="mt-1 max-h-14 overflow-y-auto space-y-0.5">
                    {foundNotes.map((cn) => (
                        <div
                            key={cn.credit_note_id}
                            className="flex justify-between items-center gap-2 text-[11px] bg-purple-50 border border-purple-100 rounded px-2 py-1"
                        >
                            <span className="font-mono text-purple-800 truncate">{cn.credit_note_number}</span>
                            <span className="shrink-0 text-purple-600">
                                ₹{toNumber(cn.balance).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {(isSearching) && customerMobileInput.length === 10 && (
                <div className="mt-2 text-center">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                    <span className="text-xs text-gray-500 ml-2">Searching...</span>
                </div>
            )}

            {/* Found but not yet selected — click anywhere on card to select */}
            {foundCustomer && !selectedCustomer && customerMobileInput.length === 10 && (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={handleSelectCustomer}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectCustomer();
                        }
                    }}
                    className="mt-3 p-3 border border-blue-200 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100/80 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                    aria-label={`Select customer ${foundCustomer.name}`}
                >
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
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg self-start sm:self-auto pointer-events-none">
                            <UserCheck size={12} /> Select
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                        <span>📞 {foundCustomer.mobile}</span>
                        <span>💰 Total: ₹{foundCustomer.total_spent?.toFixed(2) || "0"}</span>
                        <span>📦 Orders: {foundCustomer.total_orders || 0}</span>
                    </div>
                    {foundCustomer.is_gst_registered && foundCustomer.gst_number && (
                        <p className="text-xs text-gray-600 mt-1">GST: {foundCustomer.gst_number}</p>
                    )}
                    {/* <p className="text-[10px] text-blue-600/80 mt-2">Click anywhere on this card to select</p> */}
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

            {isTenDigitMobile(customerMobileInput) && !foundCustomer && !isSearching && (
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

        </div>
    );
}
