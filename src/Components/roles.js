// src/Components/roles.js

// ─────────────────────────────────────────────────────────────────────────────
// SUB-TAB PERMISSIONS — Controls visibility of sidebar dropdown sub-items & internal horizontal tabs
// Format: "parentTabId.subTabId" OR "parentTabId.internal.subTabId" → array of roles
// ─────────────────────────────────────────────────────────────────────────────

export const SUB_TAB_PERMISSIONS = {

    // Products
    "product.read": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "product.create": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "product.edit": ["SUPER_ADMIN", "WH_MANAGER"],
    "product.delete": ["SUPER_ADMIN", "WH_MANAGER"],
    "product.permanent_delete": ["SUPER_ADMIN"], // ADD THIS LINE


    // Warehouses sidebar dropdown (from TabRegistry.js)
    "warehouses.overview": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "warehouses.receive": ["SUPER_ADMIN", "WH_MANAGER"],

    // Warehouses internal horizontal tabs (from warehousesTabRegistry.js)
    "warehouses.internal.overview": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "warehouses.internal.receive": ["SUPER_ADMIN", "WH_MANAGER"],
    "warehouses.internal.inward": ["SUPER_ADMIN", "WH_MANAGER"],


    // Sales sidebar dropdown
    "sales.billing": ["SUPER_ADMIN", "BILLING_STAFF", "SHOP_OWNER", "WH_MANAGER"],
    "sales.internal.offline-sync": ["SUPER_ADMIN", "BILLING_STAFF", "SHOP_OWNER", "SHOP_MANAGER"],
    "sales.invoices": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "WH_MANAGER"],
    "sales.customers": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "WH_MANAGER"],
    "sales.wholesale": ["SUPER_ADMIN", "SHOP_OWNER", "WH_MANAGER"],
    "sales.returns": ["SUPER_ADMIN", "SHOP_OWNER", "WH_MANAGER"],
    "sales.credit-notes": ["SUPER_ADMIN", "SHOP_OWNER", "WH_MANAGER"],

    // Settings sidebar dropdown
    "settings.users": ["SUPER_ADMIN"],
    "settings.shops": ["SUPER_ADMIN"],
    "settings.vendors": ["SUPER_ADMIN", "WH_MANAGER"],
    "settings.companydetails": ["SUPER_ADMIN"],
    "settings.bankdetails": ["SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER"],
    "settings.staffcodes": ["SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER"],
    "settings.shopprofile": ["SHOP_OWNER"],
    "settings.warehouseprofile": ["WH_MANAGER"],


    // Settings internal horizontal tabs (from settingsTabRegistry.js)
    "settings.internal.users": ["SUPER_ADMIN"],
    "settings.internal.shops": ["SUPER_ADMIN"],
    "settings.internal.vendors": ["SUPER_ADMIN"],
    "settings.internal.companydetails": ["SUPER_ADMIN"],
    "settings.internal.bankdetails": ["SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER"],
    "settings.internal.staffcodes": ["SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER"],
    "settings.internal.shopprofile": ["SHOP_OWNER"],
    "settings.internal.warehouseprofile": ["WH_MANAGER"],

    // Transfers sidebar dropdown
    "transfers.wh-to-shop": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "transfers.shop-to-shop": ["SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER"],
    "transfers.wh-to-wh": ["SUPER_ADMIN", "WH_MANAGER"],
    "transfers.history": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "SHOP_MANAGER"],
    "transfers.internal.wh-to-shop": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "transfers.internal.wh-to-wh": ["SUPER_ADMIN", "WH_MANAGER"],
    "transfers.internal.shop-stock-request": ["SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER"],
    "transfers.internal.wh-stock-request": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "transfers.internal.transfer-requests": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "SHOP_MANAGER"],
    "transfers.internal.bulk-requests": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "SHOP_MANAGER"],
    "transfers.internal.history": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "SHOP_MANAGER"],


    // Inventory internal horizontal tabs (from inventoryTabRegistry.js)
    "inventory.internal.products": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER",],
    "inventory.internal.shopstock": ["SHOP_OWNER", "SHOP_MANAGER"],
    "inventory.internal.inventorystock": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],

    // Cash & Bank — shop level (collections / receivables)
    "cashbank.internal.collections": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "CASHIER", "ACCOUNTANT"],
    "cashbank.internal.customer-due": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "CASHIER", "ACCOUNTANT"],
    "cashbank.internal.cash-in-hand": ["SUPER_ADMIN", "SHOP_OWNER"],
    "cashbank.internal.bank-statement-shop": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF"],
    "cashbank.internal.cheques-received": ["SUPER_ADMIN", "SHOP_OWNER"],

    // Cash & Bank — warehouse level (payables / payments)
    "cashbank.internal.vendor-payables": ["SUPER_ADMIN", "WH_MANAGER"],
    "cashbank.internal.vendor-payments": ["SUPER_ADMIN", "WH_MANAGER"],
    "cashbank.internal.bank-statement-wh": ["SUPER_ADMIN", "WH_MANAGER"],
    "cashbank.internal.cheques-issued": ["SUPER_ADMIN", "WH_MANAGER"],
    "cashbank.internal.petty-cash": ["SUPER_ADMIN", "WH_MANAGER", "SHOP_OWNER"],

    // Cash & Bank — organisation level
    "cashbank.internal.loan-account": ["SUPER_ADMIN"],
    "cashbank.internal.collections": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "CASHIER", "ACCOUNTANT"],
    "cashbank.internal.customer-due": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "CASHIER", "ACCOUNTANT"],
    "cashbank.internal.cash-in-hand": ["SUPER_ADMIN", "SHOP_OWNER"],
    "cashbank.internal.bank-statement-shop": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF"],
    "cashbank.internal.cheques-received": ["SUPER_ADMIN"],
    "cashbank.internal.vendor-payables": ["SUPER_ADMIN"],
    "cashbank.internal.vendor-payments": ["SUPER_ADMIN"],
    "cashbank.internal.bank-statement-wh": ["SUPER_ADMIN"],
    "cashbank.internal.cheques-issued": ["SUPER_ADMIN"],
    "cashbank.internal.petty-cash": ["SUPER_ADMIN", "WH_MANAGER", "SHOP_OWNER"],


    // Team Members tab — managers only (+ super admin)
    "teammembers.internal.teammembers": ["SUPER_ADMIN", "WH_MANAGER", "SHOP_OWNER"],

    // Backup internal horizontal tabs (from backupTabRegistry.js)
    "backup.internal.autobackup": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER"],
    "backup.internal.backuptocomputer": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER"],
    "backup.internal.backuptodrive": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER"],
    "backup.internal.restorebackup": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER"],

    // Utilities internal horizontal tabs (from utilitiesTabRegistry.js)
    "utilities.internal.importitems": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "utilities.internal.setUpbillperforma": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "utilities.internal.pettycashbook": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "SHOP_MANAGER"],

    // Purchase internal horizontal tabs (from purchaseTabRegistry.js)
    "purchase.internal.purchase-bills": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "purchase.internal.payment-out": ["SUPER_ADMIN", "WH_MANAGER"],
    "purchase.internal.bill-payment-status": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "purchase.internal.expenses": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "SHOP_MANAGER"],
    "purchase.internal.purchase-performance": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "purchase.internal.purchase-returns": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
};

