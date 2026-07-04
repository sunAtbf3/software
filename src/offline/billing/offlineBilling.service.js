import { aggregateCartTax } from '../../utils/billingTax';
import { BILL_TYPES } from '../../constants/billingBillTypes';
import { shopConfigRepository, customerRepository } from '../db/repositories/dataRepository';
import {
  localBillsRepository,
  offlineBillNumberService,
} from '../db/repositories/localBillsRepository';
import { applyLocalSaleDeductions } from '../sync/shopStockSync.service';
import { enqueueMutation } from '../sync/pushService';
import { getUserShopId } from '../constants';

const nowIso = () => new Date().toISOString();

const buildBillSnapshot = ({
  clientBillId,
  billNumber,
  shopId,
  payload,
  cart,
  taxSummary,
  totals,
  staffSnapshot,
  bankSnapshot,
}) => ({
  client_bill_id: clientBillId,
  bill_id: clientBillId,
  bill_number: billNumber,
  offline_bill_number: billNumber,
  shop_id: shopId,
  bill_type: payload.bill_type,
  customer_id: payload.customer_id || null,
  customer_mobile: payload.customer_mobile || null,
  customer_name: payload.customer_name || null,
  customer_gstin: payload.customer_gstin || null,
  subtotal: totals.subtotal,
  discount: totals.discount || 0,
  taxable_amount: totals.taxable_amount || totals.subtotal,
  gst_amount: totals.gst_amount,
  total_amount: totals.total,
  tax_summary: taxSummary,
  payment_status: payload.payment_amount > 0 ? 'PAID' : 'PENDING',
  payment_method: payload.payment_method || null,
  paid_amount: payload.payment_amount || 0,
  balance_amount: Math.max(0, totals.total - (payload.payment_amount || 0)),
  credit_applied: 0,
  staff_code_value: staffSnapshot?.code || null,
  staff_name_snapshot: staffSnapshot?.display_name || null,
  bank_account_id: payload.bank_account_id || null,
  bank_account: bankSnapshot,
  gst_config_id: payload.gst_config_id || null,
  items: cart.map((item) => payload.bill_type === BILL_TYPES.NON_LISTED ? {
    variant_id: null,
    manual_item_name: item.item_name || item.product_name || 'Non-Listed Item',
    quantity: item.quantity,
    unit_price: item.unit_price,
    mrp_unit_price: item.mrp ?? item.unit_price,
    price_type: 'SPECIAL',
    line_total: item.unit_price * item.quantity,
    tax_amount: 0,
    gst_amount: 0,
    gst_percent: 0,
    gst_type: 'EXEMPT',
    hsn_code: '',
    variant: {
      sku: '',
      mrp: item.mrp ?? item.unit_price,
      product: { name: item.item_name || item.product_name || 'Non-Listed Item' },
    },
  } : {
    variant_id: item.variant_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    mrp_unit_price: item.mrp ?? item.unit_price,
    price_type: item.price_type,
    line_total: item.line_total,
    tax_amount: item.gst_amount || 0,
    gst_amount: item.gst_amount || 0,
    gst_percent: item.gst_percent ?? 0,
    gst_type: item.gst_type || "CGST_SGST",
    hsn_code: item.hsn_code ?? null,
    variant: {
      sku: item.system_barcode,
      mrp: item.mrp ?? item.unit_price,
      attributes: item.variant_attributes ?? null,
      product: { name: item.product_name },
    },
  }),
  payments: payload.payment_amount > 0 && payload.payment_method
    ? [{
        amount: payload.payment_amount,
        payment_method: payload.payment_method,
        paid_at: nowIso(),
        reference_no: payload.reference_no || null,
      }]
    : [],
  sync_status: 'pending_sync',
  is_offline: true,
  created_at: nowIso(),
});

/**
 * Create a bill entirely on-device: stock deduct, local record, outbox enqueue.
 */
