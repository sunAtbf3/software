const toNumber = (val, defaultVal = 0) => {
  const num = Number(val);
  return Number.isNaN(num) ? defaultVal : num;
};

/**
 * Validate one variant's price chain in isolation (no cross-variant inheritance).
 * Returns an error message string or null.
 */
export const validateCatalogPricing = (prices, label = "Variant") => {
  const prefix = label ? `${label}: ` : "";
  const mrp = toNumber(prices.mrp, NaN);
  const special = toNumber(prices.special_price, NaN);
  const wholesale = toNumber(prices.wholesale_price, NaN);
  const purchase = toNumber(prices.purchase_price, NaN);
  const expenses = toNumber(prices.expenses, NaN);

  if (!Number.isFinite(mrp) || mrp <= 0) return `${prefix}MRP is required and must be > 0`;
  if (!Number.isFinite(special) || special <= 0) return `${prefix}Special price is required and must be > 0`;
  if (!Number.isFinite(wholesale) || wholesale < 0) return `${prefix}Wholesale price is required`;
  if (!Number.isFinite(purchase) || purchase < 0) return `${prefix}Purchase price is required`;
  if (!Number.isFinite(expenses) || expenses < 0) return `${prefix}Expenses is required`;

  if (special > mrp) return `${prefix}Special price cannot exceed MRP`;
  if (purchase > wholesale) return `${prefix}Purchase price cannot exceed wholesale price`;
  if (wholesale > special) return `${prefix}Wholesale price cannot exceed special price`;

  return null;
};

export const mapVariantCatalogPrices = (source) => ({
  mrp: toNumber(source.mrp),
  special_price: toNumber(source.special_price),
  wholesale_price: toNumber(source.wholesale_price),
  purchase_price: source.purchase_price != null && source.purchase_price !== ""
    ? toNumber(source.purchase_price)
    : 0,
  expenses: toNumber(source.expenses),
  warranty: String(source.warranty || "").trim() || undefined,
});