/**
 * Check if a specific sub-tab is visible to the current user
 * @param {string} parentTabId - e.g., "warehouses", "sales", "settings"
 * @param {string} subTabId     - e.g., "overview", "receive", "billing"
 * @returns {boolean}
 */
export const canViewSubTab = (parentTabId, subTabId) => {
    const currentRole = CURRENT_USER.role;
    if (!currentRole) return false;

    const key = `${parentTabId}.${subTabId}`;
    const allowedRoles = SUB_TAB_PERMISSIONS[key];

    if (allowedRoles) {
        return allowedRoles.includes(currentRole);
    }

    // Unlisted sub-tabs: visible to all authenticated roles (legacy default)
    return true;
};

/**
 * Filter sub-items array based on current user's role
 * @param {string} parentTabId - The parent tab's id
 * @param {Array} subItems      - The subItems array from TAB_REGISTRY
 * @returns {Array}             - Filtered subItems
 */
export const filterSubItemsByRole = (parentTabId, subItems) => {
    if (!subItems || !Array.isArray(subItems)) return [];

    return subItems.filter(subItem =>
        canViewSubTab(parentTabId, subItem.id)
    );
};

/**
 * Filter internal tab registry based on current user's role
 * Use this for horizontal tabs inside dashboards (e.g., WarehousesDashboard)
 * @param {string} parentTabId - The parent tab's id (e.g., "warehouses")
 * @param {Array} tabRegistry   - The tab registry array (e.g., WAREHOUSES_TAB_REGISTRY)
 * @returns {Array}             - Filtered tab registry
 */
