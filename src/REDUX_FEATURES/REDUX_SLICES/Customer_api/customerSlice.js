// REDUX_SLICES/Customer_api/customerSlice.js
//
// UI State for Customers Tab (CRUD operations only)
// Not used in BillingTab — that uses billingSlice for customer selection

import { createSlice } from "@reduxjs/toolkit";
import { CUSTOMER_TYPES } from "../../../constants/customerTypes";

const emptyCustomerForm = {
    customer_type: CUSTOMER_TYPES.WALK_IN,
    mobile: "",
    name: "",
    email: "",
    company_name: "",
    gst_number: "",
    address: "",
    city: "",
    state_code: "",
    pincode: "",
    remarks: "",
};

const initialState = {
    // Filters & Pagination
    search: "",
    loyaltyFilter: "",
    currentPage: 1,
    pageSize: 20,

    // Modals
    showAddModal: false,
    showEditModal: false,
    showViewModal: false,
    selectedCustomer: null,

    // Form States
    addForm: { ...emptyCustomerForm },
    editForm: { ...emptyCustomerForm },

    // Errors
    formErrors: {},
};

const customerSlice = createSlice({
    name: "customer",
    initialState,
    reducers: {
        // Filters
        setSearch: (state, action) => {
            state.search = action.payload;
            state.currentPage = 1;
        },
        setLoyaltyFilter: (state, action) => {
            state.loyaltyFilter = action.payload;
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
            state.loyaltyFilter = "";
            state.currentPage = 1;
        },

        // Add Modal
        openAddModal: (state) => {
            state.showAddModal = true;
            state.addForm = { ...emptyCustomerForm };
            state.formErrors = {};
        },
        closeAddModal: (state) => {
            state.showAddModal = false;
            state.addForm = { ...emptyCustomerForm };
            state.formErrors = {};
        },
        updateAddForm: (state, action) => {
            state.addForm = { ...state.addForm, ...action.payload };
            // Clear error for this field if it exists
            const field = Object.keys(action.payload)[0];
            if (field && state.formErrors[field]) {
                delete state.formErrors[field];
            }
        },

        // Edit Modal
        openEditModal: (state, action) => {
            const customer = action.payload;
            state.showEditModal = true;
            state.selectedCustomer = customer;
            state.editForm = {
                customer_type: customer.customer_type || CUSTOMER_TYPES.WALK_IN,
                mobile: customer.mobile || "",
                name: customer.name || "",
                email: customer.email || "",
                company_name: customer.company_name || "",
                gst_number: customer.gst_number || "",
                address: customer.address || "",
                city: customer.city || "",
                state_code: customer.state_code || "",
                pincode: customer.pincode || "",
                remarks: customer.remarks || "",
            };
            state.formErrors = {};
        },
        closeEditModal: (state) => {
            state.showEditModal = false;
            state.selectedCustomer = null;
            state.editForm = { ...emptyCustomerForm };
            state.formErrors = {};
        },
        updateEditForm: (state, action) => {
            state.editForm = { ...state.editForm, ...action.payload };
            const field = Object.keys(action.payload)[0];
            if (field && state.formErrors[field]) {
                delete state.formErrors[field];
            }
        },

        // View Modal
        openViewModal: (state, action) => {
            state.showViewModal = true;
            state.selectedCustomer = action.payload;
        },
        closeViewModal: (state) => {
            state.showViewModal = false;
            state.selectedCustomer = null;
        },

        // Errors
        setFormErrors: (state, action) => {
            state.formErrors = action.payload;
        },
        clearFormErrors: (state) => {
            state.formErrors = {};
        },
    },
});

export const {
    setSearch,
    setLoyaltyFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openAddModal,
    closeAddModal,
    updateAddForm,
    openEditModal,
    closeEditModal,
    updateEditForm,
    openViewModal,
    closeViewModal,
    setFormErrors,
    clearFormErrors,
} = customerSlice.actions;

export default customerSlice.reducer;