import { roundMoney, splitTaxByProductGstType } from "./billingTax";
import { getStateName, normalizeStateCode } from "../constants/indianStateCodes";
import { BILL_TYPES } from "../constants/billingBillTypes";
import { amountInWords } from "./amountInWords";
import {
  formatAttributesDisplay,
  resolveItemVariantAttributes,
} from "./variantAttributes.utils";

export const fmtNum = (n) =>
  (Number.isFinite(Number(n)) ? Number(n) : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtMoney = (n) => `Rs. ${fmtNum(n)}`;

export const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN");
};

export const displayVal = (v) => {
  const s = v == null ? "" : String(v).trim();
  return s;
};

export const truncateProductName = (value, max = 25) => {
  const text = displayVal(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

export const resolveLineProductName = (item) =>
  item?.manual_item_name ||
  item?.variant?.product?.name ||
  item?.product?.name ||
  item?.item_name ||
  item?.product_name ||
  item?.variant?.sku ||
  "Item";

export const resolveLineBrand = (item) =>
  displayVal(item?.variant?.product?.brand_name || item?.product?.brand_name);

export const resolveLineWarranty = (item) =>
  displayVal(item?.variant?.warranty || item?.product?.warranty);

/** Attribute lines only — for A4/PDF product-name column (brand/warranty use dedicated columns). */
export const resolveLineAttributeText = (item, { isNonListed = false } = {}) => {
  if (isNonListed || item?.manual_item_name) return "";
  return formatAttributesDisplay(resolveItemVariantAttributes(item));
};

/**
 * Structured meta for 80mm receipts: attributes first, then brand & warranty on separate lines.
 * @returns {Array<{ kind: 'attributes', parts: Array<{key,value}> } | { kind: 'field', label: string, value: string }>}
 */
export const resolveLineMeta = (item, { isNonListed = false } = {}) => {
  if (isNonListed || item?.manual_item_name) return [];

  const lines = [];
  const parts = resolveItemVariantAttributes(item);
  if (parts.length) lines.push({ kind: "attributes", parts });

  const brand = resolveLineBrand(item);
  if (brand) lines.push({ kind: "field", label: "Brand", value: brand });

  const warranty = resolveLineWarranty(item);
  if (warranty) lines.push({ kind: "field", label: "Warranty", value: warranty });

  return lines;
};

export const lineMrp = (item) => {
  const mrp = item.mrp_unit_price ?? item.variant?.mrp ?? item.mrp;
  if (mrp != null && Number(mrp) > 0) return Number(mrp);
  return Number(item.unit_price) || 0;
};

export const lineSpecialTotal = (item) =>
  roundMoney((Number(item.unit_price) || 0) * (Number(item.quantity) || 0));

export const calcMrpDiscount = (items) => {
  let total = 0;
  for (const item of items || []) {
    const mrp = lineMrp(item);
    const special = Number(item.unit_price) || 0;
    const qty = Number(item.quantity) || 0;
    total = roundMoney(total + Math.max(0, mrp - special) * qty);
  }
  return total;
};

export const buildTaxSummaryFromLines = (lines) => {
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  for (const line of lines || []) {
    const taxAmt = line.tax_amount ?? line.gst_amount ?? 0;
    const split = splitTaxByProductGstType(taxAmt, line.gst_type);
    cgst = roundMoney(cgst + split.cgst);
    sgst = roundMoney(sgst + split.sgst);
    igst = roundMoney(igst + split.igst);
  }

  let tax_mode = "EXEMPT";
  if (igst > 0 && cgst === 0 && sgst === 0) tax_mode = "IGST";
  else if (cgst > 0 || sgst > 0) tax_mode = "CGST_SGST";

  return { tax_mode, cgst, sgst, igst, is_intra_state: tax_mode === "CGST_SGST" };
};

export const getTaxRatePercents = (items, taxMode) => {
  const taxedLine = (items || []).find(
    (i) => (i.tax_amount ?? i.gst_amount ?? 0) > 0 && Number(i.gst_percent) > 0
  );
  if (!taxedLine) return { cgstPercent: 0, sgstPercent: 0, igstPercent: 0, totalPercent: 0 };
  const rate = Number(taxedLine.gst_percent) || 0;
  if (taxMode === "IGST") {
    return { cgstPercent: 0, sgstPercent: 0, igstPercent: rate, totalPercent: rate };
  }
  const half = roundMoney(rate / 2);
  return {
    cgstPercent: half,
    sgstPercent: roundMoney(rate - half),
    igstPercent: 0,
    totalPercent: rate,
  };
};

export const formatStateLabel = (code, { withCode = true } = {}) => {
  const normalized = normalizeStateCode(code);
  if (!normalized) return "";
  const name = getStateName(normalized);
  return withCode ? `${name} (${normalized})` : name;
};

export const formatCityStateLabel = (city, stateCode, { withCode = true } = {}) => {
  const cityPart = displayVal(city);
  const statePart = formatStateLabel(stateCode, { withCode });
  if (cityPart && statePart) return `${cityPart}, ${statePart}`;
  return cityPart || statePart;
};

export const resolveBillTypeFlags = (billType) => ({
  isNonGst: billType === BILL_TYPES.WITHOUT_GST,
  isEstimate: billType === BILL_TYPES.ESTIMATE,
  isGst: billType === BILL_TYPES.WITH_GST,
});

export { amountInWords };
