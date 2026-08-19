import { shopStockMutationService } from '../db/repositories/localBillsRepository';
import { OFFLINE_EVENTS } from '../constants';
import { dispatchOfflineEvent } from './networkMonitor';

/**
 * Notify all stock consumers (billing picker, inventory tab) to refresh.
 */
export const broadcastStocksUpdated = (shopId, detail = {}) => {
  dispatchOfflineEvent(OFFLINE_EVENTS.STOCKS_UPDATED, { shopId, ...detail });
};

/**
 * Deduct sold quantities in IndexedDB so offline cache stays aligned with server sales.
 * After an online bill, pass { requireCachedRow: false } — server already committed stock.
 */
export const applyLocalSaleDeductions = async (shopId, lines, { requireCachedRow = true } = {}) => {
  if (!shopId || !lines?.length) return;
  await shopStockMutationService.deductForSale(shopId, lines, { requireCachedRow });
  broadcastStocksUpdated(shopId, { reason: 'sale_deduct', lines });
};

/**
 * Restore quantities locally (e.g. cancelled bill, sync discard).
 */
export const applyLocalSaleRestorations = async (shopId, lines) => {
  if (!shopId || !lines?.length) return;
  await shopStockMutationService.restoreForSale(shopId, lines);
  broadcastStocksUpdated(shopId, { reason: 'sale_restore', lines });
};

/** Build sale lines from billing cart rows. */
export const saleLinesFromCart = (cart) =>
  (cart || [])
    .filter((item) => item?.variant_id && item.quantity > 0)
    .map((item) => ({
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));
