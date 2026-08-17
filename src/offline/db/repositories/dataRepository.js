import { getOfflineDb, withOfflineTransaction } from '../connection';
import { OFFLINE_STORES } from '../../constants';

const nowIso = () => new Date().toISOString();

const flattenStockRow = (row) => {
  const variant = row.variant || {};
  const product = variant.product || {};
  return {
    variant_id: row.variant_id,
    shop_id: row.shop_id,
    shop_stock_id: row.shop_stock_id,
    quantity_available: row.quantity_available ?? 0,
    quantity_reserved: row.quantity_reserved ?? 0,
    quantity_in_transit: row.quantity_in_transit ?? 0,
    low_stock_threshold: row.low_stock_threshold ?? 5,
    sku: variant.sku ?? null,
    product_code: variant.product_code ?? product.product_code ?? null,
    system_barcode: variant.system_barcode ?? null,
    product_id: variant.product_id ?? product.product_id ?? null,
    mrp: variant.mrp ?? 0,
    special_price: variant.special_price ?? null,
    warranty: variant.warranty ?? product.warranty ?? null,
    purchase_price: variant.purchase_price ?? null,
    expenses: variant.expenses ?? 0,
    purchase_code: variant.purchase_code ?? null,
    product_name: product.name ?? null,
    brand_name: product.brand_name ?? null,
    hsn_code: product.hsn_code ?? null,
    gst_percent: product.gst_percent ?? 0,
    gst_type: product.gst_type ?? null,
    image_url: variant.images?.[0]?.url ?? null,
    combo_eligible: variant.combo_eligible === true,
    on_sale: variant.on_sale === true,
    sale_price: variant.on_sale === true ? (variant.sale_price ?? null) : null,
    server_updated_at: row.updated_at ?? variant.updated_at ?? product.updated_at ?? null,
    cached_at: nowIso(),
    variant,
  };
};

export const shopStockRepository = {
  async bulkUpsert(rows) {
    if (!rows?.length) return 0;
    return withOfflineTransaction([OFFLINE_STORES.SHOP_STOCKS], 'readwrite', async (stores) => {
      const store = stores[OFFLINE_STORES.SHOP_STOCKS];
      for (const row of rows) {
        await store.put(flattenStockRow(row));
      }
      return rows.length;
    });
  },

  async getByVariantId(variantId) {
    const db = await getOfflineDb();
    return db.get(OFFLINE_STORES.SHOP_STOCKS, variantId);
  },

  async getByBarcode(barcode) {
    if (!barcode) return null;
    const db = await getOfflineDb();
    const tx = db.transaction(OFFLINE_STORES.SHOP_STOCKS, 'readonly');
    const index = tx.store.index('by_barcode');
    const match = await index.get(String(barcode).trim());
    await tx.done;
    return match ?? null;
  },

  async listAll() {
    const db = await getOfflineDb();
    return db.getAll(OFFLINE_STORES.SHOP_STOCKS);
  },

  async listByShop(shopId) {
    if (!shopId) return [];
    const rows = await this.listAll();
    return rows.filter((row) => row.shop_id === shopId);
  },

  async count() {
    const db = await getOfflineDb();
    return db.count(OFFLINE_STORES.SHOP_STOCKS);
  },

  async clear() {
    const db = await getOfflineDb();
    await db.clear(OFFLINE_STORES.SHOP_STOCKS);
  },
};

export const shopConfigRepository = {
  async save(key, value) {
    const db = await getOfflineDb();
    await db.put(OFFLINE_STORES.SHOP_CONFIG, {
      key,
      value,
      updated_at: nowIso(),
    });
  },

  async get(key) {
    const db = await getOfflineDb();
    const row = await db.get(OFFLINE_STORES.SHOP_CONFIG, key);
    return row?.value ?? null;
  },

  async saveConfigBundle(config) {
    await this.save('bundle', config);
  },

  async getConfigBundle() {
    return this.get('bundle');
  },

  async clear() {
    const db = await getOfflineDb();
    await db.clear(OFFLINE_STORES.SHOP_CONFIG);
  },
};

export const customerRepository = {
  async bulkUpsert(customers) {
    if (!customers?.length) return 0;
    return withOfflineTransaction([OFFLINE_STORES.CUSTOMERS], 'readwrite', async (stores) => {
      const store = stores[OFFLINE_STORES.CUSTOMERS];
      for (const customer of customers) {
        await store.put({
          ...customer,
          cached_at: nowIso(),
        });
      }
      return customers.length;
    });
  },

  async getById(customerId) {
    const db = await getOfflineDb();
    return db.get(OFFLINE_STORES.CUSTOMERS, customerId);
  },

  async getByMobile(mobile) {
    const normalized = String(mobile || '').replace(/\D/g, '');
    const db = await getOfflineDb();
    const tx = db.transaction(OFFLINE_STORES.CUSTOMERS, 'readonly');
    const index = tx.store.index('by_mobile');
    const match = await index.get(normalized);
    await tx.done;
    return match ?? null;
  },

  async count() {
    const db = await getOfflineDb();
    return db.count(OFFLINE_STORES.CUSTOMERS);
  },

  async listAll() {
    const db = await getOfflineDb();
    return db.getAll(OFFLINE_STORES.CUSTOMERS);
  },

  async listByShop(shopId) {
    const all = await this.listAll();
    if (!shopId) return all;
    return all.filter((c) => !c.shop_id || c.shop_id === shopId);
  },

  async clear() {
    const db = await getOfflineDb();
    await db.clear(OFFLINE_STORES.CUSTOMERS);
  },

  async replacePendingWithServerRecord(clientId, serverCustomer) {
    const db = await getOfflineDb();
    const tx = db.transaction(OFFLINE_STORES.CUSTOMERS, 'readwrite');
    await tx.store.delete(clientId);
    await tx.store.put({
      ...serverCustomer,
      cached_at: nowIso(),
      is_offline_pending: false,
    });
    await tx.done;
  },
};
