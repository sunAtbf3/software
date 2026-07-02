import { ROLES } from "../Components/roles";

export const SHOP_OWNER_CREATABLE_ROLES = ["BILLING_STAFF", "SHOP_MANAGER"];
export const WH_MANAGER_CREATABLE_ROLES = ["WH_STOCK_LISTER"];

export const SHOP_OWNER_EDITABLE_ROLES = ["BILLING_STAFF", "SHOP_MANAGER"];
export const WH_MANAGER_EDITABLE_ROLES = ["WH_STOCK_LISTER"];

export const isTeamManagerRole = (role) =>
  role === ROLES.SHOP_OWNER || role === ROLES.WH_MANAGER;

export const getTeamCreatableRoles = (role) => {
  if (role === ROLES.SHOP_OWNER) return SHOP_OWNER_CREATABLE_ROLES;
  if (role === ROLES.WH_MANAGER) return WH_MANAGER_CREATABLE_ROLES;
  return [];
};

export const getTeamEditableRoles = (role) => {
  if (role === ROLES.SHOP_OWNER) return SHOP_OWNER_EDITABLE_ROLES;
  if (role === ROLES.WH_MANAGER) return WH_MANAGER_EDITABLE_ROLES;
  return [];
};

export const canCreateTeamMember = (actorRole) => getTeamCreatableRoles(actorRole).length > 0;

export const canEditTeamMember = (actorRole, targetUser, currentUserId) => {
  if (!targetUser || targetUser.user_id === currentUserId) return false;
  return getTeamEditableRoles(actorRole).includes(targetUser.role);
};

export const getTeamRoleFilterOptions = (actorRole, allRoles) => {
  if (actorRole === ROLES.SUPER_ADMIN) return allRoles;
  if (actorRole === ROLES.SHOP_OWNER) {
    return allRoles.filter((r) =>
      ["SHOP_OWNER", "BILLING_STAFF", "SHOP_MANAGER"].includes(r.value)
    );
  }
  if (actorRole === ROLES.WH_MANAGER) {
    return allRoles.filter((r) => ["WH_MANAGER", "WH_STOCK_LISTER"].includes(r.value));
  }
  return allRoles;
};
