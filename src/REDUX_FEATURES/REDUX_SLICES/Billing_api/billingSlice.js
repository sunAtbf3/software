// REDUX_SLICES/Billing_api/billingSlice.js
//
// UI State for Billing Tab
// Manages: cart, customer selection, bill type, payment method
// UPDATED: Bill type values to match backend enum (GST_INVOICE | NON_GST_INVOICE)

import { createSlice } from "@reduxjs/toolkit";
import { aggregateCartTax } from "../../../utils/billingTax";
import { BILL_TYPES } from "../../../constants/billingBillTypes";
import { CUSTOMER_TYPES } from "../../../constants/customerTypes";
import { calculateGstOnAmount } from "../../../utils/billingCart.utils";
import { applyComboPricingToLines } from "../../../utils/comboPricing.utils";

// Helper: calculate line total
const calculateLineTotal = (unit_price, quantity) => unit_price * quantity;

const applyLineGst = (item, billType) => {
    if (
        billType !== BILL_TYPES.WITH_GST ||
        billType === BILL_TYPES.ESTIMATE ||
        item.gst_type === "EXEMPT"
    ) {
        item.gst_amount = 0;
        return;
    }
    item.gst_amount = calculateGstOnAmount(item.line_total, item.gst_percent);
};

const isSpecialLikePriceType = (priceType) =>
    !priceType || priceType === "SPECIAL" || priceType === "RETAIL";

const catalogSpecialOf = (item) => Number(item.special_price ?? item.retail_price) || 0;

const pricesMatch = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

/** Counter-only sell price. Never mutates catalog special_price. */
const parseCartUnitPrice = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    if (rounded > 9999999.99) return 9999999.99;
    return rounded;
};

const applyChargedPrice = (item, unitPrice, billType) => {
    item.unit_price = unitPrice;
    item.line_total = calculateLineTotal(unitPrice, item.quantity);
    applyLineGst(item, billType);
};

const clearComboOnItem = (item) => {
    item.combo_applied = false;
    item.combo_unit_price = null;
    item.combo_units = 0;
    item.normal_units = item.quantity;
};

const recalculateCartComboPricing = (state, rules = []) => {
    try {
        if (!Array.isArray(state.cart) || state.cart.length === 0) return;

        const lines = state.cart.map((item) => ({
            line_key: String(item.variant_id),
            variant_id: item.variant_id,
            quantity: item.quantity,
            special_price: catalogSpecialOf(item),
            combo_eligible:
                item.combo_eligible === true &&
                isSpecialLikePriceType(item.price_type) &&
                item.price_overridden !== true,
        }));

        const priced = applyComboPricingToLines(lines, Array.isArray(rules) ? rules : []);
        const byKey = new Map(priced.map((row) => [row.line_key, row]));

        state.cart.forEach((item) => {
            if (!isSpecialLikePriceType(item.price_type)) {
                clearComboOnItem(item);
                item.line_total = calculateLineTotal(item.unit_price, item.quantity);
                applyLineGst(item, state.billType);
                return;
            }

            // Cashier override: keep typed unit_price; do not restore catalog / combo.
            if (item.price_overridden === true) {
                clearComboOnItem(item);
                applyChargedPrice(item, Number(item.unit_price) || 0, state.billType);
                return;
            }

            const row = byKey.get(String(item.variant_id));
            const base = catalogSpecialOf(item);

            if (row && row.combo_applied) {
                item.unit_price = Number(row.unit_price);
                item.line_total = Number(row.line_total);
                item.combo_applied = true;
                item.combo_unit_price = row.combo_unit_price;
                item.combo_units = row.combo_units;
                item.normal_units = row.normal_units;
            } else {
                applyChargedPrice(item, base, state.billType);
                clearComboOnItem(item);
            }
            applyLineGst(item, state.billType);
        });
    } catch {
        // Fail soft — keep existing cart prices; backend remains authoritative on createBill.
    }
};

const initialState = {
    // Cart items
    cart: [],

    // Manual items for NON_LISTED_BILL
    manualCart: [],

    // Customer selection
    selectedCustomer: null,
    customerMobileInput: "",

    billType: BILL_TYPES.WITHOUT_GST,
    paymentMethod: "CASH",
    salesChannel: "WALK_IN",

    shopName: "",

    // UI state
    showVariantPicker: false,
    variantPickerTarget: null,
    showCreateCustomer: false,
    showUpgradeGst: false,
    showEditCustomer: false,
    lastCreatedBill: null,
    extraDiscount: 0,
};

