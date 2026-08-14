// TABS/SALES/BillingTab_Compo/CartPanel.jsx
//
// Cart panel - displays items, quantity controls, price type selector
// Pure Redux - no API calls
// UPDATED: Price type options to match backend (SPECIAL, RETAIL, WHOLESALE, MRP, ONLINE)

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Trash2, Plus, Minus } from "lucide-react";
import {
    updateCartQty,
    updatePriceType,
    updateCartUnitPrice,
    removeFromCart,
    removeManualItem,
    updateManualItem,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { useGetActiveComboRulesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ComboRule_api/comboRuleApi";
import { formatGstPercentLabel } from "../../../../utils/billingCart.utils";
import ProductCode from "../../../shared/ProductCode";
import { formatAttributesDisplay } from "../../../../utils/variantAttributes.utils";
import { isWithGstBill, BILL_TYPES } from "../../../../constants/billingBillTypes";
import { useShopPricingVisibility, isSpecialPriceOnlyShopType } from "../../../../utils/shopPricingVisibility";
import { buildComboCartHints, priceKey } from "../../../../utils/comboPricing.utils";

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const formatPriceInput = (value) => {
    const n = toNumber(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

/**
 * Slightly larger editable Special Price under the product name.
 * Catalog listing special_price is not mutated — only this cart line's unit_price.
 * Cannot exceed this item's MRP — message shows while filling.
 */
function CartSpecialPriceInput({ variantId, unitPrice, catalogSpecial, overridden, mrp }) {
    const dispatch = useDispatch();
    const [draft, setDraft] = useState(() => formatPriceInput(unitPrice));
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState("");

    const mrpCap = Number(mrp);
    const hasMrpCap = Number.isFinite(mrpCap) && mrpCap > 0;

    useEffect(() => {
        if (!focused) {
            setDraft(formatPriceInput(unitPrice));
        }
    }, [unitPrice, focused]);

    const applyPrice = (raw, { clampDraft } = {}) => {
        const trimmed = String(raw ?? "").trim();
        if (trimmed === "") {
            setError("");
            if (clampDraft) setDraft(formatPriceInput(unitPrice));
            return;
        }
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n < 0) {
            setError("Enter a valid amount");
            if (clampDraft) setDraft(formatPriceInput(unitPrice));
            return;
        }
        if (hasMrpCap && n > mrpCap + 0.005) {
            setError(`Cannot exceed MRP ₹${formatPriceInput(mrpCap)}`);
            dispatch(updateCartUnitPrice({ variant_id: variantId, unit_price: mrpCap }));
            if (clampDraft) setDraft(formatPriceInput(mrpCap));
            return;
        }
        setError("");
        dispatch(updateCartUnitPrice({ variant_id: variantId, unit_price: n }));
        if (clampDraft) setDraft(formatPriceInput(n));
    };

    return (
        <div className="inline-flex flex-col gap-0.5 min-w-0">
            <label className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-md pl-1.5 pr-1 py-0.5">
                <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">Special ₹</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={hasMrpCap ? mrpCap : undefined}
                    step="0.01"
                    value={draft}
                    onFocus={(e) => {
                        setFocused(true);
                        e.target.select();
                    }}
                    onChange={(e) => {
                        const next = e.target.value;
                        setDraft(next);
                        if (next === "") {
                            setError("");
                            return;
                        }
                        applyPrice(next);
                    }}
                    onBlur={() => {
                        setFocused(false);
                        applyPrice(draft, { clampDraft: true });
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className={`w-[4.75rem] h-7 text-sm font-semibold tabular-nums bg-white border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 ${
                        error
                            ? "border-red-400 text-red-700 focus:ring-red-300"
                            : "border-gray-300 text-gray-800 focus:ring-blue-400"
                    }`}
                    title={
                        hasMrpCap
                            ? `Max MRP ₹${formatPriceInput(mrpCap)}. Listing special remains ₹${formatPriceInput(catalogSpecial)}`
                            : overridden
                            ? `Edited for this bill. Listing special remains ₹${formatPriceInput(catalogSpecial)}`
                            : "Edit sell price for this bill only"
                    }
                    aria-label="Special price for this bill"
                    aria-invalid={Boolean(error)}
                />
            </label>
            {error ? (
                <span className="text-[10px] text-red-600 font-medium leading-tight max-w-[11rem]">
                    {error}
                </span>
            ) : null}
        </div>
    );
}

export default function CartPanel() {
    const dispatch = useDispatch();
    const { cart, manualCart, billType } = useSelector((state) => state.billing);
    const { shopType, isShopScoped } = useShopPricingVisibility();
    // OWNER + FRANCHISE (and shop staff while type loads): Special price only — no MRP dropdown.
    const specialPriceOnlyBilling =
        isShopScoped || isSpecialPriceOnlyShopType(shopType);
    const withGst = isWithGstBill(billType);

    const { data: activeComboRules } = useGetActiveComboRulesQuery(undefined, {
        skip: billType === BILL_TYPES.NON_LISTED,
    });

    const comboHints = useMemo(
        () => buildComboCartHints(cart, activeComboRules || []),
        [cart, activeComboRules]
    );

    const items = billType === BILL_TYPES.NON_LISTED ? manualCart : cart;

    const handleQuantityChange = (id, newQty) => {
        const qty = toNumber(newQty);
        if (qty >= 0) {
            if (billType === BILL_TYPES.NON_LISTED) {
                if (qty === 0) {
                    dispatch(removeManualItem(id));
                } else {
                    dispatch(updateManualItem({ id, quantity: qty }));
                }
            } else {
                dispatch(updateCartQty({ variant_id: id, quantity: qty }));
            }
        }
    };

    const handlePriceTypeChange = (variantId, priceType) => {
        dispatch(updatePriceType({ variant_id: variantId, price_type: priceType }));
    };

    const handleRemove = (id) => {
        if (billType === BILL_TYPES.NON_LISTED) {
            dispatch(removeManualItem(id));
        } else {
            dispatch(removeFromCart(id));
        }
    };

    if (items.length === 0) {
        return (
            <div className="flex-1 min-h-[180px] flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50">
                <div className="text-center py-8">
                    <p className="text-gray-400 font-semibold">🛒 Cart is empty</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {billType === BILL_TYPES.NON_LISTED
                            ? "Fill details in the Manual Items form on the left to add items"
                            : "Scan barcode or click a product to add items"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
            {billType !== BILL_TYPES.NON_LISTED && comboHints.groups.length > 0 && (
                <div className="sticky top-0 z-20 border-b border-blue-100 bg-blue-50 px-3 py-2 space-y-1">
                    {comboHints.groups.map((group) => (
                        <p key={group.price_key} className="text-[11px] text-blue-800 leading-snug">
                            {group.sets_applied > 0 ? (
                                <>
                                    <span className="font-semibold">Combo applied</span>
                                    {" — "}
                                    {group.trigger_qty} for ₹{toNumber(group.combo_price).toFixed(0)}
                                    {group.needed_for_next > 0
                                        ? ` · Add ${group.needed_for_next} more @ ₹${toNumber(group.special_price).toFixed(0)} for next set`
                                        : null}
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold">Combo offer</span>
                                    {" — "}
                                    {group.trigger_qty} for ₹{toNumber(group.combo_price).toFixed(0)}
                                    {" · "}
                                    Add {group.needed_for_next} more @ ₹{toNumber(group.special_price).toFixed(0)} to unlock
                                </>
                            )}
                        </p>
                    ))}
                </div>
            )}
            <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
            <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                <thead className="bg-white sticky top-0 border-b border-gray-200 shadow-sm z-10">
                    <tr>
                        <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold">Item Details</th>
                        <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold w-24">Qty</th>
                        <th className="px-3 py-2 text-right text-xs text-gray-500 font-semibold">Total</th>
                        <th className="px-2 py-2"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.map((item) => {
                        const itemId = billType === BILL_TYPES.NON_LISTED ? item.id : item.variant_id;
                        const itemName = billType === BILL_TYPES.NON_LISTED ? item.item_name : item.product_name;
                        const itemTotal = billType === BILL_TYPES.NON_LISTED ? item.unit_price * item.quantity : item.line_total;
                        const isComboEligible =
                            billType !== BILL_TYPES.NON_LISTED &&
                            item.combo_eligible === true &&
                            item.price_overridden !== true;
                        const itemPriceKey = priceKey(item.special_price ?? item.retail_price);
                        const groupHint = isComboEligible
                            ? comboHints.byPriceKey.get(itemPriceKey)
                            : null;

                        return (
                            <tr key={itemId} className="bg-white">
                                <td className="px-3 py-3">
                                    <p className="font-semibold text-gray-800 text-xs">{itemName}</p>
                                    {billType !== BILL_TYPES.NON_LISTED && item.product_code && (
                                        <ProductCode as="p" className="text-[11px] mt-0.5" code={item.product_code} />
                                    )}
                                    {billType !== BILL_TYPES.NON_LISTED && formatAttributesDisplay(item.variant_attributes) && (
                                        <p className="text-[10px] text-gray-500 mt-0.5 leading-snug break-words">
                                            {formatAttributesDisplay(item.variant_attributes)}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        {billType === BILL_TYPES.NON_LISTED ? (
                                            <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-1 py-0.5 rounded">
                                                MRP: ₹{toNumber(item.mrp).toFixed(2)}
                                            </span>
                                        ) : specialPriceOnlyBilling ? (
                                            <>
                                                <CartSpecialPriceInput
                                                    variantId={item.variant_id}
                                                    unitPrice={
                                                        item.price_overridden === true
                                                            ? item.unit_price
                                                            : (item.special_price ?? item.retail_price)
                                                    }
                                                    catalogSpecial={item.special_price ?? item.retail_price}
                                                    overridden={item.price_overridden === true}
                                                    mrp={item.mrp}
                                                />
                                                {item.combo_applied ? (
                                                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        Combo @ ₹{toNumber(item.combo_unit_price ?? item.unit_price).toFixed(2)}
                                                    </span>
                                                ) : groupHint && groupHint.needed_for_next > 0 ? (
                                                    <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                                                        Add {groupHint.needed_for_next} more → {groupHint.trigger_qty} for ₹{toNumber(groupHint.combo_price).toFixed(0)}
                                                    </span>
                                                ) : null}
                                                {formatGstPercentLabel(item.gst_percent) ? (
                                                    <span className="text-[10px] font-medium text-indigo-700">
                                                        {item.gst_type === "IGST" ? "IGST" : item.gst_type === "EXEMPT" ? "Exempt" : "CGST+SGST"}{" "}
                                                        {formatGstPercentLabel(item.gst_percent)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-amber-700" title="Set GST % in product master">
                                                        GST not set
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <select
                                                    value={item.price_type}
                                                    onChange={(e) => handlePriceTypeChange(item.variant_id, e.target.value)}
                                                    className="text-[10px] py-0.5 px-1 border border-gray-300 rounded bg-gray-50"
                                                >
                                                    <option value="SPECIAL">Special</option>
                                                    <option value="MRP">MRP (₹{toNumber(item.mrp).toFixed(2)})</option>
                                                </select>
                                                {(item.price_type === "SPECIAL" || item.price_type === "RETAIL") && (
                                                    <CartSpecialPriceInput
                                                        variantId={item.variant_id}
                                                        unitPrice={
                                                            item.price_overridden === true
                                                                ? item.unit_price
                                                                : (item.special_price ?? item.retail_price)
                                                        }
                                                        catalogSpecial={item.special_price ?? item.retail_price}
                                                        overridden={item.price_overridden === true}
                                                        mrp={item.mrp}
                                                    />
                                                )}
                                                {item.combo_applied ? (
                                                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        Combo @ ₹{toNumber(item.combo_unit_price ?? item.unit_price).toFixed(2)}
                                                    </span>
                                                ) : groupHint && groupHint.needed_for_next > 0 ? (
                                                    <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                                                        Add {groupHint.needed_for_next} more → {groupHint.trigger_qty} for ₹{toNumber(groupHint.combo_price).toFixed(0)}
                                                    </span>
                                                ) : null}
                                                {formatGstPercentLabel(item.gst_percent) ? (
                                                    <span className="text-[10px] font-medium text-indigo-700">
                                                        {item.gst_type === "IGST" ? "IGST" : item.gst_type === "EXEMPT" ? "Exempt" : "CGST+SGST"}{" "}
                                                        {formatGstPercentLabel(item.gst_percent)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-amber-700" title="Set GST % in product master">
                                                        GST not set
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="flex items-center justify-center border border-gray-300 rounded bg-white">
                                        <button
                                            onClick={() => handleQuantityChange(itemId, item.quantity - 1)}
                                            className="px-2 py-0.5 text-gray-500 hover:bg-gray-100"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(itemId, e.target.value)}
                                            className="w-10 text-center text-sm font-semibold border-x border-gray-300 py-0.5 p-0 focus:ring-0"
                                        />
                                        <button
                                            onClick={() => handleQuantityChange(itemId, item.quantity + 1)}
                                            className="px-2 py-0.5 text-gray-500 hover:bg-gray-100"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-right">
                                    <p className="font-bold text-gray-800">
                                        ₹{toNumber(
                                            withGst
                                                ? itemTotal + (item.gst_amount || 0)
                                                : itemTotal
                                        ).toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        @ ₹{toNumber(item.unit_price).toFixed(2)}
                                        {withGst && (item.gst_amount || 0) > 0 &&
                                            ` + GST ₹${toNumber(item.gst_amount).toFixed(2)}`}
                                    </p>
                                </td>
                                <td className="px-2 py-3 text-center">
                                    <button
                                        onClick={() => handleRemove(itemId)}
                                        className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            </div>
        </div>
    );
}
