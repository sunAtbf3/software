/**
 * Billing cart helpers — product GST from master, cart line shape for Redux.
 */
import { normalizeAttributes } from "./variantAttributes.utils";

export const toBillingNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
};

/** GST % lives on Product, not ProductVariant. */
export const resolveProductGstPercent = (product) => {
  if (!product) return 0;
  const n = toBillingNumber(product.gst_percent, NaN);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const resolveProductGstType = (product) => {
  const t = String(product?.gst_type || "CGST_SGST").trim().toUpperCase();
  if (t === "IGST" || t === "EXEMPT" || t === "CGST_SGST") return t;
  return "CGST_SGST";
};

/**
 * GST amount from taxable line total and product gst_percent (e.g. 12 means 12%, not ×12).
 */
export const calculateGstOnAmount = (taxableAmount, gstPercent) => {
  const base = toBillingNumber(taxableAmount);
  const rate = toBillingNumber(gstPercent);
  if (base <= 0 || rate <= 0) return 0;
  return Math.round((base * rate) / 100 * 100 + Number.EPSILON) / 100;
};

/** Human label for UI; null when not configured or zero. */
export const formatGstPercentLabel = (gstPercent) => {
  const n = toBillingNumber(gstPercent, NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n % 1 === 0 ? `${n}%` : `${n.toFixed(2)}%`;
};

/**
 * Shop stock for billing: prefer API shop stock, then loaded shop-stocks list.
 * Returns null when unknown — must not be treated as zero (out of stock).
 */
export const resolveBillingStockAvailable = (productRow, shopStocks = []) => {
  if (productRow?.stock_available != null && productRow.stock_available !== "") {
    return toBillingNumber(productRow.stock_available);
  }
  if (productRow?.quantity_available != null && productRow.quantity_available !== "") {
    return toBillingNumber(productRow.quantity_available);
  }
  const variantId = productRow?.variant_id;
  if (variantId == null) return null;
  const match = shopStocks.find((row) => row.variant_id === variantId);
  return match ? toBillingNumber(match.quantity_available) : null;
};

/** True when another unit can be added; unknown stock does not block. */
export const canIncreaseCartQuantity = (currentQty, stockAvailable) => {
  if (stockAvailable == null || !Number.isFinite(stockAvailable)) return true;
  return currentQty + 1 <= stockAvailable;
};

export const isBillingItemOnSale = (item) =>
  item?.on_sale === true && Number(item?.sale_price ?? item?.effective_special_price) > 0;

/** Default charged unit while SPECIAL: live sale overlay, else catalog special. */
export const resolveBillingDefaultUnitPrice = (item = {}) => {
  if (isBillingItemOnSale(item)) {
    return toBillingNumber(item.effective_special_price ?? item.sale_price);
  }
  return toBillingNumber(item.special_price ?? item.retail_price);
};

/**
 * Build payload for billingSlice addToCart from shop stock / barcode API row.
 */
export const buildBillingCartItem = ({
  variant_id,
  product_name,
  system_barcode,
  product_code,
  special_price,
  wholesale_price,
  mrp,
  online_price,
  retail_price,
  gst_percent,
  gst_type,
  hsn_code,
  quantity_available,
  attributes,
  variant_attributes,
  price_type = "SPECIAL",
  quantity = 1,
  combo_eligible = false,
  on_sale = false,
  sale_price = null,
  effective_special_price = null,
  purchase_price = null,
  expenses = null,
}) => {
  const onSale = on_sale === true;
  const sale = onSale ? toBillingNumber(effective_special_price ?? sale_price) : 0;
  const catalogSpecial = toBillingNumber(special_price ?? retail_price);
  const unitPrice = onSale && sale > 0 ? sale : catalogSpecial;
  const gst = toBillingNumber(gst_percent);
  const type = String(gst_type || "CGST_SGST").trim().toUpperCase();
  const normalizedType =
    type === "IGST" || type === "EXEMPT" || type === "CGST_SGST" ? type : "CGST_SGST";
  const normalizedAttributes = normalizeAttributes(variant_attributes ?? attributes);
  return {
    variant_id,
    product_name: product_name || "Unknown",
    system_barcode: system_barcode || "",
    product_code: product_code || "",
    variant_attributes: normalizedAttributes.length ? normalizedAttributes : undefined,
    quantity,
    price_type,
    unit_price: unitPrice,
    retail_price: toBillingNumber(retail_price ?? special_price),
    wholesale_price: toBillingNumber(wholesale_price),
    special_price: catalogSpecial,
    mrp: toBillingNumber(mrp),
    online_price: toBillingNumber(online_price),
    purchase_price: toBillingNumber(purchase_price),
    expenses: toBillingNumber(expenses),
    gst_percent: gst,
    gst_type: normalizedType,
    hsn_code: hsn_code ? String(hsn_code).trim() : null,
    quantity_available:
      quantity_available != null ? toBillingNumber(quantity_available) : null,
    combo_eligible: combo_eligible === true && !onSale,
    on_sale: onSale,
    sale_price: onSale && sale > 0 ? sale : null,
    combo_applied: false,
    combo_unit_price: null,
    combo_units: 0,
    price_overridden: false,
    line_total: unitPrice * quantity,
    gst_amount: 0,
  };
};
