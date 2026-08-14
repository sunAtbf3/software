// TABS/TRANSFERS/transfersTabRegistry.js
// Add new transfer sub-tabs here only — nothing else needs to change.
import { lazy } from "react";

const TransferHistoryTab = lazy(() => import("./TransferHistoryTab"));
const TransferRequestsTab = lazy(() => import("./TransferRequestsTab/TransferRequestsTab"));
const BulkTransferRequestsTab = lazy(() => import("./TransferRequestsTab/BulkTransferRequestsTab"));
const ShopWarehouseReturnTab = lazy(() => import("./ShopWarehouseReturnTab"));
const StockInwardBillsTab = lazy(() => import("../PURCHASE/StockInwardBillsTab/StockInwardBillsTab"));
const WarehouseProductsCatalogTab = lazy(() => import("./WarehouseProductsCatalogTab"));

export const TRANSFERS_TAB_REGISTRY = [
    {
        id: "transfer-requests",
        label: "Transfer Requests",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
        component: TransferRequestsTab,
    },
    {
        id: "bulk-requests",
        label: "Bulk Requests",
        icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
        component: BulkTransferRequestsTab,
    },
    {
        id: "shop-warehouse-returns",
        /** Shop-facing default; WH sees "Return Stock" via TransfersDashboard. */
        label: "Return to Warehouse",
        labelByRole: {
            WH_MANAGER: "Return Stock",
            WH_STOCK_LISTER: "Return Stock",
            SUPER_ADMIN: "Return Stock",
            SHOP_OWNER: "Return to Warehouse",
            SHOP_MANAGER: "Return to Warehouse",
        },
        icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
        component: ShopWarehouseReturnTab,
    },
    {
        id: "warehouse-products",
        label: "Warehouse Products",
        icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
        component: WarehouseProductsCatalogTab,
    },
    {
        id: "history",
        label: "Transfer History",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
        component: TransferHistoryTab,
    },
    {
        id: "shop-transfer-bills",
        label: "Shop Transfer Bills",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        component: StockInwardBillsTab,
    },
];
