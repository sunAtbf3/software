import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

const axiosBaseQuery =
    () =>
    async ({ url, method, params, responseType }) => {
        try {
            const result = await AxiosInstance({
                url,
                method,
                params,
                ...(responseType ? { responseType } : {}),
            });
            return { data: result.data };
        } catch (axiosError) {
            return {
                error: {
                    status: axiosError.response?.status || 500,
                    data:
                        axiosError.response?.data || {
                            message: axiosError.message || "Request failed",
                        },
                },
            };
        }
    };

export const shopWarehouseCatalogApi = createApi({
    reducerPath: "shopWarehouseCatalogApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["ShopWarehouseCatalog", "WarehouseProductsCatalog"],

    endpoints: (builder) => ({
        getWarehouseStockCatalog: builder.query({
            query: ({ shopId, warehouse_id, mode = "all", search = "", page = 1, limit = 50 }) => {
                const params = { warehouse_id, mode, page, limit };
                if (search) params.search = search;
                return {
                    url: `/shops/${shopId}/warehouse-stock-catalog`,
                    method: "GET",
                    params,
                };
            },
            providesTags: ["ShopWarehouseCatalog"],
            transformResponse: (response) => response.data,
        }),

        getWarehouseProductsCatalog: builder.query({
            query: ({ shopId, warehouse_id, search = "" }) => {
                const params = { warehouse_id };
                if (search) params.search = search;
                return {
                    url: `/shops/${shopId}/warehouse-products-catalog`,
                    method: "GET",
                    params,
                };
            },
            providesTags: ["WarehouseProductsCatalog"],
            transformResponse: (response) => response.data,
        }),

        downloadWarehouseProductsCatalogPdf: builder.query({
            query: ({ shopId, warehouse_id, search = "" }) => {
                const params = { warehouse_id };
                if (search) params.search = search;
                return {
                    url: `/shops/${shopId}/warehouse-products-catalog/pdf`,
                    method: "GET",
                    params,
                    responseType: "blob",
                };
            },
            keepUnusedDataFor: 0,
            transformResponse: (response) => response,
        }),
    }),
});

export const {
    useGetWarehouseStockCatalogQuery,
    useLazyGetWarehouseStockCatalogQuery,
    useGetWarehouseProductsCatalogQuery,
    useLazyGetWarehouseProductsCatalogQuery,
    useLazyDownloadWarehouseProductsCatalogPdfQuery,
} = shopWarehouseCatalogApi;
