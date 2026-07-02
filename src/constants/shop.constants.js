/** Must match backend shop.constants.js / shop.validators.js */
export const SHOP_CODE_PATTERN = /^[A-Z0-9_]{3,20}$/;

export const SHOP_CODE_FORMAT_HINT =
  "3–20 uppercase letters, numbers, or underscore (e.g. SHOP_DL_001)";

export const SHOP_CODE_PLACEHOLDER = "e.g. SHOP_DL_001";

export const normalizeShopCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "");

export const isValidShopCode = (value) => SHOP_CODE_PATTERN.test(normalizeShopCode(value));
