import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { shopStockRepository } from '../db/repositories/dataRepository';
import { mapLocalStockToApiRow } from '../utils/offlineStockAdapter';
import { useGetShopStocksQuery } from '../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi';
import { OFFLINE_EVENTS } from '../constants';
import { useOfflineEvent } from './useOfflineStatus';

const matchesSearch = (stock, query) => {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const product = stock.variant?.product || {};
  const name = String(product.name || '').toLowerCase();
  const code = String(product.product_code || '').toLowerCase();
  // Same as online API: product name + product_code only (not SKU/barcode).
  return name.includes(q) || code.includes(q);
};

/**
 * Shop stocks for Inventory tab — online API when available, IndexedDB with client-side filter/pagination when offline.
 */
export const useShopStocksForInventory = (
  shopId,
  { search = '', lowStockOnly = false, page = 1, limit = 20 } = {}
) => {
  const isOnline = useSelector((state) => state.offline.isOnline);
  const [localStocks, setLocalStocks] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);

  const {
    data: onlineData,
    isLoading: onlineLoading,
    isFetching: onlineFetching,
    refetch,
  } = useGetShopStocksQuery(
    {
      shop_id: shopId,
      page,
      limit,
      search,
      low_stock_only: lowStockOnly,
    },
    { skip: !shopId || !isOnline }
  );

  const loadLocal = useCallback(async () => {
    if (!shopId) {
      setLocalStocks([]);
      setLocalLoading(false);
      return;
    }
    setLocalLoading(true);
    try {
      const rows = await shopStockRepository.listByShop(shopId);
      setLocalStocks(rows.map(mapLocalStockToApiRow).filter(Boolean));
    } finally {
      setLocalLoading(false);
    }
  }, [shopId]);

  const refreshAll = useCallback(() => {
    loadLocal();
    if (isOnline && shopId) {
      refetch();
    }
  }, [loadLocal, isOnline, shopId, refetch]);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  useOfflineEvent(OFFLINE_EVENTS.STOCKS_UPDATED, (event) => {
    const updatedShopId = event?.detail?.shopId;
    if (updatedShopId && updatedShopId !== shopId) return;
    refreshAll();
  });

  useOfflineEvent(OFFLINE_EVENTS.SYNC_COMPLETED, refreshAll);

  const offlineResult = useMemo(() => {
    let filtered = localStocks.filter((s) => matchesSearch(s, search));
    if (lowStockOnly) {
      filtered = filtered.filter(
        (s) =>
          s.quantity_available > 0
          && s.quantity_available <= (s.low_stock_threshold || 10)
      );
    }
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * limit;
    const stocks = filtered.slice(start, start + limit);
    return {
      stocks,
      meta: { total, page: safePage, limit, totalPages },
    };
  }, [localStocks, search, lowStockOnly, page, limit]);

  const onlineStocks = onlineData?.stocks || [];
  const onlineMeta = onlineData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
  const hasSearch = Boolean(String(search || '').trim());

  const usingOfflineCache = !isOnline
    ? localStocks.length > 0
    : !(onlineLoading || onlineFetching) && !onlineStocks.length && localStocks.length > 0 && !hasSearch;

  // When online + search: always trust API (even empty) so barcode-offline matches cannot leak.
  const useOnlineResults = isOnline && (onlineStocks.length > 0 || hasSearch || !usingOfflineCache);

  return {
    stocks: useOnlineResults ? onlineStocks : offlineResult.stocks,
    meta: useOnlineResults ? onlineMeta : offlineResult.meta,
    isLoading: isOnline ? onlineLoading && !onlineStocks.length : localLoading,
    isFetching: isOnline ? onlineFetching : false,
    isOnline,
    usingOfflineCache: useOnlineResults ? false : usingOfflineCache,
    refetch: refreshAll,
  };
};
