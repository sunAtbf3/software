/** IndexedDB database name — scoped per origin; shop_id stored in meta. */
export const OFFLINE_DB_NAME = 'vyapar-offline';

/** Bump when store layout changes; migration logic lives in connection.js */
export const OFFLINE_DB_VERSION = 2;

/** Must match backend SYNC_API_VERSION */
export const SYNC_API_VERSION = 1;

export const OFFLINE_STORES = Object.freeze({
  META: 'meta',
  OUTBOX: 'outbox',
  SHOP_CONFIG: 'shop_config',
  SHOP_STOCKS: 'shop_stocks',
  CUSTOMERS: 'customers',
  SYNC_CONFLICTS: 'sync_conflicts',
  LOCAL_BILLS: 'local_bills',
});

export const OUTBOX_STATUS = Object.freeze({
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error',
});

export const SYNC_ENTITY_TYPES = Object.freeze([
  'customer',
  'customer_update',
  'bill',
  'bill_payment',
  'credit_note',
  'stock_adjustment',
  'shop_expense',
  'transfer_receive',
]);

export const META_KEYS = Object.freeze({
  SESSION: 'offline_session',
  SYNC_STATE: 'sync_state',
  DEVICE_ID: 'device_id',
});

export const SYNC_PULL_PAGE_LIMIT = 500;

export const OFFLINE_EVENTS = Object.freeze({
  ONLINE: 'offline:online',
  OFFLINE: 'offline:offline',
  SYNC_STARTED: 'offline:sync-started',
  SYNC_COMPLETED: 'offline:sync-completed',
  SYNC_FAILED: 'offline:sync-failed',
  STOCKS_UPDATED: 'offline:stocks-updated',
  PULL_PROGRESS: 'offline:pull-progress',
  PENDING_COUNTS_UPDATED: 'offline:pending-counts-updated',
  BILL_DISCARDED: 'offline:bill-discarded',
});

export const SHOP_OFFLINE_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'ORG_MANAGER',
  'SHOP_OWNER',
  'BILLING_STAFF',
  'SHOP_MANAGER',
]);

/** Resolve shop id from auth user payload (direct assignment or nested shop relation). */
export const getUserShopId = (user) =>
  user?.shop_id || user?.shop?.shop_id || null;

export const isShopOfflineEligible = (user) =>
  Boolean(getUserShopId(user) && SHOP_OFFLINE_ROLES.includes(user?.role));
