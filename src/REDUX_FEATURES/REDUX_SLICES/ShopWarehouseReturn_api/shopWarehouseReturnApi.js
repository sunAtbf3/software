import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

const axiosBaseQuery = () => async ({ url, method, data, params, headers, responseType }) => {
    try {
        const result = await AxiosInstance({
            url,
            method,
            data,
            params,
            headers,
            ...(responseType ? { responseType } : {}),
        });
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

export const generateReturnIdempotencyKey = () =>
    `swr_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

export const shopWarehouseReturnApi = createApi({
    reducerPath: "shopWarehouseReturnApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["ShopWarehouseReturn"],
    endpoints: (builder) => ({
        previewReturnSource: builder.query({
            query: (params) => ({
                url: "/shop-warehouse-returns/preview",
                method: "GET",
                params,
            }),
            transformResponse: (response) => response.data,
        }),
        getShopWarehouseReturns: builder.query({
            query: (params) => ({
                url: "/shop-warehouse-returns",
                method: "GET",
                params,
            }),
            providesTags: ["ShopWarehouseReturn"],
            transformResponse: (response) => ({
                items: response.data || [],
                meta: response.meta || {},
            }),
        }),
        getShopWarehouseReturnById: builder.query({
            query: (returnId) => ({
                url: `/shop-warehouse-returns/${returnId}`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "ShopWarehouseReturn", id }],
            transformResponse: (response) => response.data,
        }),
        getShopWarehouseReturnBill: builder.query({
            query: (returnId) => ({
                url: `/shop-warehouse-returns/${returnId}/bill`,
                method: "GET",
            }),
            transformResponse: (response) => response.data,
        }),
        downloadShopWarehouseReturnBillPdf: builder.query({
            query: (returnId) => ({
                url: `/shop-warehouse-returns/${returnId}/bill/pdf`,
                method: "GET",
                responseType: "blob",
            }),
        }),
        createShopWarehouseReturn: builder.mutation({
            query: ({ idempotencyKey, ...data }) => ({
                url: "/shop-warehouse-returns",
                method: "POST",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["ShopWarehouseReturn"],
            transformResponse: (response) => response.data,
        }),
        approveShopWarehouseReturn: builder.mutation({
            query: ({ returnId, idempotencyKey, ...data }) => ({
                url: `/shop-warehouse-returns/${returnId}/approve`,
                method: "PATCH",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["ShopWarehouseReturn"],
            transformResponse: (response) => response.data,
        }),
        rejectShopWarehouseReturn: builder.mutation({
            query: ({ returnId, idempotencyKey, ...data }) => ({
                url: `/shop-warehouse-returns/${returnId}/reject`,
                method: "PATCH",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["ShopWarehouseReturn"],
            transformResponse: (response) => response.data,
        }),
        dispatchShopWarehouseReturn: builder.mutation({
            query: ({ returnId, idempotencyKey }) => ({
                url: `/shop-warehouse-returns/${returnId}/dispatch`,
                method: "PATCH",
                data: {},
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["ShopWarehouseReturn"],
            transformResponse: (response) => response.data,
        }),
        receiveShopWarehouseReturn: builder.mutation({
            query: ({ returnId, idempotencyKey, ...data }) => ({
                url: `/shop-warehouse-returns/${returnId}/receive`,
                method: "PATCH",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["ShopWarehouseReturn"],
            transformResponse: (response) => response.data,
        }),
        cancelShopWarehouseReturn: builder.mutation({
            query: ({ returnId, idempotencyKey, ...data }) => ({
                url: `/shop-warehouse-returns/${returnId}/cancel`,
                method: "PATCH",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["ShopWarehouseReturn"],
            transformResponse: (response) => response.data,
        }),
    }),
});

export const {
    useLazyPreviewReturnSourceQuery,
    useGetShopWarehouseReturnsQuery,
    useGetShopWarehouseReturnByIdQuery,
    useLazyGetShopWarehouseReturnBillQuery,
    useLazyDownloadShopWarehouseReturnBillPdfQuery,
    useCreateShopWarehouseReturnMutation,
    useApproveShopWarehouseReturnMutation,
    useRejectShopWarehouseReturnMutation,
    useDispatchShopWarehouseReturnMutation,
    useReceiveShopWarehouseReturnMutation,
    useCancelShopWarehouseReturnMutation,
} = shopWarehouseReturnApi;
