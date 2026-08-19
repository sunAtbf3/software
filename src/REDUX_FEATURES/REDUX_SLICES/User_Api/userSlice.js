// REDUX_SLICES/User_api/userSlice.js

import { createSlice } from "@reduxjs/toolkit";
import {
    toOwnerFormRole,
    isWarehouseFormRole,
    isShopAssignmentFormRole,
    getOwnerShopTypeFilter,
    resolveApiRole,
} from "../../../Components/TABS/SETTINGS/UserTab/UserShared/userRoles";

const EMPTY_FORM = {
    name: "",
    phone: "",
    password: "",
    role: "WH_MANAGER",
    warehouse_id: "",
    shop_id: "",
    remarks: "",
    role_title: "",
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
                role: toOwnerFormRole(u) || "WH_MANAGER",
                warehouse_id: u.warehouse_id || "",
                shop_id: u.shop_id || u.owned_shop?.shop_id || u.shop?.shop_id || "",
                remarks: u.remarks || "",
                role_title: u.role_title || "",
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
                const prevRole = state.formData.role;
                state.formData = { ...state.formData, ...payload };

                // When role changes, clear the assignment fields to avoid invalid combos
                if (payload.role !== undefined) {
                    const role = payload.role;
                    const apiRole = resolveApiRole(role);
                    if (isWarehouseFormRole(role)) { state.formData.shop_id = ""; }
                    if (isShopAssignmentFormRole(role)) { state.formData.warehouse_id = ""; }
                    if (apiRole === "SUPER_ADMIN" || apiRole === "ORG_MANAGER") {
                        state.formData.warehouse_id = "";
                        state.formData.shop_id = "";
                    }
                    if (apiRole !== "ORG_MANAGER") { state.formData.role_title = ""; }
                    // Mehta vs Franchise owner kinds share SHOP_OWNER but not the same shop list
                    if (prevRole !== role && getOwnerShopTypeFilter(prevRole) !== getOwnerShopTypeFilter(role)) {
                        if (payload.shop_id === undefined) state.formData.shop_id = "";
                    }
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