const billingSlice = createSlice({
    name: "billing",
    initialState,
    reducers: {
        // ── Cart Actions ─────────────────────────────────────────────
        addToCart: (state, action) => {
            const variant = action.payload;
            const existing = state.cart.find(item => item.variant_id === variant.variant_id);

            const currentQty = existing ? existing.quantity : 0;
            const stockLimit = variant.quantity_available;
            const hasStockLimit =
                stockLimit != null && Number.isFinite(Number(stockLimit));
            if (hasStockLimit && currentQty + 1 > Number(stockLimit)) {
                return;
            }

            if (existing) {
                existing.quantity += 1;
                if (variant.combo_eligible === true) existing.combo_eligible = true;
                if (variant.product_code && !existing.product_code) existing.product_code = variant.product_code;
                existing.line_total = calculateLineTotal(existing.unit_price, existing.quantity);
                applyLineGst(existing, state.billType);
            } else {
                const newItem = {
                    variant_id: variant.variant_id,
                    product_name: variant.product_name,
                    system_barcode: variant.system_barcode,
                    product_code: variant.product_code || "",
                    variant_attributes: variant.variant_attributes,
                    quantity: 1,
                    price_type: variant.price_type || "SPECIAL",
                    unit_price: variant.unit_price,
                    retail_price: variant.retail_price,
                    wholesale_price: variant.wholesale_price,
                    special_price: variant.special_price,
                    mrp: variant.mrp,
                    online_price: variant.online_price,
                    gst_percent: variant.gst_percent,
                    gst_type: variant.gst_type || "CGST_SGST",
                    hsn_code: variant.hsn_code ?? variant.product?.hsn_code ?? null,
                    quantity_available: variant.quantity_available,
                    combo_eligible: variant.combo_eligible === true,
                    combo_applied: false,
                    combo_unit_price: null,
                    combo_units: 0,
                    price_overridden: false,
                    line_total: variant.unit_price,
                    gst_amount: 0,
                };
                applyLineGst(newItem, state.billType);
                state.cart.push(newItem);
            }
        },

        removeFromCart: (state, action) => {
            const variantId = action.payload;
            state.cart = state.cart.filter(item => item.variant_id !== variantId);
        },

        updateCartQty: (state, action) => {
            const { variant_id, quantity } = action.payload;
            const item = state.cart.find(i => i.variant_id === variant_id);
            if (item) {
                const newQty = Math.max(0, quantity);
                if (newQty === 0) {
                    state.cart = state.cart.filter(i => i.variant_id !== variant_id);
                } else {
                    const stockLimit = item.quantity_available;
                    const hasStockLimit =
                        stockLimit != null && Number.isFinite(Number(stockLimit));
                    if (!hasStockLimit || newQty <= Number(stockLimit)) {
                        item.quantity = newQty;
                        item.line_total = calculateLineTotal(item.unit_price, item.quantity);
                        applyLineGst(item, state.billType);
                    }
                }
            }
        },

        updatePriceType: (state, action) => {
            const { variant_id, price_type } = action.payload;
            const item = state.cart.find(i => i.variant_id === variant_id);
            if (item) {
                let newPrice = 0;
                switch (price_type) {
                    case "SPECIAL":
                        newPrice = item.special_price ?? item.retail_price;
                        break;
                    case "RETAIL":
                        newPrice = item.retail_price;
                        break;
                    case "WHOLESALE":
                        newPrice = item.wholesale_price;
                        break;
                    case "MRP":
                        newPrice = item.mrp;
                        break;
                    case "ONLINE":
                        newPrice = item.online_price;
                        break;
                    default:
                        newPrice = item.special_price ?? item.retail_price;
                }
                item.price_type = price_type;
                item.unit_price = newPrice;
                item.price_overridden = false;
                item.line_total = calculateLineTotal(item.unit_price, item.quantity);
                applyLineGst(item, state.billType);
            }
        },

        /**
         * Edit charged unit price on this cart line only.
         * Catalog special_price on the item (and product master) is never changed.
         */
        updateCartUnitPrice: (state, action) => {
            const { variant_id, unit_price } = action.payload || {};
            const item = state.cart.find((i) => i.variant_id === variant_id);
            if (!item) return;
            const parsed = parseCartUnitPrice(unit_price);
            if (parsed == null) return;

            const mrpCap = Number(item.mrp);
            const capped =
                Number.isFinite(mrpCap) && mrpCap > 0 && parsed > mrpCap
                    ? Math.round((mrpCap + Number.EPSILON) * 100) / 100
                    : parsed;

            const catalog = catalogSpecialOf(item);
            item.price_overridden = !pricesMatch(capped, catalog);
            if (item.price_overridden) {
                clearComboOnItem(item);
            }
            applyChargedPrice(item, capped, state.billType);
        },

        clearCart: (state) => {
            state.cart = [];
            state.extraDiscount = 0;
        },

        clearManualCart: (state) => {
            state.manualCart = [];
            state.extraDiscount = 0;
        },

        addManualItem: (state, action) => {
            const { id, item_name, quantity, unit_price, mrp } = action.payload;
            const existing = state.manualCart.find((i) => i.id === id);
            if (existing) {
                existing.item_name = item_name;
                existing.quantity = quantity;
                existing.unit_price = unit_price;
                existing.mrp = mrp;
            } else {
                state.manualCart.push({ id, item_name, quantity, unit_price, mrp });
            }
        },

        removeManualItem: (state, action) => {
            state.manualCart = state.manualCart.filter((i) => i.id !== action.payload);
        },

        updateManualItem: (state, action) => {
            const { id, ...fields } = action.payload;
            const item = state.manualCart.find((i) => i.id === id);
            if (item) Object.assign(item, fields);
        },

        /** Re-apply GST math on all lines (e.g. after formula fix or page reload). */
        recalculateCartGst: (state) => {
            state.cart.forEach((item) => applyLineGst(item, state.billType));
        },

        /**
         * Apply global combo rules to cart preview (SPECIAL/RETAIL only).
         * Backend createBill remains authoritative.
         */
        applyComboPricing: (state, action) => {
            recalculateCartComboPricing(state, action.payload || []);
        },

        // ── Customer Actions ─────────────────────────────────────────
        setSelectedCustomer: (state, action) => {
            state.selectedCustomer = action.payload;
            if (action.payload) {
                state.customerMobileInput = action.payload.mobile || "";
                state.cart.forEach((item) => applyLineGst(item, state.billType));
            }
        },

        clearSelectedCustomer: (state) => {
            state.selectedCustomer = null;
            state.customerMobileInput = "";
        },

        setCustomerMobileInput: (state, action) => {
            state.customerMobileInput = action.payload;
            // Clear selected customer when mobile changes
            if (state.selectedCustomer && state.selectedCustomer.mobile !== action.payload) {
                state.selectedCustomer = null;
            }
        },

        // ── Bill Settings ────────────────────────────────────────────
        setBillType: (state, action) => {
            state.billType = action.payload;
            state.cart.forEach((item) => applyLineGst(item, state.billType));
        },

        setBillingShopContext: (state, action) => {
            state.shopName = action.payload?.shop_name || "";
        },

        setPaymentMethod: (state, action) => {
            state.paymentMethod = action.payload;
        },

        setExtraDiscount: (state, action) => {
            const value = Math.max(0, Number(action.payload) || 0);
            state.extraDiscount = Number.isFinite(value) ? value : 0;
        },

        // ── UI State ─────────────────────────────────────────────────
        openVariantPicker: (state, action) => {
            state.showVariantPicker = true;
            state.variantPickerTarget = action.payload;
        },

        closeVariantPicker: (state) => {
            state.showVariantPicker = false;
            state.variantPickerTarget = null;
        },

        openCreateCustomer: (state) => {
            state.showCreateCustomer = true;
        },

        closeCreateCustomer: (state) => {
            state.showCreateCustomer = false;
        },

        openUpgradeGst: (state) => {
            state.showUpgradeGst = true;
        },

        closeUpgradeGst: (state) => {
            state.showUpgradeGst = false;
        },

        openEditCustomer: (state) => {
            state.showEditCustomer = true;
        },

        closeEditCustomer: (state) => {
            state.showEditCustomer = false;
        },

        setLastCreatedBill: (state, action) => {
            state.lastCreatedBill = action.payload;
        },

        clearLastCreatedBill: (state) => {
            state.lastCreatedBill = null;
        },
    },
});

