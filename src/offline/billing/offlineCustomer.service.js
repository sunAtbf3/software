import { customerRepository } from '../db/repositories/dataRepository';
import { enqueueMutation } from '../sync/pushService';
import { getUserShopId } from '../constants';
import { broadcastPendingCounts } from '../sync/offlineSyncState.service';

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
