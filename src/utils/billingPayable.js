import { roundMoney } from "./billingTax";

/**
 * Apply manual extra discount (₹) after GST on gross total.
 */
export const applyExtraDiscount = (grossTotal, extraDiscountAmount) => {
  const gross = roundMoney(grossTotal);
  const extra = roundMoney(Math.min(Math.max(0, Number(extraDiscountAmount) || 0), gross));
  return {
    grossTotal: gross,
    extraDiscount: extra,
    afterExtra: roundMoney(gross - extra),
  };
};

/**
 * Checkout preview: gross − extra discount − credit note = net payable.
 */
export const computeFinalPayable = ({
  grossTotal,
  extraDiscountAmount = 0,
  creditAmount = 0,
} = {}) => {
  const { extraDiscount, afterExtra } = applyExtraDiscount(grossTotal, extraDiscountAmount);
  const credit = roundMoney(Math.min(Math.max(0, Number(creditAmount) || 0), afterExtra));

  return {
    grossTotal: roundMoney(grossTotal),
    extraDiscount,
    creditApplied: credit,
    finalPayable: roundMoney(Math.max(0, afterExtra - credit)),
  };
};
