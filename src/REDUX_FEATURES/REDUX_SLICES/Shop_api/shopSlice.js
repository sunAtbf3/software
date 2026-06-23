// REDUX_SLICES/Shop_api/shopSlice.js
//
// Shop UI State: modals, forms, filters, pagination

import { createSlice } from "@reduxjs/toolkit";

// ── Empty Forms ──────────────────────────────────────────────────────────────

const EMPTY_SHOP_FORM = {
    shop_code: "",
    shop_name: "",
    address: "",
    city: "",
    state_code: "",
    pincode: "",
    phone: "",
    email: "",
    gst_number: "",
    owner_user_id: "",
    sales_channels: [],
    shop_type: "OWNER",
    remarks: "",
    is_active: true,
};

// ── Initial State ────────────────────────────────────────────────────────────

const initialState = {
    // Modals
    showAddForm: false,
    showEditForm: false,
    selectedShop: null,

    // Form Data
    formData: { ...EMPTY_SHOP_FORM },
    formErrors: {},

    // Filters & Pagination
    search: "",
    cityFilter: "",
    activeFilter: "",
    currentPage: 1,
    pageSize: 20,

    // Submitting
    isSubmitting: false,
};

// ── Available Sales Channels (from backend docs) ─────────────────────────────
export const SALES_CHANNELS = ["WALK_IN", "ONLINE", "WHOLESALE", "MHM", "OWB", "OTHER"];

const shopSlice = createSlice({
    name: "shop",
    initialState,
    reducers: {

        // ── Add Form ──────────────────────────────────────────────────────────
        openAddForm: (state) => {
            state.showAddForm = true;
            state.formData = { ...EMPTY_SHOP_FORM };
            state.formErrors = {};
        },
        closeAddForm: (state) => {
            state.showAddForm = false;
            state.formData = { ...EMPTY_SHOP_FORM };
            state.formErrors = {};
        },

        // ── Edit Form ─────────────────────────────────────────────────────────
        openEditForm: (state, action) => {
            const shop = action.payload;
            state.showEditForm = true;
            state.selectedShop = shop;
            state.formData = {
                shop_code: shop.shop_code || "",
                shop_name: shop.shop_name || "",
                address: shop.address || "",
                city: shop.city || "",
                state_code: shop.state_code || "",
                pincode: shop.pincode || "",
                phone: shop.phone || "",
                email: shop.email || "",
                gst_number: shop.gst_number || "",
                owner_user_id: shop.owner_user_id || "",
                sales_channels: shop.sales_channels || [],
                shop_type: shop.shop_type || "OWNER",
                remarks: shop.remarks || "",
                is_active: shop.is_active ?? true,
            };
            state.formErrors = {};
        },
        closeEditForm: (state) => {
            state.showEditForm = false;
            state.selectedShop = null;
            state.formData = { ...EMPTY_SHOP_FORM };
            state.formErrors = {};
        },

        // ── Form Updates ──────────────────────────────────────────────────────
        updateFormData: (state, action) => {
            const payload = action.payload;
            if (payload && typeof payload === "object") {
                state.formData = { ...state.formData, ...payload };
                const field = Object.keys(payload)[0];
                if (field && state.formErrors[field]) {
                    delete state.formErrors[field];
                }
            }
        },
        setFormErrors: (state, action) => {
            state.formErrors = action.payload;
        },
        clearFormErrors: (state) => {
            state.formErrors = {};
        },

        // ── Filters & Pagination ──────────────────────────────────────────────
        setSearch: (state, action) => {
            state.search = action.payload;
            state.currentPage = 1;
        },
        setCityFilter: (state, action) => {
            state.cityFilter = action.payload;
            state.currentPage = 1;
        },
        setActiveFilter: (state, action) => {
            state.activeFilter = action.payload;
            state.currentPage = 1;
        },
        setCurrentPage: (state, action) => {
            state.currentPage = action.payload;
        },
        setPageSize: (state, action) => {
            state.pageSize = action.payload;
            state.currentPage = 1;
        },
        resetFilters: (state) => {
            state.search = "";
            state.cityFilter = "";
            state.activeFilter = "";
            state.currentPage = 1;
        },

        // ── Submitting ────────────────────────────────────────────────────────
        setSubmitting: (state, action) => {
            state.isSubmitting = action.payload;
        },
    },
});

export const {
    openAddForm,
    closeAddForm,
    openEditForm,
    closeEditForm,
    updateFormData,
    setFormErrors,
    clearFormErrors,
    setSearch,
    setCityFilter,
    setActiveFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
    setSubmitting,
} = shopSlice.actions;

export default shopSlice.reducer;
