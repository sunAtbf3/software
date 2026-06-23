import AxiosInstance from '../../SERVICES/AxiosInstance';
import { outboxRepository } from '../db/repositories/outboxRepository';
import { syncConflictsRepository } from '../db/repositories/syncConflictsRepository';
import { metaRepository } from '../db/repositories/metaRepository';
import { localBillsRepository } from '../db/repositories/localBillsRepository';
import { customerRepository } from '../db/repositories/dataRepository';

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

const ENTITY_SYNC_ORDER = Object.freeze({
  customer: 0,
  bill: 1,
  bill_payment: 2,
  credit_note: 3,
  stock_adjustment: 4,
  shop_expense: 5,
  transfer_receive: 6,
});

const sortOutboxForPush = (rows) =>
  [...rows].sort((a, b) => {
    const orderA = ENTITY_SYNC_ORDER[a.entity_type] ?? 99;
    const orderB = ENTITY_SYNC_ORDER[b.entity_type] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.created_at.localeCompare(b.created_at);
  });

const mapOutboxToApiItem = (row) => ({
  client_id: row.client_id,
  entity_type: row.entity_type,
  idempotency_key: row.idempotency_key,
  shop_id: row.shop_id,
  payload: row.payload,
  stock_mutated_locally: Boolean(row.stock_mutated_locally),
  offline_created_at: row.offline_created_at,
  client_sequence: row.client_sequence ?? 0,
});

/**
 * Pushes pending outbox mutations to the server in batches.
 */
export const pushPendingOutbox = async (shopId, { batchSize = 50 } = {}) => {
  const pending = sortOutboxForPush(await outboxRepository.listPending(shopId, { limit: batchSize }));
  if (!pending.length) {
    return { processed: 0, results: [] };
  }

  await outboxRepository.markSyncing(pending.map((r) => r.client_id));

  const { data } = await AxiosInstance.post('/sync/push', {
    shop_id: shopId,
    items: pending.map(mapOutboxToApiItem),
  });

  const payload = unwrap({ data });
  const results = payload?.results ?? [];

  await outboxRepository.applyPushResults(results);

  for (const result of results) {
    if (result.status === 'applied' || result.status === 'duplicate') {
      await syncConflictsRepository.remove(result.client_id);
    } else if (result.status === 'error' || result.status === 'conflict') {
      const outboxRow = pending.find((row) => row.client_id === result.client_id);
      if (outboxRow) {
        await syncConflictsRepository.upsertFromFailure({ outboxRow, pushResult: result });
      }
    }
  }

  for (const result of results) {
    if (result.status !== 'applied' && result.status !== 'duplicate') continue;

    if (result.entity_type === 'bill') {
      const serverBill = result.server_response?.data;
      await localBillsRepository.markSynced(result.client_id, {
        serverBillId: serverBill?.bill_id || result.server_id,
        serverBillNumber: serverBill?.bill_number || null,
      });
    }

    if (result.entity_type === 'customer') {
      const serverCustomer = result.server_response?.data;
      if (serverCustomer?.customer_id) {
        await customerRepository.replacePendingWithServerRecord(
          result.client_id,
          serverCustomer
        );
      }
    }

    if (result.entity_type === 'customer_update') {
      const serverCustomer = result.server_response?.data;
      if (serverCustomer?.customer_id) {
        // Overwrite the cached record with the server's canonical version
        await customerRepository.bulkUpsert([{
          ...serverCustomer,
          is_offline_pending: false,
          client_id: null,
          cached_at: new Date().toISOString(),
        }]);
      }
    }
  }

  await metaRepository.updateSyncState({
    shop_id: shopId,
    last_push_at: new Date().toISOString(),
    last_error: null,
  });

  return {
    processed: payload?.processed ?? results.length,
    results,
  };
};

export const enqueueMutation = async (entry) => {
  if (!entry.client_id) entry.client_id = crypto.randomUUID();
  if (!entry.idempotency_key) entry.idempotency_key = entry.client_id;
  return outboxRepository.enqueue(entry);
};
