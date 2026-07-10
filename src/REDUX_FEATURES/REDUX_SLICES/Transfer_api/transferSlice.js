// REDUX_SLICES/Transfer_api/transferSlice.js
//
// UI State for Transfers: cart management, form state, filters, loading

import { createSlice } from "@reduxjs/toolkit";

// ── Empty Cart Item Template ─────────────────────────────────────────────
const EMPTY_CART_ITEM = {
    variant_id: "",
    product_name: "",
    quantity: 1,
    available_stock: 0,
    batch_number: "",
    unit: "Pcs",
};

// ── Initial State ────────────────────────────────────────────────────────
const initialState = {
    // Cart items (shared across all transfer tabs)
    cart: [],
    
    // Form state
    fromLocation: "",
    toLocation: "",
    reason: "",
    remarks: "",
    
    // Form validation errors
    formErrors: {},
    
    // UI state
    showForm: false,
    isSubmitting: false,
    
    // Filters for Transfer History tab
    ledgerFilters: {
        request_type: "",
        status: "",
        from_date: "",
        to_date: "",
    },
    ledgerCurrentPage: 1,
    ledgerPageSize: 20,
    
    // Idempotency key for current transfer
    currentIdempotencyKey: null,
};

const transferSlice = createSlice({
    name: "transfer",
    initialState,
    reducers: {

        // ── Cart Management ─────────────────────────────────────────────────
        addToCart: (state, action) => {
            const { variant_id, product_name, available_stock, batch_number, unit } = action.payload;
            const existing = state.cart.find(item => item.variant_id === variant_id);
            
            if (existing) {
                existing.quantity += 1;
                if (existing.quantity > existing.available_stock) {
                    existing.quantity = existing.available_stock;
                }
            } else {
                state.cart.push({
                    variant_id,
                    product_name,
                    quantity: 1,
                    available_stock,
                    batch_number: batch_number || "",
                    unit: unit || "Pcs",
                });
            }
        },
        
        removeFromCart: (state, action) => {
            const variant_id = action.payload;
            state.cart = state.cart.filter(item => item.variant_id !== variant_id);
        },
        
        updateCartQuantity: (state, action) => {
            const { variant_id, quantity } = action.payload;
            const item = state.cart.find(item => item.variant_id === variant_id);
            if (item) {
                const newQty = Math.min(Math.max(1, quantity), item.available_stock);
                item.quantity = newQty;
            }
        },
        
        clearCart: (state) => {
            state.cart = [];
        },
        
        // ── Form State ──────────────────────────────────────────────────────
        setFromLocation: (state, action) => {
            state.fromLocation = action.payload;
        },
        
        setToLocation: (state, action) => {
            state.toLocation = action.payload;
        },
        
        setReason: (state, action) => {
            state.reason = action.payload;
        },
        
        setRemarks: (state, action) => {
            state.remarks = action.payload;
        },
        
        setFormErrors: (state, action) => {
            state.formErrors = action.payload;
        },
        
        clearFormErrors: (state) => {
            state.formErrors = {};
        },
        
        resetForm: (state) => {
            // state.fromLocation = "";
            state.toLocation = "";
            state.reason = "";
            state.remarks = "";
            state.cart = [];
            state.formErrors = {};
        },
        
        // ── UI State ────────────────────────────────────────────────────────
        setShowForm: (state, action) => {
            state.showForm = action.payload;
        },
        
        setIsSubmitting: (state, action) => {
            state.isSubmitting = action.payload;
        },
        
        setIdempotencyKey: (state, action) => {
            state.currentIdempotencyKey = action.payload;
        },
        
        // ── Ledger Filters (for Transfer History tab) ────────────────────────
        setLedgerRequestType: (state, action) => {
            state.ledgerFilters.request_type = action.payload;
            state.ledgerCurrentPage = 1;
        },

        setLedgerStatus: (state, action) => {
            state.ledgerFilters.status = action.payload;
            state.ledgerCurrentPage = 1;
        },
        
        setLedgerDateRange: (state, action) => {
            const { from_date, to_date } = action.payload;
            if (from_date !== undefined) state.ledgerFilters.from_date = from_date;
            if (to_date !== undefined) state.ledgerFilters.to_date = to_date;
            state.ledgerCurrentPage = 1;
        },
        
        setLedgerCurrentPage: (state, action) => {
            state.ledgerCurrentPage = action.payload;
        },
        
        setLedgerPageSize: (state, action) => {
            state.ledgerPageSize = action.payload;
            state.ledgerCurrentPage = 1;
        },
        
        resetLedgerFilters: (state) => {
            state.ledgerFilters = {
                request_type: "",
                status: "",
                from_date: "",
                to_date: "",
            };
            state.ledgerCurrentPage = 1;
        },
    },
});

export const {
    // Cart actions
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    // Form actions
    setFromLocation,
    setToLocation,
    setReason,
    setRemarks,
    setFormErrors,
    clearFormErrors,
    resetForm,
    // UI actions
    setShowForm,
    setIsSubmitting,
    setIdempotencyKey,
    // Ledger filter actions
    setLedgerRequestType,
    setLedgerStatus,
    setLedgerDateRange,
    setLedgerCurrentPage,
    setLedgerPageSize,
    resetLedgerFilters,
} = transferSlice.actions;

export default transferSlice.reducer;