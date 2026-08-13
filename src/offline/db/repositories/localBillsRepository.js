import { getOfflineDb, withOfflineTransaction } from '../connection';
import { OFFLINE_STORES, META_KEYS } from '../../constants';
import { metaRepository } from './metaRepository';

const nowIso = () => new Date().toISOString();

export const localBillsRepository = {
  async save(bill) {
    const db = await getOfflineDb();
    await db.put(OFFLINE_STORES.LOCAL_BILLS, bill);
    return bill;
  },

  async get(clientBillId) {
    const db = await getOfflineDb();
    return db.get(OFFLINE_STORES.LOCAL_BILLS, clientBillId);
  },

  async listByShop(shopId) {
    const db = await getOfflineDb();
    const all = await db.getAll(OFFLINE_STORES.LOCAL_BILLS);
    return all
      .filter((b) => b.shop_id === shopId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async markSynced(clientBillId, { serverBillId, serverBillNumber }) {
    const db = await getOfflineDb();
    const existing = await db.get(OFFLINE_STORES.LOCAL_BILLS, clientBillId);
    if (!existing) return null;
    const updated = {
      ...existing,
      sync_status: 'synced',
      server_bill_id: serverBillId,
      server_bill_number: serverBillNumber ?? existing.server_bill_number,
      synced_at: nowIso(),
    };
    await db.put(OFFLINE_STORES.LOCAL_BILLS, updated);
    return updated;
  },

  async markDiscarded(clientBillId) {
    const db = await getOfflineDb();
    const existing = await db.get(OFFLINE_STORES.LOCAL_BILLS, clientBillId);
    if (!existing) return null;
    const updated = {
      ...existing,
      sync_status: 'discarded',
      discarded_at: nowIso(),
    };
    await db.put(OFFLINE_STORES.LOCAL_BILLS, updated);
    return updated;
  },
};

export const offlineBillNumberService = {
  async nextBillNumber(shopId, shopCode) {
    const key = `offline_bill_seq_${shopId}`;
    const current = (await metaRepository.get(key)) || { seq: 0 };
    const nextSeq = (current.seq || 0) + 1;
    await metaRepository.set(key, { seq: nextSeq, shop_id: shopId });

    const code = String(shopCode || 'SHOP').replace(/\s+/g, '').slice(0, 8).toUpperCase();
    return `OFF-${code}-${String(nextSeq).padStart(5, '0')}`;
  },
};

export const shopStockMutationService = {
  async deductForSale(shopId, lines) {
    return withOfflineTransaction([OFFLINE_STORES.SHOP_STOCKS], 'readwrite', async (stores) => {
      const store = stores[OFFLINE_STORES.SHOP_STOCKS];
      for (const line of lines) {
        const row = await store.get(line.variant_id);
        if (!row) {
          throw new Error(`Stock not found for variant ${line.variant_id}`);
        }
        const available = row.quantity_available ?? 0;
        if (available < line.quantity) {
          throw new Error(
            `Insufficient stock for ${row.product_name || line.variant_id}. Available: ${available}, requested: ${line.quantity}`
          );
        }
        await store.put({
          ...row,
          quantity_available: available - line.quantity,
          cached_at: nowIso(),
        });
      }
    });
  },

  async restoreForSale(shopId, lines) {
    void shopId;
    return withOfflineTransaction([OFFLINE_STORES.SHOP_STOCKS], 'readwrite', async (stores) => {
      const store = stores[OFFLINE_STORES.SHOP_STOCKS];
      for (const line of lines) {
        const row = await store.get(line.variant_id);
        if (!row) continue;
        await store.put({
          ...row,
          quantity_available: (row.quantity_available ?? 0) + line.quantity,
          cached_at: nowIso(),
        });
      }
    });
  },

  /**
   * Apply a manual stock adjustment locally (increment / decrement / set).
   * @returns {{ before: number, after: number }}
   */
  async applyAdjustment(_shopId, { variant_id, operation, quantity, low_stock_threshold }) {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new Error('Valid quantity is required');
    }

    return withOfflineTransaction([OFFLINE_STORES.SHOP_STOCKS], 'readwrite', async (stores) => {
      const store = stores[OFFLINE_STORES.SHOP_STOCKS];
      const row = await store.get(variant_id);
      if (!row) {
        throw new Error(`Stock not found for variant ${variant_id}`);
      }

      const before = row.quantity_available ?? 0;
      let after = before;

      if (operation === 'increment') after = before + qty;
      else if (operation === 'decrement') after = before - qty;
      else after = qty;

      if (after < 0) {
        throw new Error(
          `Stock cannot go negative (current: ${before}, requested: ${operation} ${qty})`
        );
      }
      if (after > before) {
        throw new Error(
          `Shop stock cannot be increased (current: ${before}). Request stock from the warehouse instead.`
        );
      }

      await store.put({
        ...row,
        quantity_available: after,
        ...(low_stock_threshold != null ? { low_stock_threshold: Number(low_stock_threshold) } : {}),
        cached_at: nowIso(),
      });

      return { before, after };
    });
  },

  /** Revert a pending offline adjustment back to the pre-adjustment quantity. */
  async revertToQuantity(_shopId, { variant_id, quantity }) {
    const target = Number(quantity);
    if (!Number.isFinite(target) || target < 0) {
      throw new Error('Invalid revert quantity');
    }

    return withOfflineTransaction([OFFLINE_STORES.SHOP_STOCKS], 'readwrite', async (stores) => {
      const store = stores[OFFLINE_STORES.SHOP_STOCKS];
      const row = await store.get(variant_id);
      if (!row) return null;
      await store.put({
        ...row,
        quantity_available: target,
        cached_at: nowIso(),
      });
      return row;
    });
  },
};
