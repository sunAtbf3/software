/**
 * Maps flat IndexedDB shop stock rows to the API shape used by ProductPicker.
 */
export const mapLocalStockToApiRow = (row) => {
  if (!row) return null;

  const product = {
    product_id: row.product_id,
    product_code: row.product_code,
    name: row.product_name,
    brand_name: row.brand_name,
    hsn_code: row.hsn_code,
    gst_percent: row.gst_percent,
    gst_type: row.gst_type,
  };

  const variant = row.variant || {
    variant_id: row.variant_id,
    product_id: row.product_id,
    sku: row.sku,
    product_code: row.product_code,
    system_barcode: row.system_barcode,
    mrp: row.mrp,
    special_price: row.special_price,
    warranty: row.warranty,
    purchase_price: row.purchase_price,
    product,
    images: row.image_url ? [{ url: row.image_url }] : [],
  };

  return {
    shop_stock_id: row.shop_stock_id,
    shop_id: row.shop_id,
    variant_id: row.variant_id,
    quantity_available: row.quantity_available ?? 0,
    quantity_reserved: row.quantity_reserved ?? 0,
    quantity_in_transit: row.quantity_in_transit ?? 0,
    low_stock_threshold: row.low_stock_threshold ?? 5,
    variant: {
      ...variant,
      product: variant.product || product,
    },
  };
};

export const mapLocalStockToBarcodeProduct = (row) => {
  if (!row) return null;
  return {
    variant_id: row.variant_id,
    name: row.product_name,
    system_barcode: row.system_barcode,
    special_price: row.special_price,
    wholesale_price: null,
    brand_name: row.brand_name,
    warranty: row.warranty,
    mrp: row.mrp,
    online_price: null,
    hsn_code: row.hsn_code,
    gst_percent: row.gst_percent,
    gst_type: row.gst_type,
    attributes: row.variant?.attributes ?? null,
    stock_available: row.quantity_available ?? 0,
  };
};
