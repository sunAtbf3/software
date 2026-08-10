import { useSelector } from "react-redux";
import { useGetMyShopQuery, useGetShopByIdQuery } from "../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";

const SHOP_SCOPED_ROLES = new Set(["SHOP_OWNER", "SHOP_MANAGER", "BILLING_STAFF"]);

export const isFranchiseShopType = (shopType) => shopType === "FRANCHISE";

/** Billing counter: no MRP/Special dropdown — SPECIAL only (OWNER + FRANCHISE). */
export const isSpecialPriceOnlyShopType = (shopType) =>
  shopType === "OWNER" || shopType === "FRANCHISE";

export const canViewWholesalePrice = (user, shopType) => {
  if (!user?.role) return true;
  if (!SHOP_SCOPED_ROLES.has(user.role)) return true;
  if (!shopType) return true;
  return !isFranchiseShopType(shopType);
};

export function useShopPricingVisibility() {
  const { user } = useSelector((state) => state.auth);
  const isShopOwner = user?.role === "SHOP_OWNER";
  const isShopScoped = SHOP_SCOPED_ROLES.has(user?.role);
  const shopId = user?.shop_id || user?.shopId || "";

  const { data: myShop } = useGetMyShopQuery(undefined, { skip: !isShopOwner });
  const { data: assignedShop } = useGetShopByIdQuery(shopId, {
    skip: isShopOwner || !shopId,
  });

  const shopType = isShopOwner ? myShop?.shop_type : assignedShop?.shop_type;

  return {
    canViewWholesale: canViewWholesalePrice(user, shopType),
    shopType,
    isShopScoped,
  };
}
