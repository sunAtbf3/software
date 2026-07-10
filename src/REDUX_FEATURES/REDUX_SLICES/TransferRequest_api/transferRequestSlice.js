// REDUX_SLICES/TransferRequest_api/transferRequestSlice.js
//
// UI State for Transfer Requests: filters, pagination, modals

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // Filters & Pagination
    statusFilter: "",
    typeFilter: "",
    priorityFilter: "",           // ✅ NEW — filter by HIGH/NORMAL
    search: "",
    currentPage: 1,
    pageSize: 20,

    showCreateFromSearchModal: false,
    prefilledRequestData: null,


    showViewRequestModal: false,
    viewRequestData: null,

    // Modals
    showCreateModal: false,
    showApproveRejectModal: false,
    showDispatchModal: false,
    showReceiveModal: false,
    showCancelModal: false,
    selectedRequest: null,

    // Form data
    createForm: {
        request_type: "WH_TO_SHOP",
        from_warehouse_id: "",
        to_shop_id: "",
        from_shop_id: "",
        to_warehouse_id: "",
        variant_id: "",
        quantity: "",
        priority: "NORMAL",       // ✅ NEW — HIGH or NORMAL
        expected_delivery: "",
        request_remarks: "",
    },
    rejectReason: "",
    transferBillType: "NON_GST_INVOICE",
    cancelReason: "",
    trackingNumber: "",
    expectedDelivery: "",
    receivedQuantity: "",
    receiveRemarks: "",

    // Errors
    createErrors: {},
    actionErrors: {},

    // UI
    isLoading: false,
};