export const filterInternalTabsByRole = (parentTabId, tabRegistry) => {
    if (!tabRegistry || !Array.isArray(tabRegistry)) return [];

    return tabRegistry.filter(tab =>
        canViewSubTab(`${parentTabId}.internal`, tab.id)
    );
};


// ─────────────────────────────────────────────────────────────────────────────
// ACTION PERMISSIONS — Controls visibility of CRUD buttons (Add, Edit, Delete)
// Format: "resource.action" → array of roles that can perform this action
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_PERMISSIONS = {

    // Products / Inventory/ Product Master
    "productMs.read": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "SHOP_MANAGER"],
    "productMs.create": ["WH_MANAGER"],
    "productMs.edit": ["WH_MANAGER"],
    "productMs.archive": ["WH_MANAGER"],
    "productMs.bulk_upload": ["WH_MANAGER"],
    "productMs.export": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "productMs.category_add": ["SUPER_ADMIN"],
    "product.permanent_delete": ["SUPER_ADMIN"],
    // Vendors                                         
    "vendor.read": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER",],
    "vendor.create": ["SUPER_ADMIN"],
    "vendor.edit": ["SUPER_ADMIN"],
    "vendor.delete": ["SUPER_ADMIN"],

    // Warehouses
    "warehouse.read": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "warehouse.create": ["SUPER_ADMIN"],
    "warehouse.edit": ["SUPER_ADMIN", "WH_MANAGER"],
    "warehouse.delete": ["SUPER_ADMIN"],

    // Users (admin settings)
    "user.read": ["SUPER_ADMIN"],
    "user.create": ["SUPER_ADMIN"],
    "user.edit": ["SUPER_ADMIN"],
    "user.delete": ["SUPER_ADMIN"],

    // Team members (scoped shop / warehouse)
    "team.read": ["SUPER_ADMIN", "SHOP_OWNER", "WH_MANAGER"],
    "team.create": ["SHOP_OWNER", "WH_MANAGER"],
    "team.edit": ["SHOP_OWNER", "WH_MANAGER"],

    // Shop settings — bank (owner write) vs staff codes (owner + manager write)
    "shop.bank.read": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "SHOP_MANAGER"],
    "shop.bank.write": ["SUPER_ADMIN", "SHOP_OWNER"],
    "shop.staff.read": ["SUPER_ADMIN", "SHOP_OWNER", "BILLING_STAFF", "SHOP_MANAGER"],
    "shop.staff.write": ["SUPER_ADMIN", "SHOP_OWNER", "SHOP_MANAGER"],

    // Inwards
    "inward.read": ["SUPER_ADMIN", "WH_MANAGER", "WH_STOCK_LISTER"],
    "inward.schedule": ["SUPER_ADMIN", "WH_MANAGER"],
    "inward.arrive": ["SUPER_ADMIN", "WH_MANAGER"],
    "inward.map": ["SUPER_ADMIN", "WH_MANAGER"],
    "inward.cancel": ["SUPER_ADMIN", "WH_MANAGER"],
};

