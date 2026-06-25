/**
 * Maps flat IndexedDB customer rows to the API shape used by CustomersTab.
 */
export const mapLocalCustomerToApiRow = (row) => {
  if (!row) return null;

  return {
    customer_id: row.customer_id,
    client_id: row.client_id || null,
    mobile: row.mobile,
    name: row.name,
    email: row.email || null,
    // is_gst_registered: prefer the stored boolean; fall back to truthy gst_number
    is_gst_registered: row.is_gst_registered === true || Boolean(row.gst_number),
    company_name: row.company_name || null,
    gst_number: row.gst_number || null,
    address: row.address || null,
    city: row.city || null,
    state_code: row.state_code || null,
    pincode: row.pincode || null,
    remarks: row.remarks || null,
    total_spent: row.total_spent ?? 0,
    total_orders: row.total_orders ?? 0,
    loyalty_tier: row.loyalty_tier || null,
    last_purchase: row.last_purchase || row.last_purchase_at || null,
    is_active: row.is_active !== false,
    is_offline_pending: Boolean(row.is_offline_pending),
    shop_id: row.shop_id || null,
  };
};
