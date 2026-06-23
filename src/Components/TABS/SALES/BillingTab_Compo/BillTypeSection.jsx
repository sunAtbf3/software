// TABS/SALES/BillingTab_Compo/BillTypeSection.jsx
//
// Dynamic bill type selection - always shows all types for all customers

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setBillType, openEditCustomer } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { BILL_TYPES } from "../../../../constants/billingBillTypes";
import { useGetMyShopQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";

export default function BillTypeSection() {
    const dispatch = useDispatch();
    const { selectedCustomer, billType } = useSelector((state) => state.billing);
    const { user } = useSelector((state) => state.auth);
    const shopId = user?.shop_id || user?.shop?.shop_id || "";
    const { data: myShop } = useGetMyShopQuery(undefined, { skip: !shopId });
    const shopType = myShop?.shop_type || user?.shop?.shop_type || "OWNER";
    const canCreateNonListedBill = shopType !== "FRANCHISE";

    const handleGstInvoiceClick = () => {
        dispatch(setBillType(BILL_TYPES.WITH_GST));
        if (selectedCustomer && !selectedCustomer.is_gst_registered) {
            dispatch(openEditCustomer());
        }
    };

    React.useEffect(() => {
        if (!canCreateNonListedBill && billType === BILL_TYPES.NON_LISTED) {
            dispatch(setBillType(BILL_TYPES.WITHOUT_GST));
        }
    }, [billType, canCreateNonListedBill, dispatch]);

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
            <div className={`grid ${canCreateNonListedBill ? "grid-cols-4" : "grid-cols-3"} gap-2`}>
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
                    <span className="block">Receipt</span>
                </button>

                {canCreateNonListedBill && (
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
                )}
            </div>
        </div>
    );
}
