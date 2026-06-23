import { aggregateCartTax } from '../../utils/billingTax';
import { calculateGstOnAmount } from '../../utils/billingCart.utils';
import { BILL_TYPES } from '../../constants/billingBillTypes';
import {
  localBillsRepository,
  shopStockMutationService,
} from '../db/repositories/localBillsRepository';
import { outboxRepository } from '../db/repositories/outboxRepository';
import {
  syncConflictsRepository,
  SYNC_CONFLICT_RESOLUTION,
} from '../db/repositories/syncConflictsRepository';
import { OUTBOX_STATUS } from '../constants';
import { broadcastPendingCounts } from '../sync/offlineSyncState.service';

const recalcItemLine = (item, billType) => {
  const unitPrice = Number(item.unit_price) || 0;
  const qty = Number(item.quantity) || 0;
  item.line_total = unitPrice * qty;
  if (billType === BILL_TYPES.WITH_GST && item.gst_type !== 'EXEMPT') {
    item.gst_amount = calculateGstOnAmount(item.line_total, item.gst_percent);
  } else {
    item.gst_amount = 0;
  }
  return item;
};

const itemsToCartShape = (items) =>
  items.map((item) => ({
    line_total: item.line_total,
    gst_amount: item.gst_amount,
    gst_type: item.gst_type,
    gst_percent: item.gst_percent,
  }));

/**
 * Reduce or change line quantities on a failed offline bill, fix local stock, update outbox payload.
 * @param {{ clientBillId: string, shopId: string, itemAdjustments: Record<string, number> }} params
 */
export const adjustOfflineBillQuantities = async ({ clientBillId, shopId, itemAdjustments }) => {
  const bill = await localBillsRepository.get(clientBillId);
  if (!bill) {
    throw new Error('Offline bill not found on this device');
  }
  if (bill.sync_status === 'synced') {
    throw new Error('This bill is already synced');
  }
  if (bill.sync_status === 'discarded') {
    throw new Error('This bill was discarded');
  }

  const outbox = await outboxRepository.getByClientId(clientBillId);
  if (!outbox || ![OUTBOX_STATUS.ERROR, OUTBOX_STATUS.CONFLICT].includes(outbox.status)) {
    throw new Error('Only failed bills can be adjusted');
  }

  const entries = Object.entries(itemAdjustments || {});
  if (!entries.length) {
    throw new Error('No quantity changes to apply');
  }

  const resolvedShopId = shopId || bill.shop_id;
  const stockMutated = outbox.stock_mutated_locally !== false;
  const updatedItems = bill.items.map((item) => ({ ...item }));

  for (const [variantId, newQtyRaw] of entries) {
    const newQty = Math.floor(Number(newQtyRaw));
    if (!Number.isFinite(newQty) || newQty < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const item = updatedItems.find((i) => i.variant_id === variantId);
    if (!item) {
      throw new Error('Item not found on this bill');
    }

    const oldQty = item.quantity;
    const diff = newQty - oldQty;
    if (diff === 0) continue;

    if (stockMutated) {
      if (diff > 0) {
        await shopStockMutationService.deductForSale(resolvedShopId, [
          { variant_id: variantId, quantity: diff },
        ]);
      } else {
        await shopStockMutationService.restoreForSale(resolvedShopId, [
          { variant_id: variantId, quantity: -diff },
        ]);
      }
    }

    item.quantity = newQty;
    recalcItemLine(item, bill.bill_type);
  }

  const taxSummary = aggregateCartTax(itemsToCartShape(updatedItems), bill.bill_type);
  const subtotal = taxSummary.subtotal;
  const gstAmount = taxSummary.gst_amount;
  const total = taxSummary.total_amount;

  const oldTotal = Number(bill.total_amount) || 0;
  const oldPaid = Number(bill.paid_amount) || 0;
  const newPaid = oldPaid >= oldTotal ? total : Math.min(oldPaid, total);
  const newBalance = Math.max(0, total - newPaid);

  const updatedBill = {
    ...bill,
    items: updatedItems,
    subtotal,
    taxable_amount: subtotal,
    gst_amount: gstAmount,
    total_amount: total,
    paid_amount: newPaid,
    balance_amount: newBalance,
    tax_summary: taxSummary,
    payment_status: newPaid >= total && total > 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING',
    payments:
      bill.payments?.length && newPaid > 0
        ? [{ ...bill.payments[0], amount: newPaid }]
        : bill.payments,
  };

  await localBillsRepository.save(updatedBill);

  const syncItems = updatedItems.map((item) => bill.bill_type === BILL_TYPES.NON_LISTED ? {
    item_name: item.manual_item_name || item.item_name || item.variant?.product?.name || 'Non-Listed Item',
    quantity: item.quantity,
    unit_price: item.unit_price,
    mrp: item.mrp_unit_price ?? item.mrp,
  } : {
    variant_id: item.variant_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    price_type: item.price_type,
  });

  await outboxRepository.updateEntry(clientBillId, {
    payload: {
      ...outbox.payload,
      items: syncItems,
      payment_amount: newPaid,
    },
  });

  await outboxRepository.resetForRetry(clientBillId);
  await syncConflictsRepository.markResolved(clientBillId, SYNC_CONFLICT_RESOLUTION.ADJUSTED);
  await broadcastPendingCounts(resolvedShopId);

  return updatedBill;
};
