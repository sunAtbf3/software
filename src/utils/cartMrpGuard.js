import { roundMoney } from "./billingTax";
import { getCartLineFranchiseFloor } from "./franchisePrice.utils";

/** Same tolerance as billing backend UNIT_PRICE_ABOVE_MRP / BELOW_FRANCHISE. */
export const MRP_PRICE_EPSILON = 0.005;

/**
 * True when charged sell price is above catalog/line MRP.
 * Missing or non-positive MRP is not treated as a cap.
 */
export const sellPriceExceedsMrp = (unitPrice, mrp) => {
  const cap = Number(mrp);
  const price = Number(unitPrice);
  if (!Number.isFinite(cap) || cap <= 0) return false;
  if (!Number.isFinite(price)) return true;
  return roundMoney(price) > roundMoney(cap) + MRP_PRICE_EPSILON;
};

/**
 * True when charged sell price is below franchise F.Price floor.
 * Missing or non-positive floor is not treated as a min.
 */
export const sellPriceBelowFranchiseFloor = (unitPrice, franchiseFloor) => {
  const floor = Number(franchiseFloor);
  const price = Number(unitPrice);
  if (!Number.isFinite(floor) || floor <= 0) return false;
  if (!Number.isFinite(price)) return true;
  return roundMoney(price) < roundMoney(floor) - MRP_PRICE_EPSILON;
};

export const getLinesExceedingMrp = (items = []) =>
  items.filter(
    (item) =>
      item.special_price_invalid === true || sellPriceExceedsMrp(item.unit_price, item.mrp)
  );

export const describeMrpViolations = (items = []) => {
  const bad = getLinesExceedingMrp(items);
  if (!bad.length) return null;
  return "Sell price cannot exceed MRP. Keep it at or below MRP to create the bill.";
};

/**
 * Franchise manual overrides only: unit_price must be >= F.Price.
 * Combo / catalog auto lines (price_overridden !== true) are ignored.
 */
export const getLinesBelowFranchiseFloor = (
  items = [],
  { shopType, franchiseMarkupPercent } = {}
) => {
  if (shopType !== "FRANCHISE") return [];
  return (items || []).filter((item) => {
    if (item.price_overridden !== true) return false;
    const floor = getCartLineFranchiseFloor(item, franchiseMarkupPercent);
    return sellPriceBelowFranchiseFloor(item.unit_price, floor);
  });
};

export const describeFranchiseFloorViolations = (
  items = [],
  { shopType, franchiseMarkupPercent } = {}
) => {
  const bad = getLinesBelowFranchiseFloor(items, { shopType, franchiseMarkupPercent });
  if (!bad.length) return null;
  return "Sell price cannot be below F.Price. Keep it at or above F.Price to create the bill.";
};

/** Combined MRP ceiling + franchise floor messages for checkout / offline. */
export const describeCartPriceBandViolations = (
  items = [],
  { shopType, franchiseMarkupPercent } = {}
) => {
  const mrpMsg = describeMrpViolations(items);
  if (mrpMsg) return mrpMsg;
  return describeFranchiseFloorViolations(items, { shopType, franchiseMarkupPercent });
};
