// TABS/SALES/salesTabRegistry.js
// Offline-critical sales tabs are eagerly imported so they load without network (light cut).
// Online-only tabs stay lazy to keep the initial bundle smaller.

import { lazy } from "react";
import BillingTab from "./BillingTab";
import OfflineSyncTab from "./OfflineSyncTab";
import CustomersTab from "./CustomersTab";

const CreditNotesTab = lazy(() => import("./CreditNotesTab"));
const ShopReportTab = lazy(() => import("./ShopReportTab/ShopReportTab"));
const SaleHistoryTab = lazy(() => import("./SaleHistoryTab/SaleHistoryTab"));

export const SALES_TAB_REGISTRY = [
    {
        id: "billing",
        label: "Billing Counter",
        icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z",
        component: BillingTab,
    },
    {
        id: "sale-history",
        label: "Sale History",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
        component: SaleHistoryTab,
    },
    {
        id: "offline-sync",
        label: "Offline & Sync",
        icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
        component: OfflineSyncTab,
    },
    {
        id: "customers",
        label: "Customers",
        icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm7-3a3 3 0 010 6M21 21v-2a4 4 0 00-3-3.87",
        component: CustomersTab,
    },
    {
        id: "creditnote",
        label: "Returns / Credit Notes",
        icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
        component: CreditNotesTab,
    },
    {
        id: "shopreports",
        label: "Shop Reports",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
        component: ShopReportTab,
    },
];
