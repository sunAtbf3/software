// REDUX_SLICES/ShopStock_api/shopStockApi.js
//
// Shop Stock Management APIs
// Endpoints: GET /shop-stocks, GET /shop-stocks/low-stock, PATCH /shop-stocks/:variantId, PATCH /shop-stocks/bulk
// NEW: GET /shop-reorder-suggestions - for bulk restock requests
// NEW: POST /shop-product-levels - for setting min-max levels

import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

/** Backend validator max for GET /shop-stocks limit query param */
export const SHOP_STOCK_API_MAX_LIMIT = 100;

const axiosBaseQuery = () => async ({ url, method, data, params }) => {
    try {
        const result = await AxiosInstance({ url, method, data, params });
        return { data: result.data };
    } catch (axiosError) {
        return {
            error: {
                status: axiosError.response?.status || 500,
                data: axiosError.response?.data || { message: axiosError.message || "Request failed" },
            },
        };
    }
};

export const shopStockApi = createApi({
    reducerPath: "shopStockApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["ShopStock", "LowStockAlerts", "ReorderSuggestions", "ProductLevels", "DeadStock"],

    endpoints: (builder) => ({

        // ─────────────────────────────────────────────────────────────
        // READ OPERATIONS
        // ─────────────────────────────────────────────────────────────

        // GET /shop-stocks — list shop stocks with filters
        getShopStocks: builder.query({
            query: ({
                page = 1,
                limit = 20,
                shop_id = "",
                variant_id = "",
                min_quantity = "",
                low_stock_only = false,
                search = "",
            }) => {
                const params = {
                    page,
                    limit: Math.min(Math.max(1, limit), SHOP_STOCK_API_MAX_LIMIT),
                };
                if (shop_id) params.shop_id = shop_id;
                if (variant_id) params.variant_id = variant_id;
                if (min_quantity) params.min_quantity = min_quantity;
                if (low_stock_only) params.low_stock_only = true;
                if (search) params.search = search;
                return { url: "/shop-stocks", method: "GET", params };
            },
            providesTags: (result) => {
                if (result?.stocks) {
                    return [
                        ...result.stocks.map(({ shop_stock_id }) => ({ type: "ShopStock", id: shop_stock_id })),
                        { type: "ShopStock", id: "LIST" },
                    ];
                }
                return [{ type: "ShopStock", id: "LIST" }];
            },
            transformResponse: (response) => ({
                stocks: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        // Full shop catalog for billing — paginates at SHOP_STOCK_API_MAX_LIMIT per request
        getShopStocksCatalog: builder.query({
            async queryFn({ shop_id }, _api, _extra, baseQuery) {
                if (!shop_id) {
                    return {
                        error: { status: 400, data: { message: "shop_id is required" } },
                    };
                }

                const limit = SHOP_STOCK_API_MAX_LIMIT;
                let page = 1;
                let totalPages = 1;
                const allStocks = [];

                while (page <= totalPages) {
                    const res = await baseQuery({
                        url: "/shop-stocks",
                        method: "GET",
                        params: { shop_id, page, limit },
                    });

                    if (res.error) {
                        return { error: res.error };
                    }

                    const body = res.data;
                    const pageStocks = body?.data ?? [];
                    const meta = body?.meta ?? {};
                    allStocks.push(...pageStocks);
                    totalPages = meta.totalPages ?? 1;
                    page += 1;
                }

                return {
                    data: {
                        stocks: allStocks,
                        meta: {
                            total: allStocks.length,
                            page: 1,
                            limit: allStocks.length,
                            totalPages: 1,
                        },
                    },
                };
            },
            providesTags: (result) => {
                if (result?.stocks?.length) {
                    return [
                        ...result.stocks.map(({ shop_stock_id }) => ({
                            type: "ShopStock",
                            id: shop_stock_id,
                        })),
                        { type: "ShopStock", id: "LIST" },
                        { type: "ShopStock", id: "CATALOG" },
                    ];
                }
                return [
                    { type: "ShopStock", id: "LIST" },
                    { type: "ShopStock", id: "CATALOG" },
                ];
            },
        }),

        // GET /shop-stocks/low-stock — get low stock alerts
        getLowStockAlerts: builder.query({
            query: ({ shop_id = "" }) => {
                const params = {};
                if (shop_id) params.shop_id = shop_id;
                return { url: "/shop-stocks/low-stock", method: "GET", params };
            },
            providesTags: ["LowStockAlerts"],
            transformResponse: (response) => response.data,
        }),

        // GET /shop-stocks/:variantId — get stock by variant
        getShopStockByVariant: builder.query({
            query: ({ variantId, shop_id = "" }) => {
                const params = {};
                if (shop_id) params.shop_id = shop_id;
                return { url: `/shop-stocks/${variantId}`, method: "GET", params };
            },
            providesTags: (result, error, { variantId }) => [{ type: "ShopStock", id: variantId }],
            transformResponse: (response) => response.data,
        }),

        // ─────────────────────────────────────────────────────────────
        // REORDER SUGGESTIONS API
        // ─────────────────────────────────────────────────────────────

        // GET /shop-reorder-suggestions — get reorder suggestions for shop
        getReorderSuggestions: builder.query({
            query: ({ shop_id = "", warehouse_id = "", variant_ids = [] }) => {
                const params = {};
                if (shop_id) params.shop_id = shop_id;
                if (warehouse_id) params.warehouse_id = warehouse_id;
                if (variant_ids.length > 0) params.variant_ids = variant_ids.join(',');
                return { url: "/shop-reorder-suggestions", method: "GET", params };
            },
            providesTags: ["ReorderSuggestions"],
            transformResponse: (response) => response.data,
        }),

        // ─────────────────────────────────────────────────────────────
        // PRODUCT LEVELS (MIN-MAX) API - NEW
        // ─────────────────────────────────────────────────────────────

        // POST /shop-product-levels — set min-max levels for products
        setProductLevels: builder.mutation({
            query: ({ shop_id, items }) => ({
                url: "/shop-product-levels",
                method: "POST",
                data: { shop_id, items },
            }),
            invalidatesTags: ["ReorderSuggestions", "ShopStock"],
            transformResponse: (response) => response.data,
        }),

        // ─────────────────────────────────────────────────────────────
        // WRITE OPERATIONS
        // ─────────────────────────────────────────────────────────────

        // PATCH /shop-stocks/:variantId — update single stock (set/increment/decrement)
        updateShopStock: builder.mutation({
            query: ({ variantId, ...data }) => ({
                url: `/shop-stocks/${variantId}`,
                method: "PATCH",
                data,
            }),
            invalidatesTags: (result, error, { variantId }) => [
                { type: "ShopStock", id: variantId },
                { type: "ShopStock", id: "LIST" },
                "LowStockAlerts",
                { type: "DeadStock", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // PATCH /shop-stocks/bulk — bulk update multiple stocks
        bulkUpdateShopStocks: builder.mutation({
            query: ({ shop_id, items }) => ({
                url: "/shop-stocks/bulk",
                method: "PATCH",
                data: { shop_id, items },
            }),
            invalidatesTags: [
                { type: "ShopStock", id: "LIST" },
                "LowStockAlerts",
                { type: "DeadStock", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // GET /shop-dead-stock — Adjust Stock write-off history
        getDeadStockHistory: builder.query({
            query: ({ page = 1, limit = 20, shop_id = "", search = "", from_date = "", to_date = "" }) => {
                const params = { page, limit };
                if (shop_id) params.shop_id = shop_id;
                if (search) params.search = search;
                if (from_date) params.from_date = from_date;
                if (to_date) params.to_date = to_date;
                return { url: "/shop-dead-stock", method: "GET", params };
            },
            providesTags: [{ type: "DeadStock", id: "LIST" }],
            transformResponse: (response) => ({
                entries: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

    }),
});

export const {
    // Queries
    useGetShopStocksQuery,
    useGetShopStocksCatalogQuery,
    useGetLowStockAlertsQuery,
    useGetShopStockByVariantQuery,
    useGetReorderSuggestionsQuery,
    useGetDeadStockHistoryQuery,
    // Mutations
    useUpdateShopStockMutation,
    useBulkUpdateShopStocksMutation,
    useSetProductLevelsMutation,
} = shopStockApi;