// ── Selectors (computed values) ─────────────────────────────────────
export const selectCartSubtotal = (state) => {
    if (state.billing.billType === BILL_TYPES.NON_LISTED) {
        return state.billing.manualCart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    }
    return state.billing.cart.reduce((sum, item) => sum + item.line_total, 0);
};

export const selectCartGst = (state) => {
    if (state.billing.billType === BILL_TYPES.NON_LISTED) return 0;
    if (state.billing.billType !== BILL_TYPES.WITH_GST) return 0;
    return state.billing.cart.reduce((sum, item) => sum + (item.gst_amount || 0), 0);
};

export const selectCartTotal = (state) => {
    return selectCartSubtotal(state) + selectCartGst(state);
};

export const selectCartItemCount = (state) => {
    if (state.billing.billType === BILL_TYPES.NON_LISTED) {
        return state.billing.manualCart.reduce((sum, item) => sum + item.quantity, 0);
    }
    return state.billing.cart.reduce((sum, item) => sum + item.quantity, 0);
};

export const selectCartTaxSummary = (state) => {
    const { cart, manualCart, billType } = state.billing;
    if (billType === BILL_TYPES.NON_LISTED) {
        const subtotal = manualCart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        return {
            subtotal,
            gst_amount: 0,
            total_amount: subtotal,
            cgst: 0,
            sgst: 0,
            igst: 0,
            tax_mode: "EXEMPT",
        };
    }
    return aggregateCartTax(cart, billType);
};

export const selectExtraDiscount = (state) =>
    Math.max(0, Number(state.billing.extraDiscount) || 0);

export const {
    addToCart,
    removeFromCart,
    updateCartQty,
    updatePriceType,
    updateCartUnitPrice,
    clearCart,
    clearManualCart,
    addManualItem,
    removeManualItem,
    updateManualItem,
    recalculateCartGst,
    applyComboPricing,
    setSelectedCustomer,
    clearSelectedCustomer,
    setCustomerMobileInput,
    setBillType,
    setBillingShopContext,
    setPaymentMethod,
    setExtraDiscount,
    openVariantPicker,
    closeVariantPicker,
    openCreateCustomer,
    closeCreateCustomer,
    openUpgradeGst,
    closeUpgradeGst,
    openEditCustomer,
    closeEditCustomer,
    setLastCreatedBill,
    clearLastCreatedBill,
} = billingSlice.actions;

export default billingSlice.reducer;