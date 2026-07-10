/** Purchase sub-tab id — shop roles only */
export const TRANSFER_BILLS_TAB_ID = "stock-inward-bills";

/** Transfers sub-tab id — warehouse / admin roles */
export const SHOP_TRANSFER_BILLS_TAB_ID = "shop-transfer-bills";

const SHOP_ROLES = new Set(["SHOP_OWNER", "SHOP_MANAGER"]);

export const isShopTransferBillViewer = (role) => SHOP_ROLES.has(role);

/** Sidebar sub-tab + page title by role */
export const getTransferBillsTabLabel = (role) =>
    isShopTransferBillViewer(role) ? "Warehouse Purchase Bills" : "Shop Transfer Bills";

export const getTransferBillsPageSubtitle = (role) =>
    isShopTransferBillViewer(role)
        ? "Bills for stock received from warehouse (bulk and single transfers)"
        : "Transfer bills issued to franchise shops";