/**
 * Check if current user can perform a specific action
 * @param {string} actionKey - Format: "resource.action" e.g., "vendor.edit"
 * @returns {boolean}
 */
export const can = (actionKey) => {
    const role = CURRENT_USER.role;
    const allowedRoles = ACTION_PERMISSIONS[actionKey];
    return allowedRoles ? allowedRoles.includes(role) : false;
};



//
export const ROLES = {
    SUPER_ADMIN: "SUPER_ADMIN",
    WH_MANAGER: "WH_MANAGER",
    WH_STOCK_LISTER: "WH_STOCK_LISTER",
    SHOP_OWNER: "SHOP_OWNER",
    BILLING_STAFF: "BILLING_STAFF",
    SHOP_MANAGER: "SHOP_MANAGER",
};

// ─────────────────────────────────────────────────────────────────────────────
// 👇 JUST CHANGE THIS FOR TESTING DIFFERENT ROLES
// ─────────────────────────────────────────────────────────────────────────────
// HARDCODED USER IS DISABLED.
// This object is now hydrated from login API response.
// export const CURRENT_USER = {
//     role: null,
//     locationId: null,
//     name: null,
// };
export const CURRENT_USER = {
    role: null,
    locationId: null,
    locationName: null,
    name: null,
};

export const syncCurrentUserFromAuth = (user) => {
    if (!user) {
        CURRENT_USER.role = null;
        CURRENT_USER.locationId = null;
        CURRENT_USER.name = null;
        return;
    }

    CURRENT_USER.role = user.role || null;
    // CURRENT_USER.locationId = user.warehouse_id || user.shop_id || null;
    // CURRENT_USER.name = user.name || null;
    CURRENT_USER.locationId = user.warehouse_id || user.shop_id || null;
    CURRENT_USER.locationName = user.locationName || user.warehouse_id || user.shop_id || null;
    CURRENT_USER.name = user.name || null;
};

// Role permissions for tabs (controls which tabs appear in sidebar)
export const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: ["dashboard", "purchase", "inventory", "archive", "transfers", "warehouses", "parties", "reports", "settings", "vendors", "cashbank", "teammembers", "backup", "utilities"],
    [ROLES.ACCOUNTANT]: ["dashboard", "sales", "purchase", "parties", "reports", "cashbank"],
    [ROLES.BILLING_STAFF]: ["dashboard", "sales", "parties", "transfers", "cashbank"],
    [ROLES.STOCK_LISTER]: ["dashboard", "inventory", "transfers", "cashbank"],
    [ROLES.CASHIER]: ["dashboard", "sales", "cashbank"],
    [ROLES.WH_MANAGER]: ["dashboard", "warehouses", "transfers", "inventory", "archive", "purchase", "parties", "settings", "vendors", "reports", "cashbank", "teammembers", "backup", "utilities"],
    [ROLES.WH_STOCK_LISTER]: ["dashboard", "warehouses", "transfers", "inventory", "purchase", "parties", "settings", "vendors", "reports", "backup", "utilities"],
    [ROLES.SHOP_OWNER]: ["dashboard", "sales", "inventory", "transfers", "parties", "reports", "settings", "cashbank", "teammembers", "backup"],
    [ROLES.SHOP_MANAGER]: ["dashboard", "inventory", "transfers", "parties", "reports", "settings", "purchase"],
};

