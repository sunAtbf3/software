import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    showDetailModal: false,
    selectedBill: null,
    search: "",
    billTypeFilter: "",
    sourceFilter: "",
    shopFilter: "",
    warehouseFilter: "",
    fromDate: "",
    toDate: "",
    currentPage: 1,
    pageSize: 20,
};

const transferBillSlice = createSlice({
    name: "transferBill",
    initialState,
    reducers: {
        openDetailModal: (state, action) => {
            state.showDetailModal = true;
            state.selectedBill = action.payload;
        },
        closeDetailModal: (state) => {
            state.showDetailModal = false;
            state.selectedBill = null;
        },
        setSearch: (state, action) => {
            state.search = action.payload;
            state.currentPage = 1;
        },
        setBillTypeFilter: (state, action) => {
            state.billTypeFilter = action.payload;
            state.currentPage = 1;
        },
        setSourceFilter: (state, action) => {
            state.sourceFilter = action.payload;
            state.currentPage = 1;
        },
        setShopFilter: (state, action) => {
            state.shopFilter = action.payload;
            state.currentPage = 1;
        },
        setWarehouseFilter: (state, action) => {
            state.warehouseFilter = action.payload;
            state.currentPage = 1;
        },
        setFromDate: (state, action) => {
            state.fromDate = action.payload;
            state.currentPage = 1;
        },
        setToDate: (state, action) => {
            state.toDate = action.payload;
            state.currentPage = 1;
        },
        setCurrentPage: (state, action) => {
            state.currentPage = action.payload;
        },
        setPageSize: (state, action) => {
            state.pageSize = action.payload;
            state.currentPage = 1;
        },
        resetFilters: () => initialState,
    },
});

export const {
    openDetailModal,
    closeDetailModal,
    setSearch,
    setBillTypeFilter,
    setSourceFilter,
    setShopFilter,
    setWarehouseFilter,
    setFromDate,
    setToDate,
    setCurrentPage,
    setPageSize,
    resetFilters,
} = transferBillSlice.actions;

export default transferBillSlice.reducer;
