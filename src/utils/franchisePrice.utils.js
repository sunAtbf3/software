/**
 * Frontend mirror of backend franchisePrice.utils.js — F.Price for transfer / counter floor.
 * Keep in sync with inventoryAndBilling/src/utils/franchisePrice.utils.js
 */
import { roundMoney } from "./billingTax";

export const ALLOWED_FRANCHISE_MARKUP_PERCENTS = [20, 40, 60];
export const DEFAULT_FRANCHISE_MARKUP_PERCENT = 40;

/** Nearest rupee, half-up (same as transfer F.Price). */
export const roundFranchiseRupee = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
};

export const resolveFranchiseMarkupPercent = (value) => {
  const n = Number(value);
  if (ALLOWED_FRANCHISE_MARKUP_PERCENTS.includes(n)) return n;
  return DEFAULT_FRANCHISE_MARKUP_PERCENT;
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

export const resolveVariantSpecialPrice = (variant) => {
  if (!variant) return 0;
  const special = Number(variant.special_price);
  return roundMoney(Math.max(0, Number.isFinite(special) ? special : 0));
};

/**
 * F.Price = totalCost + max(0, selling − totalCost) × markup%
 */
export const calculateFranchiseUnitPriceFromSelling = (variant, markupPercent, sellingPrice) => {
  const totalCost = resolveVariantBaseCost(variant);
  const selling = roundMoney(Math.max(0, Number(sellingPrice) || 0));
  const pct = resolveFranchiseMarkupPercent(markupPercent);
  const gap = Math.max(0, selling - totalCost);
  const markupAmount = roundMoney(gap * (pct / 100));
  return roundFranchiseRupee(totalCost + markupAmount);
};

export const calculateFranchiseUnitPrice = (variant, markupPercent) =>
  calculateFranchiseUnitPriceFromSelling(
    variant,
    markupPercent,
    resolveVariantSpecialPrice(variant)
  );

/** Cart-line helper: F.Price floor from purchase/expenses + catalog special. */
export const getCartLineFranchiseFloor = (item, markupPercent) => {
  if (!item) return 0;
  try {
    return calculateFranchiseUnitPrice(
      {
        purchase_price: item.purchase_price,
        expenses: item.expenses,
        special_price: item.special_price ?? item.retail_price,
      },
      markupPercent
    );
  } catch {
    return 0;
  }
};
