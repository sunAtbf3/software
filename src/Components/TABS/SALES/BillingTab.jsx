// TABS/SALES/BillingTab.jsx
//
// Main Billing Tab - Thin orchestrator
// Composes ProductPicker, CustomerSearch, CartPanel, CheckoutPanel

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetMyShopQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { getUserShopId } from "../../../offline";
import { setBillingShopContext, recalculateCartGst } from "../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import ProductPicker from "./BillingTab_Compo/ProductPicker";
import CustomerSearch from "./BillingTab_Compo/CustomerSearch";
import CartPanel from "./BillingTab_Compo/CartPanel";
import CheckoutPanel from "./BillingTab_Compo/CheckoutPanel";
import VariantPickerModal from "./BillingTab_Compo/VariantPickerModal";
import CreateCustomerModal from "./BillingTab_Compo/CreateCustomerModal";
import UpgradeGSTModal from "./BillingTab_Compo/UpgradeGSTModal";
import EditCustomerModal from "./BillingTab_Compo/EditCustomerModal";
import ManualItemsPanel from "./BillingTab_Compo/ManualItemsPanel";
import { BILL_TYPES } from "../../../constants/billingBillTypes";

export default function BillingTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { cart, billType } = useSelector((state) => state.billing);
    const shop_id = getUserShopId(user) || "";
    const { data: myShop } = useGetMyShopQuery(undefined, { skip: !shop_id });

    useEffect(() => {
        if (myShop) {
            dispatch(setBillingShopContext({ shop_name: myShop.shop_name }));
        }
    }, [myShop, dispatch]);

    useEffect(() => {
        dispatch(recalculateCartGst());
    }, [dispatch]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 lg:h-[calc(100vh-7rem)]">
            <div className="col-span-1 lg:col-span-6 bg-white border border-gray-300 rounded flex flex-col min-h-[320px] lg:h-full p-3">
                {billType === BILL_TYPES.NON_LISTED ? (
                    <ManualItemsPanel />
                ) : (
                    <ProductPicker shop_id={shop_id} cart={cart} />
                )}
            </div>

            <div className="col-span-1 lg:col-span-6 bg-white border border-gray-300 rounded flex flex-col min-h-[320px] lg:h-full p-3">
                <CustomerSearch />
                <CartPanel />
                <CheckoutPanel shop_id={shop_id} />
            </div>

            {/* Modals */}
            <VariantPickerModal />
            <CreateCustomerModal />
            <UpgradeGSTModal />
            <EditCustomerModal />
        </div>
    );
}