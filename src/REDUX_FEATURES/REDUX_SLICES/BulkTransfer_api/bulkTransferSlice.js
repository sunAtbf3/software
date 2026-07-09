// REDUX_SLICES/BulkTransfer_api/bulkTransferSlice.js
//
// UI State for Bulk Transfer Requests
// Complete flow: Create → Approve → Dispatch → Receive → Complete

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // Filters & Pagination
    statusFilter: "",
    currentPage: 1,
    pageSize: 20,

    // Modals
    showCreateModal: false,
    showApproveModal: false,
    showRejectModal: false,
    showDispatchModal: false,
    showReceiveModal: false,
    showCancelModal: false,
    showViewModal: false,
    selectedRequest: null,

    // Create Form
    createForm: {
        from_warehouse_id: "",
        to_shop_id: "",
        to_warehouse_id: "",
        request_remarks: "",
        items: [],
    },

    // Action Forms
    approveItems: [],
    approveType: "full",
    transferBillType: "NON_GST_INVOICE",
    trackingNumber: "",
    expectedDelivery: "",
    receiveItems: [],
    receiveRemarks: "",
    cancelReason: "",
    rejectReason: "",

    // Errors
    createErrors: {},
    actionErrors: {},

    isLoading: false,
};

const bulkTransferSlice = createSlice({
    name: "bulkTransfer",
    initialState,
    reducers: {
        // Filters
        setStatusFilter: (state, action) => {
            state.statusFilter = action.payload;
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
            state.currentPage = 1;
        },

        // Create Modal
        openCreateModal: (state) => {
            state.showCreateModal = true;
            state.createForm = {
                from_warehouse_id: "",
                to_shop_id: "",
                request_remarks: "",
                items: [],
            };
            state.createErrors = {};
        },
        openCreateModalWithPrefill: (state, action) => {
            const {
                from_warehouse_id = "",
                to_shop_id = "",
                to_warehouse_id = "",
                request_remarks = "",
                items = [],
            } = action.payload || {};
            state.showCreateModal = true;
            state.createForm = {
                from_warehouse_id,
                to_shop_id,
                to_warehouse_id,
                request_remarks,
                items,
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
        addBulkItem: (state, action) => {
            state.createForm.items.push(action.payload);
        },
        removeBulkItem: (state, action) => {
            state.createForm.items = state.createForm.items.filter((_, i) => i !== action.payload);
        },
        updateBulkItem: (state, action) => {
            const { index, ...data } = action.payload;
            if (state.createForm.items[index]) {
                state.createForm.items[index] = { ...state.createForm.items[index], ...data };
            }
        },
        clearBulkItems: (state) => {
            state.createForm.items = [];
        },
        setCreateErrors: (state, action) => {
            state.createErrors = action.payload;
        },

        // Approve Modal
        openApproveModal: (state, action) => {
            state.showApproveModal = true;
            state.selectedRequest = action.payload;
            state.approveItems = [];
            state.approveType = "full";
            state.transferBillType = "NON_GST_INVOICE";
            state.actionErrors = {};
        },
        closeApproveModal: (state) => {
            state.showApproveModal = false;
            state.selectedRequest = null;
            state.approveItems = [];
            state.approveType = "full";
            state.transferBillType = "NON_GST_INVOICE";
            state.actionErrors = {};
        },

        openRejectModal: (state, action) => {
            state.showRejectModal = true;
            state.selectedRequest = action.payload;
            state.rejectReason = "";
            state.actionErrors = {};
        },
        closeRejectModal: (state) => {
            state.showRejectModal = false;
            state.selectedRequest = null;
            state.rejectReason = "";
            state.actionErrors = {};
        },
        setRejectReason: (state, action) => {
            state.rejectReason = action.payload;
        },

        setApproveType: (state, action) => {
            state.approveType = action.payload;
        },
        setTransferBillType: (state, action) => {
            state.transferBillType = action.payload;
        },
        setApproveItem: (state, action) => {
            const { variant_id, approved, quantity } = action.payload;
            const existing = state.approveItems.find((i) => i.variant_id === variant_id);
            if (existing) {
                if (approved !== undefined) existing.approved = approved;
                if (quantity !== undefined) existing.quantity = quantity;
            } else {
                state.approveItems.push({
                    variant_id,
                    approved: approved !== false,
                    quantity,
                });
            }
        },
        setApproveItemQuantity: (state, action) => {
            const { variant_id, quantity } = action.payload;
            const existing = state.approveItems.find((i) => i.variant_id === variant_id);
            if (existing) {
                existing.quantity = quantity;
            } else {
                state.approveItems.push({ variant_id, approved: true, quantity });
            }
        },

        // Dispatch Modal
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

        // Receive Modal
        openReceiveModal: (state, action) => {
            state.showReceiveModal = true;
            state.selectedRequest = action.payload;
            state.receiveItems = (action.payload?.items || [])
                .map((item) => {
                    if (item.is_approved === false) return null;
                    const requested = Number(item.requested_quantity ?? item.quantity) || 0;
                    const approved =
                        item.approved_quantity != null
                            ? Number(item.approved_quantity) || 0
                            : requested;
                    if (approved <= 0) return null;
                    const received = Number(item.received_quantity ?? 0);
                    const inTransit = Math.max(0, approved - received);
                    if (inTransit <= 0) return null;
                    return { variant_id: item.variant_id, quantity: String(inTransit) };
                })
                .filter(Boolean);
            state.receiveRemarks = "";
            state.actionErrors = {};
        },
        closeReceiveModal: (state) => {
            state.showReceiveModal = false;
            state.selectedRequest = null;
            state.receiveItems = [];
            state.receiveRemarks = "";
            state.actionErrors = {};
        },
        setReceiveItemQuantity: (state, action) => {
            const { variant_id, quantity } = action.payload;
            const existing = state.receiveItems.find((i) => i.variant_id === variant_id);
            if (existing) {
                existing.quantity = quantity;
            } else {
                state.receiveItems.push({ variant_id, quantity });
            }
        },
        setReceiveRemarks: (state, action) => {
            state.receiveRemarks = action.payload;
        },

        // Cancel Modal
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

        // View Details Modal
        openViewModal: (state, action) => {
            state.showViewModal = true;
            state.selectedRequest = action.payload;
        },
        closeViewModal: (state) => {
            state.showViewModal = false;
            state.selectedRequest = null;
        },

        // Errors
        setActionErrors: (state, action) => {
            state.actionErrors = action.payload;
        },
        clearActionErrors: (state) => {
            state.actionErrors = {};
        },

        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
    },
});

export const {
    setStatusFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openCreateModal,
    openCreateModalWithPrefill,
    closeCreateModal,
    updateCreateForm,
    addBulkItem,
    removeBulkItem,
    updateBulkItem,
    clearBulkItems,
    setCreateErrors,
    openApproveModal,
    closeApproveModal,
    openRejectModal,
    closeRejectModal,
    setRejectReason,
    setApproveType,
    setTransferBillType,
    setApproveItem,
    setApproveItemQuantity,
    openDispatchModal,
    closeDispatchModal,
    setTrackingNumber,
    setExpectedDelivery,
    openReceiveModal,
    closeReceiveModal,
    setReceiveItemQuantity,
    setReceiveRemarks,
    openCancelModal,
    closeCancelModal,
    setCancelReason,
    openViewModal,
    closeViewModal,
    setActionErrors,
    clearActionErrors,
    setLoading,
} = bulkTransferSlice.actions;

export default bulkTransferSlice.reducer;
// // REDUX_SLICES/BulkTransfer_api/bulkTransferSlice.js
// //
// // UI State for Bulk Transfer Requests

// import { createSlice } from "@reduxjs/toolkit";

// const initialState = {
//     // Filters & Pagination
//     statusFilter: "",
//     currentPage: 1,
//     pageSize: 20,

//     // Modals
//     showCreateModal: false,
//     showApproveModal: false,
//     showDispatchModal: false,
//     showReceiveModal: false,
//     showCancelModal: false,
//     selectedRequest: null,

//     // Create Form
//     createForm: {
//         from_warehouse_id: "",
//         to_shop_id: "",
//         request_remarks: "",
//         items: [],
//     },

//     // Action Forms
//     approveItems: [],
//     receiveQuantity: "",
//     receiveRemarks: "",
//     trackingNumber: "",
//     expectedDelivery: "",
//     cancelReason: "",

//     // Errors
//     createErrors: {},
//     actionErrors: {},

//     isLoading: false,
// };

// const bulkTransferSlice = createSlice({
//     name: "bulkTransfer",
//     initialState,
//     reducers: {
//         // Filters
//         setStatusFilter: (state, action) => {
//             state.statusFilter = action.payload;
//             state.currentPage = 1;
//         },
//         setCurrentPage: (state, action) => {
//             state.currentPage = action.payload;
//         },
//         setPageSize: (state, action) => {
//             state.pageSize = action.payload;
//             state.currentPage = 1;
//         },
//         resetFilters: (state) => {
//             state.statusFilter = "";
//             state.currentPage = 1;
//         },

//         // Create Modal
//         openCreateModal: (state) => {
//             state.showCreateModal = true;
//             state.createForm = {
//                 from_warehouse_id: "",
//                 to_shop_id: "",
//                 request_remarks: "",
//                 items: [],
//             };
//             state.createErrors = {};
//         },
//         closeCreateModal: (state) => {
//             state.showCreateModal = false;
//             state.createForm = initialState.createForm;
//             state.createErrors = {};
//         },
//         updateCreateForm: (state, action) => {
//             state.createForm = { ...state.createForm, ...action.payload };
//         },
//         addBulkItem: (state, action) => {
//             state.createForm.items.push(action.payload);
//         },
//         removeBulkItem: (state, action) => {
//             state.createForm.items = state.createForm.items.filter((_, i) => i !== action.payload);
//         },
//         updateBulkItem: (state, action) => {
//             const { index, ...data } = action.payload;
//             if (state.createForm.items[index]) {
//                 state.createForm.items[index] = { ...state.createForm.items[index], ...data };
//             }
//         },
//         clearBulkItems: (state) => {
//             state.createForm.items = [];
//         },
//         setCreateErrors: (state, action) => {
//             state.createErrors = action.payload;
//         },

//         // Approve Modal
//         openApproveModal: (state, action) => {
//             state.showApproveModal = true;
//             state.selectedRequest = action.payload;
//             state.approveItems = [];
//         },
//         closeApproveModal: (state) => {
//             state.showApproveModal = false;
//             state.selectedRequest = null;
//             state.approveItems = [];
//         },
//         setApproveItem: (state, action) => {
//             const { variant_id, approved } = action.payload;
//             const existing = state.approveItems.find(i => i.variant_id === variant_id);
//             if (existing) {
//                 existing.approved = approved;
//             } else {
//                 state.approveItems.push({ variant_id, approved });
//             }
//         },

//         // Dispatch Modal
//         openDispatchModal: (state, action) => {
//             state.showDispatchModal = true;
//             state.selectedRequest = action.payload;
//             state.trackingNumber = "";
//             state.expectedDelivery = "";
//         },
//         closeDispatchModal: (state) => {
//             state.showDispatchModal = false;
//             state.selectedRequest = null;
//             state.trackingNumber = "";
//             state.expectedDelivery = "";
//         },
//         setTrackingNumber: (state, action) => {
//             state.trackingNumber = action.payload;
//         },
//         setExpectedDelivery: (state, action) => {
//             state.expectedDelivery = action.payload;
//         },

//         // Receive Modal
//         openReceiveModal: (state, action) => {
//             state.showReceiveModal = true;
//             state.selectedRequest = action.payload;
//             state.receiveQuantity = "";
//             state.receiveRemarks = "";
//         },
//         closeReceiveModal: (state) => {
//             state.showReceiveModal = false;
//             state.selectedRequest = null;
//             state.receiveQuantity = "";
//             state.receiveRemarks = "";
//         },
//         setReceiveQuantity: (state, action) => {
//             state.receiveQuantity = action.payload;
//         },
//         setReceiveRemarks: (state, action) => {
//             state.receiveRemarks = action.payload;
//         },

//         // Cancel Modal
//         openCancelModal: (state, action) => {
//             state.showCancelModal = true;
//             state.selectedRequest = action.payload;
//             state.cancelReason = "";
//         },
//         closeCancelModal: (state) => {
//             state.showCancelModal = false;
//             state.selectedRequest = null;
//             state.cancelReason = "";
//         },
//         setCancelReason: (state, action) => {
//             state.cancelReason = action.payload;
//         },

//         // Errors
//         setActionErrors: (state, action) => {
//             state.actionErrors = action.payload;
//         },
//         clearActionErrors: (state) => {
//             state.actionErrors = {};
//         },

//         setLoading: (state, action) => {
//             state.isLoading = action.payload;
//         },
//     },
// });

// export const {
//     setStatusFilter,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openCreateModal,
//     closeCreateModal,
//     updateCreateForm,
//     addBulkItem,
//     removeBulkItem,
//     updateBulkItem,
//     clearBulkItems,
//     setCreateErrors,
//     openApproveModal,
//     closeApproveModal,
//     setApproveItem,
//     openDispatchModal,
//     closeDispatchModal,
//     setTrackingNumber,
//     setExpectedDelivery,
//     openReceiveModal,
//     closeReceiveModal,
//     setReceiveQuantity,
//     setReceiveRemarks,
//     openCancelModal,
//     closeCancelModal,
//     setCancelReason,
//     setActionErrors,
//     clearActionErrors,
//     setLoading,
// } = bulkTransferSlice.actions;

// export default bulkTransferSlice.reducer;