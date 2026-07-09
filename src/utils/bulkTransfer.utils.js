/** Original qty requested by shop (immutable). */
export const getBulkRequestedQty = (item) =>
  Number(item?.requested_quantity ?? item?.quantity) || 0;

/** Warehouse-approved / sent qty — only after WH sets approved_quantity. */
export const getBulkDispatchQty = (item) => {
  if (item?.is_approved === false) return 0;
  if (item?.approved_quantity != null) return Number(item.approved_quantity) || 0;
  return 0;
};

const PRE_APPROVAL_STATUSES = new Set(['REQUESTED', 'REJECTED', 'CANCELLED']);

/** Display sent qty; blank until WH approves the request. */
export const formatBulkSentQty = (item, requestStatus) => {
  if (PRE_APPROVAL_STATUSES.has(requestStatus)) return '—';
  const qty = getBulkDispatchQty(item);
  return qty;
};

export const sumBulkDispatchedQtyForRequest = (items = [], requestStatus) => {
  if (PRE_APPROVAL_STATUSES.has(requestStatus)) return null;
  return sumBulkDispatchedQty(items);
};

/** Remaining in-transit qty for a bulk line. */
export const getBulkInTransitQty = (item) => {
  const dispatched = getBulkDispatchQty(item);
  const received = Number(item?.received_quantity ?? 0);
  return Math.max(0, dispatched - received);
};

export const sumBulkRequestedQty = (items = []) =>
  items.reduce((sum, item) => sum + getBulkRequestedQty(item), 0);

export const sumBulkDispatchedQty = (items = []) =>
  items.reduce((sum, item) => sum + getBulkDispatchQty(item), 0);

export const sumBulkReceivedQty = (items = []) =>
  items.reduce((sum, item) => sum + (Number(item?.received_quantity) || 0), 0);

export const sumBulkInTransitQty = (items = []) =>
  items.reduce((sum, item) => sum + getBulkInTransitQty(item), 0);

export const getBulkReceiveableItems = (items = []) =>
  items.filter((item) => getBulkInTransitQty(item) > 0);
