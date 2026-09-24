// TABS/SALES/BillingTab.jsx
//
// Main Billing Tab - Thin orchestrator
// Composes ProductPicker, CustomerSearch, CartPanel, CheckoutPanel

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetMyShopQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { getUserShopId } from "../../../offline";
import {
    setBillingShopContext,
    recalculateCartGst,
    applyComboPricing,
    setPricingMode,
    setWholesaleMarkupPercent,
    setFranchiseMarkupPercent,
} from "../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { useGetActiveComboRulesQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/ComboRule_api/comboRuleApi";
import {
    useGetWholesaleSettingsQuery,
    useGetFranchiseSettingsQuery,
} from "../../../REDUX_FEATURES/REDUX_SLICES/AppSettings_api/appSettingsApi";
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
    const { cart, billType, pricingMode } = useSelector((state) => state.billing);
    const shop_id = getUserShopId(user) || "";
    const { data: myShop } = useGetMyShopQuery(undefined, { skip: !shop_id });
    const shopType = myShop?.shop_type || user?.shop?.shop_type;
    const canWholesaleBill = shopType === "OWNER";
    const isFranchiseShop = shopType === "FRANCHISE";
    const { data: wholesaleSettings } = useGetWholesaleSettingsQuery(undefined, {
        skip: !canWholesaleBill,
    });
    const { data: franchiseSettings } = useGetFranchiseSettingsQuery(undefined, {
        skip: !isFranchiseShop,
    });
    const { data: activeComboRules } = useGetActiveComboRulesQuery(undefined, {
        skip: billType === BILL_TYPES.NON_LISTED,
    });

    const [searchedCreditNotes, setSearchedCreditNotes] = useState([]);

    const handleFoundCreditNotes = useCallback((usable) => {
        setSearchedCreditNotes((prev) => {
            const next = [...prev];
            for (const row of usable || []) {
                if (row?.credit_note_id && !next.some((p) => p.credit_note_id === row.credit_note_id)) {
                    next.push(row);
                }
            }
            return next;
        });
    }, []);

    const comboCartFingerprint = useMemo(
        () =>
            cart
                .map(
                    (item) =>
                        `${item.variant_id}:${item.quantity}:${item.price_type}:${item.combo_eligible === true ? 1 : 0}:${item.special_price}:${item.price_overridden === true ? 1 : 0}:${item.purchase_price}:${item.expenses}`
                )
                .join("|"),
        [cart]
    );

    useEffect(() => {
        if (myShop) {
            dispatch(
                setBillingShopContext({
                    shop_name: myShop.shop_name,
                    shop_type: myShop.shop_type || shopType || "",
                })
            );
        } else if (shopType) {
            dispatch(setBillingShopContext({ shop_type: shopType }));
        }
    }, [myShop, shopType, dispatch]);

    useEffect(() => {
        if (shopType === "FRANCHISE" && pricingMode === "WHOLESALE") {
            dispatch(setPricingMode("RETAIL"));
        }
    }, [shopType, pricingMode, dispatch]);

    useEffect(() => {
        if (wholesaleSettings?.wholesale_markup_percent != null) {
            dispatch(setWholesaleMarkupPercent(wholesaleSettings.wholesale_markup_percent));
        }
    }, [wholesaleSettings?.wholesale_markup_percent, dispatch]);

    useEffect(() => {
        if (franchiseSettings?.franchise_markup_percent != null) {
            dispatch(setFranchiseMarkupPercent(franchiseSettings.franchise_markup_percent));
        }
    }, [franchiseSettings?.franchise_markup_percent, dispatch]);

    useEffect(() => {
        dispatch(recalculateCartGst());
    }, [dispatch]);

    useEffect(() => {
        if (billType === BILL_TYPES.NON_LISTED) return;
        dispatch(applyComboPricing(activeComboRules || []));
    }, [billType, comboCartFingerprint, activeComboRules, pricingMode, wholesaleSettings?.wholesale_markup_percent, dispatch]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 lg:h-[calc(100vh-7rem)]">
            <div className="col-span-1 lg:col-span-6 bg-white border border-gray-300 rounded flex flex-col min-h-[320px] lg:h-full p-3">
                {canWholesaleBill && billType !== BILL_TYPES.NON_LISTED && (
                    <div className="mb-2 flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-gray-600">Billing</span>
                        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => dispatch(setPricingMode("RETAIL"))}
                                className={`px-3 py-1.5 text-xs font-semibold ${
                                    pricingMode !== "WHOLESALE"
                                        ? "bg-blue-600 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                Retail
                            </button>
                            <button
                                type="button"
                                onClick={() => dispatch(setPricingMode("WHOLESALE"))}
                                className={`px-3 py-1.5 text-xs font-semibold ${
                                    pricingMode === "WHOLESALE"
                                        ? "bg-teal-600 text-white"
                                        : "bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                Wholesale
                            </button>
                        </div>
                        {pricingMode === "WHOLESALE" && (
                            <span className="text-[11px] text-teal-700">
                                Wholesale @ {Number(wholesaleSettings?.wholesale_markup_percent ?? 40)}%
                            </span>
                        )}
                    </div>
                )}
                {billType === BILL_TYPES.NON_LISTED ? (
                    <ManualItemsPanel />
                ) : (
                    <ProductPicker shop_id={shop_id} cart={cart} />
                )}
            </div>

            <div className="col-span-1 lg:col-span-6 bg-white border border-gray-300 rounded flex flex-col min-h-[320px] lg:h-full p-3">
                <CustomerSearch
                    shop_id={shop_id}
                    foundNotes={searchedCreditNotes}
                    onFound={handleFoundCreditNotes}
                />
                <CartPanel />
                <CheckoutPanel
                    shop_id={shop_id}
                    searchedCreditNotes={searchedCreditNotes}
                    onSearchedCreditNotesChange={setSearchedCreditNotes}
                />
            </div>

            {/* Modals */}
            <VariantPickerModal />
            <CreateCustomerModal />
            <UpgradeGSTModal />
            <EditCustomerModal />
        </div>
    );
}