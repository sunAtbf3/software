// TABS/INVENTORY/inventoryTabRegistry.js
import { lazy } from "react";
const InventoryStockTab = lazy(() => import("./../WAREHOUSES/INVENTORY_STOCK/InventoryStockTab"));
const ShopStockTab = lazy(() => import("./ShopStockTab/ShopStockTab"));
const DeadStockHistoryTab = lazy(() => import("./DeadStockHistoryTab"));
const InventoryTab = lazy(() => import("./InventoryTab"));



export const INVENTORY_TAB_REGISTRY = [

    {
        id: "shopstock",
        label: "Shop Stock",
        icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18M9 22V12h6v10",
        component: ShopStockTab,
    },
    {
        id: "dead-stock",
        label: "Dead Stock",
        icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
        component: DeadStockHistoryTab,
    },
    {
        id: "inventorystock",
        label: "Inventory Stock",
        icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
        component: InventoryStockTab,
    },
    {
        id: "products",
        label: "Products",
        icon: "M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 3h6v3h-6zm3-3h3v3h-3zm-3 0h3v3h-3z",
        component: InventoryTab,
    },

];