export const createOfflineBill = async ({
  user,
  shopId,
  payload,
  cart,
  billType,
  staffCodeId,
  offlineCustomerClientId,
}) => {
  const resolvedShopId = shopId || getUserShopId(user);
  if (!resolvedShopId) {
    throw new Error('Shop context is required for offline billing');
  }

  if (payload.credit_note_ids?.length) {
    throw new Error('Credit notes cannot be applied while offline');
  }

  const config = await shopConfigRepository.getConfigBundle();
  const shop = config?.shop;
  const shopCode = shop?.shop_code || resolvedShopId.slice(-6);

  let staffSnapshot = null;
  if (staffCodeId && config?.staff_codes?.length) {
    staffSnapshot = config.staff_codes.find((s) => s.staff_code_id === staffCodeId) || null;
  }

  let bankSnapshot = null;
  if (payload.bank_account_id && config?.bank_accounts?.length) {
    const bankRow = config.bank_accounts.find(
      (a) => a.bank_account_id === payload.bank_account_id
    );
    if (bankRow) {
      bankSnapshot = {
        bank_account_id: bankRow.bank_account_id,
        account_holder_name: bankRow.account_holder_name,
        bank_name: bankRow.bank_name,
        branch_name: bankRow.branch_name,
        account_number_masked: bankRow.account_number_masked,
        ifsc_code: bankRow.ifsc_code,
        upi_id: bankRow.upi_id,
      };
    }
  }

  const taxSummary = billType === BILL_TYPES.NON_LISTED
    ? { subtotal: cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0), gst_amount: 0, total_amount: cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0), cgst: 0, sgst: 0, igst: 0, tax_mode: "EXEMPT" }
    : aggregateCartTax(cart, billType);
  const subtotal = billType === BILL_TYPES.NON_LISTED
    ? cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
    : cart.reduce((sum, item) => sum + item.line_total, 0);
  const gstAmount = billType === BILL_TYPES.WITH_GST ? taxSummary.gst_amount : 0;
  const total = subtotal + gstAmount;

  if (billType !== BILL_TYPES.NON_LISTED) {
    const lines = cart.map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));
    await applyLocalSaleDeductions(resolvedShopId, lines);
  }

  const clientBillId = crypto.randomUUID();
  const billNumber = await offlineBillNumberService.nextBillNumber(resolvedShopId, shopCode);

  const syncPayload = {
    ...payload,
    shop_id: resolvedShopId,
    bill_type: billType,
    items: billType === BILL_TYPES.NON_LISTED
      ? cart.map((item) => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          mrp: item.mrp,
        }))
      : cart.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          price_type: item.price_type,
        })),
    offline_bill_number: billNumber,
    offline_customer_client_id: offlineCustomerClientId || null,
    staff_code_id: staffCodeId || null,
    credit_note_ids: [],
  };

  const billRecord = buildBillSnapshot({
    clientBillId,
    billNumber,
    shopId: resolvedShopId,
    payload: syncPayload,
    cart,
    taxSummary,
    totals: {
      subtotal,
      gst_amount: gstAmount,
      total,
      taxable_amount: subtotal,
    },
    staffSnapshot,
    bankSnapshot,
  });

  await localBillsRepository.save(billRecord);

  await enqueueMutation({
    client_id: clientBillId,
    shop_id: resolvedShopId,
    entity_type: 'bill',
    idempotency_key: clientBillId,
    payload: syncPayload,
    stock_mutated_locally: true,
    offline_created_at: nowIso(),
  });

  return billRecord;
};

/** Map a synced local bill row to the shape CheckoutPanel / billing slice expect. */
export const mapSyncedLocalBillToUi = (bill) => {
  if (!bill || bill.sync_status !== 'synced') return bill;

  return {
    ...bill,
    bill_id: bill.server_bill_id || bill.bill_id,
    bill_number: bill.server_bill_number || bill.bill_number,
    offline_bill_number: bill.offline_bill_number || bill.bill_number,
    is_offline: false,
    sync_status: 'synced',
  };
};

/** Re-read IndexedDB and return UI bill if server sync has completed. */
export const refreshBillIfSynced = async (bill) => {
  if (!bill) return bill;

  const clientId = bill.client_bill_id || bill.bill_id;
  if (!clientId) return bill;

  if (bill.sync_status === 'synced' && bill.server_bill_id) {
    return mapSyncedLocalBillToUi(bill);
  }

  const stored = await localBillsRepository.get(clientId);
  if (!stored || stored.sync_status !== 'synced') return bill;

  return mapSyncedLocalBillToUi(stored);
};

export const isBillAwaitingSync = (bill) =>
  Boolean(
    bill
    && (bill.sync_status === 'pending_sync' || (bill.is_offline && !bill.server_bill_id))
  );

export const shouldUseOfflineBilling = (isOnline) => !isOnline;
