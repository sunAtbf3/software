// TABS/SALES/BillingTab_Compo/BillTypeSection.jsx
//
// Dynamic bill type selection - always shows all types for all customers

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setBillType, openEditCustomer } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { BILL_TYPES } from "../../../../constants/billingBillTypes";

export default function BillTypeSection() {
    const dispatch = useDispatch();
    const { selectedCustomer, billType } = useSelector((state) => state.billing);

    const handleGstInvoiceClick = () => {
        dispatch(setBillType(BILL_TYPES.WITH_GST));
        if (selectedCustomer && !selectedCustomer.is_gst_registered) {
            dispatch(openEditCustomer());
        }
    };

    if (!selectedCustomer) {
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">Bill Type</p>
                <p className="text-xs text-gray-500">Search or create a customer to choose bill type.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Bill Type</p>
            <div className="grid grid-cols-4 gap-2">
                <button
                    type="button"
                    onClick={handleGstInvoiceClick}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                        billType === BILL_TYPES.WITH_GST
                            ? "bg-green-600 text-white border-green-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="block">GST Invoice</span>
                </button>

                <button
                    type="button"
                    onClick={() => dispatch(setBillType(BILL_TYPES.WITHOUT_GST))}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                        billType === BILL_TYPES.WITHOUT_GST
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="block">Non-GST</span>
                </button>

                <button
                    type="button"
                    onClick={() => dispatch(setBillType(BILL_TYPES.ESTIMATE))}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                        billType === BILL_TYPES.ESTIMATE
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="block">Estimate</span>
                </button>

                <button
                    type="button"
                    onClick={() => dispatch(setBillType(BILL_TYPES.NON_LISTED))}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition-all text-center ${
                        billType === BILL_TYPES.NON_LISTED
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="block">Non-Listed</span>
                </button>
            </div>
        </div>
    );
}
