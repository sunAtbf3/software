// REDUX_SLICES/User_api/userSlice.js

import { createSlice } from "@reduxjs/toolkit";

const EMPTY_FORM = {
    name: "",
    phone: "",
    password: "",
    role: "WH_MANAGER",
    warehouse_id: "",
    shop_id: "",
    remarks: "",
};

const initialState = {
    // UI State
    showAddForm: false,
    showEditForm: false,
    selectedUser: null,

    // Filters & Pagination
    search: "",
    roleFilter: "",
    activeFilter: "",   // '', 'true', 'false'
    currentPage: 1,
    pageSize: 20,

    // Form State
    formData: { ...EMPTY_FORM },

    // Validation Errors
    formErrors: {},

    // Submitting flag
    isSubmitting: false,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {

        // ── Add Form ──────────────────────────────────────────────────────────────
        openAddForm: (state, action) => {
            state.showAddForm = true;
            state.formData = { ...EMPTY_FORM, ...(action.payload || {}) };
            state.formErrors = {};
        },
        closeAddForm: (state) => {
            state.showAddForm = false;
            state.formData = { ...EMPTY_FORM };
            state.formErrors = {};
        },

        // ── Edit Form ─────────────────────────────────────────────────────────────
        openEditForm: (state, action) => {
            const u = action.payload;
            state.showEditForm = true;
            state.selectedUser = u;
            state.formData = {
                name: u.name || "",
                phone: u.phone || "",
                password: "",             // never pre-fill password
                role: u.role || "WH_MANAGER",
                warehouse_id: u.warehouse_id || "",
                shop_id: u.shop_id || "",
                remarks: u.remarks || "",
            };
            state.formErrors = {};
        },
        closeEditForm: (state) => {
            state.showEditForm = false;
            state.selectedUser = null;
            state.formData = { ...EMPTY_FORM };
            state.formErrors = {};
        },

        // ── Form Field Updates ────────────────────────────────────────────────────
        updateFormData: (state, action) => {
            const payload = action.payload;
            if (payload && typeof payload === "object" && !Array.isArray(payload)) {
                state.formData = { ...state.formData, ...payload };

                // When role changes, clear the assignment fields to avoid invalid combos
                if (payload.role !== undefined) {
                    const role = payload.role;
                    const isWH = ["WH_MANAGER", "WH_STOCK_LISTER"].includes(role);
                    const isShop = ["SHOP_OWNER", "BILLING_STAFF", "SHOP_MANAGER"].includes(role);
                    const isSuper = role === "SUPER_ADMIN";
                    if (isWH) { state.formData.shop_id = ""; }
                    if (isShop) { state.formData.warehouse_id = ""; }
                    if (isSuper) { state.formData.warehouse_id = ""; state.formData.shop_id = ""; }
                }

                // Clear error for the edited field
                const fieldName = Object.keys(payload)[0];
                if (fieldName && state.formErrors[fieldName]) {
                    delete state.formErrors[fieldName];
                }
            }
        },
        setFormErrors: (state, action) => {
            state.formErrors = action.payload;
        },
        clearFormErrors: (state) => {
            state.formErrors = {};
        },

        // ── Filters & Pagination ──────────────────────────────────────────────────
        setSearch: (state, action) => {
            state.search = action.payload;
            state.currentPage = 1;
        },
        setRoleFilter: (state, action) => {
            state.roleFilter = action.payload;
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
            state.roleFilter = "";
            state.activeFilter = "";
            state.currentPage = 1;
        },

        // ── Submitting flag ───────────────────────────────────────────────────────
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
    setRoleFilter,
    setActiveFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
    setSubmitting,
} = userSlice.actions;

export default userSlice.reducer;