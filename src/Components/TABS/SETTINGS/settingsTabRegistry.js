// TABS/SETTINGS/settingsTabRegistry.js
import { lazy } from "react";

const UsersTab = lazy(() => import("./UserTab/UsersTab"));
const ShopsTab = lazy(() => import("./ShopsTab/ShopsTab"));
const VendorsTab = lazy(() => import("../VENDOR/VendorsTab"));
// const CompanyDetailsTab = lazy(() => import("./CompanyDetailsTab/CompanyDetailsTab"));
const BankDetailsTab = lazy(() => import("./BankDetailsTab/BankDetailsTab"));
const StaffCodesTab = lazy(() => import("./StaffCodesTab/StaffCodesTab"));
const FranchiseSettingsTab = lazy(() => import("./FranchiseSettingsTab/FranchiseSettingsTab"));
const ShopProfileTab = lazy(() => import("./ShopProfileTab/ShopProfileTab"));
const WarehouseProfileTab = lazy(() => import("./WarehouseProfileTab/WarehouseProfileTab"));

export const SETTINGS_TAB_REGISTRY = [
    {
        id: "users",
        label: "Users & Roles",
        icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
        component: UsersTab,
    },
    {
        id: "shops",
        label: "Shops",
        icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
        component: ShopsTab,
    },
    {
        id: "shopprofile",
        label: "Shop Profile",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
        component: ShopProfileTab,
    },
    {
        id: "warehouseprofile",
        label: "Warehouse Profile",
        icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
        component: WarehouseProfileTab,
    },
    {
        id: "vendors",
        label: "Vendors",
        icon: "M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2",
        component: VendorsTab,
    },

    // {
    //     id: "companydetails",
    //     label: "Company Details",
    //     icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    //     component: CompanyDetailsTab,
    // },
    {
        id: "bankdetails",
        label: "Bank Details",
        icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        component: BankDetailsTab,
    },
    {
        id: "franchise",
        label: "Franchise Pricing",
        icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        component: FranchiseSettingsTab,
    },
    {
        id: "staffcodes",
        label: "Staff Codes",
        icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
        component: StaffCodesTab,
    },

];
