import { roundMoney } from "./billingTax";

/** Same tolerance as billing backend UNIT_PRICE_ABOVE_MRP. */
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