export const ROLE_LABELS = {
    [ROLES.SUPER_ADMIN]: "Super Admin",
    [ROLES.ACCOUNTANT]: "Accountant",
    [ROLES.BILLING_STAFF]: "Billing Staff",
    [ROLES.STOCK_LISTER]: "Stock Lister",
    [ROLES.CASHIER]: "Cashier / Billing Staff",
    [ROLES.WH_MANAGER]: "Warehouse Manager",
    [ROLES.WH_STOCK_LISTER]: "Warehouse Stock Lister",
    [ROLES.SHOP_OWNER]: "Shop Owner",
    [ROLES.SHOP_MANAGER]: "Shop Manager",
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA FILTERING — Single source of truth for ALL tabs
//
//  Rule:
//    OWNER      → sees ALL data, no filter ever applied
//    WH_MANAGER → item.locationId === CURRENT_USER.locationId  (WH-001 / WH-002)
//    Shop roles → item.shopId    === CURRENT_USER.locationId  (SHP-001 / SHP-002)
//
//  Usage in any tab:
//    filterByLocation(products)               → scoped products
//    filterByLocation(bills, 'shopId')        → scoped bills
//    filterByLocation(purchases, 'shopId')    → scoped purchases
//    filterByLocation(transfers,'fromShopId') → scoped transfers
//    filterLocationList(allShops)             → only their location in selector
// ─────────────────────────────────────────────────────────────────────────────

/** True if the logged-in user is super admin (sees ALL data, no scoping) */
export const isAdmin = () => CURRENT_USER.role === ROLES.SUPER_ADMIN;

/** True if the logged-in user is on the warehouse side */
export const isWarehouseRole = () => CURRENT_USER.role === ROLES.WH_MANAGER;

/**
 * Universal array filter — call this on ANY data list in ANY tab.
 * Admin always gets the full unfiltered array back.
 * Everyone else gets only rows matching their own locationId.
 *
 * @param {Array}  data            - Full dataset from localStorage
 * @param {string} [fieldOverride] - Force a specific field (e.g. 'fromShopId' for transfers)
 */
/**
 * Robust Location Filtering
 * ─────────────────────────────────────────────────────────────────────────────
 * We distinguish between CONTROL (what I own) and VISIBILITY (what I can see).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 
 * Returns only the locations the user CONTROLs (usually just one).
 * Use this for 'Source' fields or 'My Location' selectors.
 */
export const getControlledLocations = (list) => {
    if (!Array.isArray(list)) return [];
    if (isAdmin()) return list;
    return list.filter(loc => loc.id === CURRENT_USER.locationId);
};

/** 
 * Returns locations the user is allowed to SEE (potential destinations/sources).
 * - WH Manager: Sees ALL shops (to ship to) and ALL warehouses (to transfer between).
 * - Shop Roles: Sees ALL warehouses (to receive from) but ONLY their own shop.
 */
export const getVisibleLocations = (list) => {
    if (!Array.isArray(list)) return [];
    if (isAdmin()) return list;

    const isWH = isWarehouseRole();
    const locId = CURRENT_USER.locationId;

    return list.filter(loc => {
        // 1. If it's my own location, I always see it
        if (loc.id === locId) return true;

        // 2. If I'm a WH manager, I can see all other warehouses and all shops
        if (isWH) return true;

        // 3. If I'm a Shop user, I can see all warehouses (as sources)
        // Check if IDs usually start with WH- for warehouses
        if (loc.id.startsWith('WH-')) return true;

        return false;
    });
};

/**
 * Universal array filter — scopes data (products, bills, transfers) 
 * to the user's specific location.
 */
export const filterByLocation = (data, fieldOverride = null) => {
    if (!Array.isArray(data)) return [];
    if (isAdmin()) return data;

    const id = CURRENT_USER.locationId;

    if (isWarehouseRole()) {
        const field = fieldOverride || 'locationId';
        return data.filter(item => item[field] === id || item.locationId === id);
    }

    const field = fieldOverride || 'shopId';
    return data.filter(item => item[field] === id || item.locationId === id);
};

// Legacy/Compatibility helpers
export const filterLocationList = (list) => getControlledLocations(list);
export const needsLocationFilter = (role) => role !== ROLES.SUPER_ADMIN;
export const getLocationFilterField = (role) => (role === ROLES.WH_MANAGER ? 'locationId' : 'shopId');