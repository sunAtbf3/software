import { customerRepository } from '../db/repositories/dataRepository';
import { outboxRepository } from '../db/repositories/outboxRepository';
import { enqueueMutation } from '../sync/pushService';
import { getUserShopId } from '../constants';
import { broadcastPendingCounts } from '../sync/offlineSyncState.service';
import { OUTBOX_STATUS } from '../constants';

import { CUSTOMER_TYPES } from '../../constants/customerTypes';

const nowIso = () => new Date().toISOString();

const normalizeMobile = (mobile) => String(mobile || '').replace(/\D/g, '');

/**
 * Create customer locally and queue for server sync.
 */
export const createOfflineCustomer = async ({ user, shopId, data }) => {
  const resolvedShopId = shopId || getUserShopId(user);
  const mobile = normalizeMobile(data.mobile);

  if (!/^\d{10}$/.test(mobile)) {
    throw new Error('mobile must be a 10-digit number');
  }

  const existing = await customerRepository.getByMobile(mobile);
  if (existing && !existing.client_id) {
    return existing;
  }

  const clientId = crypto.randomUUID();
  const customer = {
    customer_id: clientId,
    client_id: clientId,
    mobile,
    name: String(data.name).trim(),
    email: data.email?.trim() || null,
    customer_type: data.customer_type || CUSTOMER_TYPES.WALK_IN,
    company_name: data.company_name?.trim() || null,
    gst_number: data.gst_number?.trim() || null,
    address: data.address?.trim() || null,
    city: data.city?.trim() || null,
    state_code: data.state_code || null,
    pincode: data.pincode?.trim() || null,
    remarks: data.remarks?.trim() || null,
    total_spent: 0,
    total_orders: 0,
    loyalty_tier: null,
    is_active: true,
    is_offline_pending: true,
    shop_id: resolvedShopId,
    cached_at: nowIso(),
  };

  await customerRepository.bulkUpsert([customer]);

  await enqueueMutation({
    client_id: clientId,
    shop_id: resolvedShopId,
    entity_type: 'customer',
    idempotency_key: clientId,
    payload: {
      mobile: customer.mobile,
      name: customer.name,
      email: customer.email,
      customer_type: customer.customer_type,
      company_name: customer.company_name,
      gst_number: customer.gst_number,
      address: customer.address,
      city: customer.city,
      state_code: customer.state_code,
      pincode: customer.pincode,
      remarks: customer.remarks,
    },
    stock_mutated_locally: false,
    offline_created_at: nowIso(),
  });

  await broadcastPendingCounts(resolvedShopId);

  return customer;
};

/**
 * Update customer locally and queue for server sync.
 *
 * Two paths:
 *  - Offline-pending customer (never synced): patch the existing 'customer' outbox
 *    payload so the latest fields are sent when connectivity returns.
 *  - Server-synced customer (real DB id): update local cache and enqueue a
 *    'customer_update' outbox item that will PATCH the server record on sync.
 */
export const updateOfflineCustomer = async ({ user, shopId, customerId, data }) => {
  const resolvedShopId = shopId || getUserShopId(user);

  // Load the existing local record so we can merge
  const existing = await customerRepository.getById(customerId);
  if (!existing) {
    throw new Error('Customer not found in local database. Make sure the offline cache is populated.');
  }

  const mobile = normalizeMobile(data.mobile || existing.mobile);
  if (!/^\d{10}$/.test(mobile)) {
    throw new Error('mobile must be a 10-digit number');
  }

  const nowTs = nowIso();
  const customerType = data.customer_type ?? existing.customer_type ?? CUSTOMER_TYPES.WALK_IN;

  // Merged record written back to IndexedDB immediately
  const updated = {
    ...existing,
    mobile,
    name: String(data.name ?? existing.name).trim(),
    email: data.email?.trim() || null,
    customer_type: customerType,
    is_gst_registered: customerType === CUSTOMER_TYPES.GST,
    company_name: data.company_name?.trim() || null,
    gst_number: data.gst_number?.trim() || null,
    address: data.address?.trim() || null,
    city: data.city?.trim() || null,
    state_code: data.state_code || null,
    pincode: data.pincode?.trim() || null,
    remarks: data.remarks?.trim() || null,
    cached_at: nowTs,
  };

  await customerRepository.bulkUpsert([updated]);

  const updatedPayload = {
    mobile: updated.mobile,
    name: updated.name,
    email: updated.email,
    customer_type: updated.customer_type,
    company_name: updated.company_name,
    gst_number: updated.gst_number,
    address: updated.address,
    city: updated.city,
    state_code: updated.state_code,
    pincode: updated.pincode,
    remarks: updated.remarks,
  };

  if (existing.is_offline_pending || existing.client_id) {
    // ── Path A: offline-pending customer ───────────────────────────────────
    // The original 'customer' create is still in the outbox.
    // Patch its payload so the server receives the latest data on sync.
    const pendingClientId = existing.client_id || existing.customer_id;
    const outboxEntry = await outboxRepository.getByClientId(pendingClientId);
    if (outboxEntry && (outboxEntry.status === OUTBOX_STATUS.PENDING || outboxEntry.status === OUTBOX_STATUS.ERROR)) {
      await outboxRepository.updateEntry(pendingClientId, { payload: updatedPayload });
    }
    // If already syncing or synced, the update is local-only; it will be
    // reconciled when the pull service refreshes the customer list next time online.
  } else {
    // ── Path B: server-synced customer ─────────────────────────────────────
    // Remove any previous pending customer_update for the same customer so we
    // don't accumulate stale edits in the outbox.
    const allPending = await outboxRepository.listByShop(resolvedShopId, {
      statuses: [OUTBOX_STATUS.PENDING, OUTBOX_STATUS.ERROR],
    });
    const previousEdit = allPending.find(
      (r) =>
        r.entity_type === 'customer_update' &&
        r.payload?.customer_id === customerId
    );
    if (previousEdit) {
      await outboxRepository.remove(previousEdit.client_id);
    }

    // Enqueue the fresh edit
    const editClientId = crypto.randomUUID();
    await enqueueMutation({
      client_id: editClientId,
      shop_id: resolvedShopId,
      entity_type: 'customer_update',
      idempotency_key: editClientId,
      payload: {
        customer_id: customerId,
        ...updatedPayload,
      },
      stock_mutated_locally: false,
      offline_created_at: nowTs,
    });
  }

  await broadcastPendingCounts(resolvedShopId);

  return updated;
};

export const searchOfflineCustomerByMobile = async (mobile) => {
  const normalized = normalizeMobile(mobile);
  if (normalized.length !== 10) return null;
  return customerRepository.getByMobile(normalized);
};

export const resolveCustomerForBill = (selectedCustomer) => {
  if (!selectedCustomer) return { customer_id: null, offline_customer_client_id: null };

  if (selectedCustomer.is_offline_pending || selectedCustomer.client_id) {
    return {
      customer_id: null,
      offline_customer_client_id: selectedCustomer.client_id || selectedCustomer.customer_id,
      customer_mobile: selectedCustomer.mobile,
      customer_name: selectedCustomer.name,
    };
  }

  return {
    customer_id: selectedCustomer.customer_id,
    offline_customer_client_id: null,
    customer_mobile: selectedCustomer.mobile,
    customer_name: selectedCustomer.name,
  };
};


