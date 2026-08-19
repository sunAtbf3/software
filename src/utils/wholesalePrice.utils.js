/**
 * Owner-shop wholesale billing preview — same formula as backend.
 * F.Price shape: totalCost + max(0, selling − totalCost) × %
 * Does not use variant.wholesale_price. Backend remains authoritative on createBill.
 * Rounded to nearest rupee (>= .5 rounds up) to match stored bill pricing.
 */
import { roundMoney } from "./billingTax";

export const DEFAULT_WHOLESALE_MARKUP_PERCENT = 40;
export const MIN_WHOLESALE_MARKUP_PERCENT = 0;
export const MAX_WHOLESALE_MARKUP_PERCENT = 1000;

export const roundWholesaleRupee = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n + 0.5);
};

export const resolveWholesaleMarkupPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_WHOLESALE_MARKUP_PERCENT;
  if (n < MIN_WHOLESALE_MARKUP_PERCENT) return MIN_WHOLESALE_MARKUP_PERCENT;
  if (n > MAX_WHOLESALE_MARKUP_PERCENT) return MAX_WHOLESALE_MARKUP_PERCENT;
  return roundMoney(n);
};

export const resolveVariantBaseCost = (variant) => {
  if (!variant) return 0;
  const purchase = Number(variant.purchase_price);
  const expenses =
    variant.expenses != null && variant.expenses !== ""
      ? Number(variant.expenses)
      : Number(variant.product?.expenses) || 0;
  const unit =
    (Number.isFinite(purchase) ? purchase : 0) + (Number.isFinite(expenses) ? expenses : 0);
  return roundMoney(Math.max(0, unit));
};

export const capSellPriceAtMrp = (price, mrp) => {
  const p = roundWholesaleRupee(price);
  const cap = Number(mrp);
  if (Number.isFinite(cap) && cap > 0 && p > cap) return Math.max(0, Math.floor(cap));
  return p;
};

export const calculateWholesaleUnitPriceFromSelling = (variant, markupPercent, sellingPrice) => {
  const totalCost = resolveVariantBaseCost(variant);
  const selling = roundMoney(Math.max(0, Number(sellingPrice) || 0));
  const pct = resolveWholesaleMarkupPercent(markupPercent);
  const gap = Math.max(0, selling - totalCost);
  const markupAmount = roundMoney(gap * (pct / 100));
  return capSellPriceAtMrp(totalCost + markupAmount, variant?.mrp);
};
