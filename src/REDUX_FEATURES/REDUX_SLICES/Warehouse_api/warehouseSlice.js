// REDUX_SLICES/Warehouse_api/warehouseSlice.js

import { createSlice } from "@reduxjs/toolkit";

const EMPTY_FORM = {
    warehouse_code: "",
    warehouse_name: "",
    address: "",
    city: "",
    manager_name: "",
    gstin: "",
    legal_name: "",
    state_code: "",
    is_active: true,
    remarks: "",
};

const initialState = {
    // UI State
    showAddForm: false,
    showEditForm: false,
    showDetailsModal: false,
    selectedWarehouse: null,

    // Filters & Pagination
    search: "",
    cityFilter: "",
    activeFilter: "",   // '', 'true', 'false'
    currentPage: 1,
    pageSize: 10,

    // Form State
    formData: { ...EMPTY_FORM },

    // Validation Errors
    formErrors: {},

    // Submitting flag
    isSubmitting: false,
};

const warehouseSlice = createSlice({
    name: "warehouse",
    initialState,
    reducers: {

        // ── Add Form ──────────────────────────────────────────────────────────────
        openAddForm: (state) => {
            state.showAddForm = true;
            state.formData = { ...EMPTY_FORM };
            state.formErrors = {};
        },
        closeAddForm: (state) => {
            state.showAddForm = false;
            state.formData = { ...EMPTY_FORM };
            state.formErrors = {};
        },

        // ── Edit Form ─────────────────────────────────────────────────────────────
        openEditForm: (state, action) => {
            const wh = action.payload;
            state.showEditForm = true;
            state.selectedWarehouse = wh;
            state.formData = {
                warehouse_code: wh.warehouse_code || "",
                warehouse_name: wh.warehouse_name || "",
                address: wh.address || "",
                city: wh.city || "",
                manager_name: wh.manager_name || "",
                gstin: wh.gstin || "",
                legal_name: wh.legal_name || "",
                state_code: wh.state_code || "",
                is_active: wh.is_active ?? true,
                remarks: wh.remarks || "",
            };
            state.formErrors = {};
        },
        closeEditForm: (state) => {
            state.showEditForm = false;
            state.selectedWarehouse = null;
            state.formData = { ...EMPTY_FORM };
            state.formErrors = {};
        },

        // ── Details Modal ─────────────────────────────────────────────────────────
        openDetailsModal: (state, action) => {
            state.showDetailsModal = true;
            state.selectedWarehouse = action.payload;
        },
        closeDetailsModal: (state) => {
            state.showDetailsModal = false;
            state.selectedWarehouse = null;
        },

        // ── Form Field Updates ────────────────────────────────────────────────────
        updateFormData: (state, action) => {
            const payload = action.payload;
            if (payload && typeof payload === "object" && !Array.isArray(payload)) {
                state.formData = { ...state.formData, ...payload };
                // Clear the specific field's error when user edits it
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
    openDetailsModal,
    closeDetailsModal,
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
} = warehouseSlice.actions;

export default warehouseSlice.reducer;