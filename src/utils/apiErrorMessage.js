const FIELD_LABELS = {
  receive_remarks: 'receive remarks',
  cancel_reason: 'cancellation reason',
  rejection_reason: 'rejection reason',
  reject_reason: 'rejection reason',
  gstin: 'GSTIN',
  state_code: 'state code',
  legal_name: 'legal name',
  remarks: 'remarks',
  warehouse_code: 'warehouse code',
  warehouse_name: 'warehouse name',
  address: 'address',
  city: 'city',
  manager_name: 'manager name',
  from_warehouse_id: 'source warehouse',
  to_shop_id: 'destination shop',
  transfer_bill_type: 'transfer bill type',
  received_quantity: 'received quantity',
};

const humanizeField = (field = '') => {
  const key = String(field).replace(/^\d+\./, '').replace(/\[\d+\]/g, '');
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').trim() || 'this field';
};

/** Readable message from RTK Query / axios error payload. */
export const getApiErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err?.data ?? err?.response?.data;
  if (!data) return err?.message || fallback;

  if (data.message && data.message !== 'Validation failed') {
    return data.message;
  }

  const fields = data.details?.fields;
  if (Array.isArray(fields) && fields.length > 0) {
    return fields
      .map((f) => f.message || `Please fill ${humanizeField(f.field)}.`)
      .join(' ');
  }

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors
      .map((f) => f.message || `Please fill ${humanizeField(f.field)}.`)
      .join(' ');
  }

  return data.message || fallback;
};
