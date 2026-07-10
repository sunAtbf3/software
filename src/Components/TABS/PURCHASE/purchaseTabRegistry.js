// TABS/PURCHASE/purchaseTabRegistry.js
// Add new purchase sub-tabs here only — nothing else in the codebase needs to change.

import { lazy } from "react";

const purchaseTab        = lazy(() => import("../WAREHOUSES/PURCHASE/PurchaseTab"));
const StockInwardBillsTab = lazy(() => import("./StockInwardBillsTab/StockInwardBillsTab"));
const PaymentOutTab           = lazy(() => import("./PaymentOutTab/PaymentOutTab"));
const BillPaymentStatusTab    = lazy(() => import("./BillPaymentStatusTab/BillPaymentStatusTab"));
const ExpensesTab             = lazy(() => import("./ExpensesTab/ExpensesTab"));
const PurchasePerformanceTab  = lazy(() => import("./PurchasePerformanceTab/PurchasePerformanceTab"));
const PurchaseReturnsTab      = lazy(() => import("./PurchaseReturnsTab/PurchaseReturnsTab"));

export const PURCHASE_TAB_REGISTRY = [
    {
        id: "stock-inward-bills",
        label: "Warehouse Purchase Bills",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        component: StockInwardBillsTab,
    },
    {
        id: "purchase-bills",
        label: "Purchase Bills",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        component: purchaseTab,
    },
    {
        id: "payment-out",
        label: "Payment Out",
        icon: "M17 9V7a4 4 0 00-8 0v2M5 9h14l1 10H4L5 9z",
        component: PaymentOutTab,
    },
    {
        id: "bill-payment-status",
        label: "Bill Payment Status",
        icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        component: BillPaymentStatusTab,
    },
    {
        id: "expenses",
        label: "Expenses",
        icon: "M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0-6v2m0 16v2m8-10h2M2 12h2m13.657-6.343l1.414 1.414M4.929 19.071l1.414-1.414m0-11.314L4.929 4.929m14.142 14.142l-1.414-1.414",
        component: ExpensesTab,
    },
    {
        id: "purchase-performance",
        label: "Purchase Performance",
        icon: "M11 3v18m0 0l-4-4m4 4l4-4M5 12h14",
        component: PurchasePerformanceTab,
    },
    {
        id: "purchase-returns",
        label: "Purchase Return / Dr. Note",
        icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
        component: PurchaseReturnsTab,
    },
];