const transferRequestSlice = createSlice({
    name: "transferRequest",
    initialState,
    reducers: {
        // ── Filters ─────────────────────────────────────────────────────────
        setStatusFilter: (state, action) => {
            state.statusFilter = action.payload;
            state.currentPage = 1;
        },
        setTypeFilter: (state, action) => {
            state.typeFilter = action.payload;
            state.currentPage = 1;
        },
        setPriorityFilter: (state, action) => {        // ✅ NEW
            state.priorityFilter = action.payload;
            state.currentPage = 1;
        },
        setSearch: (state, action) => {
            state.search = action.payload;
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
            state.statusFilter = "";
            state.typeFilter = "";
            state.priorityFilter = "";
            state.search = "";
            state.currentPage = 1;
        },

        // ── Create Modal ────────────────────────────────────────────────────
        openCreateModal: (state) => {
            state.showCreateModal = true;
            state.createForm = {
                request_type: "WH_TO_SHOP",
                from_warehouse_id: "",
                to_shop_id: "",
                from_shop_id: "",
                to_warehouse_id: "",
                variant_id: "",
                quantity: "",
                priority: "NORMAL",
                expected_delivery: "",
                request_remarks: "",
            };
            state.createErrors = {};
        },
        closeCreateModal: (state) => {
            state.showCreateModal = false;
            state.createForm = initialState.createForm;
            state.createErrors = {};
        },
        updateCreateForm: (state, action) => {
            state.createForm = { ...state.createForm, ...action.payload };
        },
        setCreateErrors: (state, action) => {
            state.createErrors = action.payload;
        },
        clearCreateErrors: (state) => {
            state.createErrors = {};
        },

        // ── Approve/Reject Modal ────────────────────────────────────────────
        openApproveRejectModal: (state, action) => {
            state.showApproveRejectModal = true;
            state.selectedRequest = action.payload;
            state.rejectReason = "";
            state.transferBillType = "NON_GST_INVOICE";
            state.actionErrors = {};
        },
        closeApproveRejectModal: (state) => {
            state.showApproveRejectModal = false;
            state.selectedRequest = null;
            state.rejectReason = "";
            state.transferBillType = "NON_GST_INVOICE";
            state.actionErrors = {};
        },
        setRejectReason: (state, action) => {
            state.rejectReason = action.payload;
        },
        setTransferBillType: (state, action) => {
            state.transferBillType = action.payload;
        },

        // ── Dispatch Modal ──────────────────────────────────────────────────
        openDispatchModal: (state, action) => {
            state.showDispatchModal = true;
            state.selectedRequest = action.payload;
            state.trackingNumber = "";
            state.expectedDelivery = "";
            state.actionErrors = {};
        },
        closeDispatchModal: (state) => {
            state.showDispatchModal = false;
            state.selectedRequest = null;
            state.trackingNumber = "";
            state.expectedDelivery = "";
            state.actionErrors = {};
        },
        setTrackingNumber: (state, action) => {
            state.trackingNumber = action.payload;
        },
        setExpectedDelivery: (state, action) => {
            state.expectedDelivery = action.payload;
        },

        // ── Receive Modal ───────────────────────────────────────────────────
        openReceiveModal: (state, action) => {
            state.showReceiveModal = true;
            state.selectedRequest = action.payload;
            state.receivedQuantity = "";
            state.receiveRemarks = "";
            state.actionErrors = {};
        },
        closeReceiveModal: (state) => {
            state.showReceiveModal = false;
            state.selectedRequest = null;
            state.receivedQuantity = "";
            state.receiveRemarks = "";
            state.actionErrors = {};
        },
        setReceivedQuantity: (state, action) => {
            state.receivedQuantity = action.payload;
        },
        setReceiveRemarks: (state, action) => {
            state.receiveRemarks = action.payload;
        },

        // ── Cancel Modal ────────────────────────────────────────────────────
        openCancelModal: (state, action) => {
            state.showCancelModal = true;
            state.selectedRequest = action.payload;
            state.cancelReason = "";
            state.actionErrors = {};
        },
        closeCancelModal: (state) => {
            state.showCancelModal = false;
            state.selectedRequest = null;
            state.cancelReason = "";
            state.actionErrors = {};
        },
        setCancelReason: (state, action) => {
            state.cancelReason = action.payload;
        },

        // ── Action Errors ───────────────────────────────────────────────────
        setActionErrors: (state, action) => {
            state.actionErrors = action.payload;
        },
        clearActionErrors: (state) => {
            state.actionErrors = {};
        },

        // ── Loading ─────────────────────────────────────────────────────────
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },



        openCreateFromSearchModal: (state) => {
            state.showCreateFromSearchModal = true;
        },
        closeCreateFromSearchModal: (state) => {
            state.showCreateFromSearchModal = false;
            state.prefilledRequestData = null;
        },
        setPrefilledRequestData: (state, action) => {
            state.prefilledRequestData = action.payload;
        },
        clearPrefilledRequestData: (state) => {
            state.prefilledRequestData = null;
        },

        // Add these reducers
openViewRequestModal: (state) => {
    state.showViewRequestModal = true;
},
closeViewRequestModal: (state) => {
    state.showViewRequestModal = false;
    state.viewRequestData = null;
},
setViewRequestData: (state, action) => {
    state.viewRequestData = action.payload;
},
    },
});

export const {
    setStatusFilter,
    setTypeFilter,
    setPriorityFilter,      // ✅ NEW
    setSearch,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openCreateModal,
    closeCreateModal,
    updateCreateForm,
    setCreateErrors,
    clearCreateErrors,
    openApproveRejectModal,
    closeApproveRejectModal,
    setRejectReason,
    setTransferBillType,
    openDispatchModal,
    closeDispatchModal,
    setTrackingNumber,
    setExpectedDelivery,
    openReceiveModal,
    closeReceiveModal,
    setReceivedQuantity,
    setReceiveRemarks,
    openCancelModal,
    closeCancelModal,
    setCancelReason,
    setActionErrors,
    clearActionErrors,
    setLoading,


    openCreateFromSearchModal,
    closeCreateFromSearchModal,
    setPrefilledRequestData,
    clearPrefilledRequestData,


    openViewRequestModal,
closeViewRequestModal,
setViewRequestData,
} = transferRequestSlice.actions;

export default transferRequestSlice.reducer;