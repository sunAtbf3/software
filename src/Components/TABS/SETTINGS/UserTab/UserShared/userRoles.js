export const OWNER_FORM_ROLE_MEHTA = "SHOP_OWNER__OWNER";
export const OWNER_FORM_ROLE_FRANCHISE = "SHOP_OWNER__FRANCHISE";

export const USER_ROLES = [
    { value: "SUPER_ADMIN", label: "Super Admin", color: "bg-purple-100 text-purple-700" },
    { value: "ORG_MANAGER", label: "Org Manager", color: "bg-violet-100 text-violet-700" },
    { value: "WH_MANAGER", label: "Warehouse Manager", color: "bg-indigo-100 text-indigo-700" },
    { value: "WH_STOCK_LISTER", label: "WH Stock Lister", color: "bg-blue-100 text-blue-700" },
    { value: "SHOP_OWNER", label: "Shop Owner", color: "bg-green-100 text-green-700" },
    { value: "BILLING_STAFF", label: "Billing Staff", color: "bg-yellow-100 text-yellow-700" },
    { value: "SHOP_MANAGER", label: "Shop Manager", color: "bg-orange-100 text-orange-700" },
];

const WH_ROLES = ["WH_MANAGER", "WH_STOCK_LISTER"];

export const resolveApiRole = (formRole) => {
    if (formRole === OWNER_FORM_ROLE_MEHTA || formRole === OWNER_FORM_ROLE_FRANCHISE) {
        return "SHOP_OWNER";
    }
    return formRole || "";
};

export const isShopOwnerFormRole = (formRole) =>
    formRole === "SHOP_OWNER"
    || formRole === OWNER_FORM_ROLE_MEHTA
    || formRole === OWNER_FORM_ROLE_FRANCHISE;

export const isWarehouseFormRole = (formRole) => WH_ROLES.includes(resolveApiRole(formRole));

export const isShopAssignmentFormRole = (formRole) => {
    const apiRole = resolveApiRole(formRole);
    return apiRole === "SHOP_OWNER" || apiRole === "BILLING_STAFF" || apiRole === "SHOP_MANAGER";
};

export const getOwnerShopTypeFilter = (formRole) => {
    if (formRole === OWNER_FORM_ROLE_FRANCHISE) return "FRANCHISE";
    if (formRole === OWNER_FORM_ROLE_MEHTA) return "OWNER";
    return null;
};

const shopTypeOfUser = (user) =>
    user?.shop?.shop_type || user?.owned_shop?.shop_type || null;

export const toOwnerFormRole = (user) => {
    if (!user || user.role !== "SHOP_OWNER") return user?.role || "";
    return shopTypeOfUser(user) === "FRANCHISE"
        ? OWNER_FORM_ROLE_FRANCHISE
        : OWNER_FORM_ROLE_MEHTA;
};

export const getUserFormRoleOptions = (actorRole, { teamMode = false, allowedRoles = null } = {}) => {
    if (teamMode && allowedRoles?.length) {
        return USER_ROLES.filter((r) => allowedRoles.includes(r.value));
    }

    const canCreateFranchiseOwner = actorRole !== "ORG_MANAGER";
    const options = [];

    for (const r of USER_ROLES) {
        if (r.value === "SHOP_OWNER") {
            options.push({
                value: OWNER_FORM_ROLE_MEHTA,
                label: "Mehta Mart Owner",
                color: r.color,
            });
            if (canCreateFranchiseOwner) {
                options.push({
                    value: OWNER_FORM_ROLE_FRANCHISE,
                    label: "Franchise Shop Owner",
                    color: r.color,
                });
            }
            continue;
        }
        options.push(r);
    }

    if (allowedRoles?.length) {
        return options.filter((r) => allowedRoles.includes(resolveApiRole(r.value)));
    }

    if (actorRole === "ORG_MANAGER") {
        const allowed = new Set(["WH_MANAGER", "WH_STOCK_LISTER", "SHOP_OWNER", "BILLING_STAFF", "SHOP_MANAGER"]);
        return options.filter((r) => allowed.has(resolveApiRole(r.value)));
    }

    return options;
};
