// REDUX_SLICES/BulkTransfer_api/bulkTransferApi.js
//
// Bulk Transfer Requests (Multiple Items)
// POST /bulk-transfer-requests + CRUD operations

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

export const generateBulkIdempotencyKey = () => {
    return `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

export const bulkTransferApi = createApi({
    reducerPath: "bulkTransferApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["BulkTransfer"],

    endpoints: (builder) => ({

        // POST /bulk-transfer-requests — create bulk request
        createBulkTransferRequest: builder.mutation({
            query: ({ idempotencyKey, ...data }) => ({
                url: "/bulk-transfer-requests",
                method: "POST",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["BulkTransfer"],
            transformResponse: (response) => response.data,
        }),

        // GET /bulk-transfer-requests — list bulk requests
        getBulkTransferRequests: builder.query({
            query: ({ page = 1, limit = 20, status = "", to_shop_id = "", to_warehouse_id = "" }) => {
                const params = { page, limit };
                if (status) params.status = status;
                if (to_shop_id) params.to_shop_id = to_shop_id;
                if (to_warehouse_id) params.to_warehouse_id = to_warehouse_id;
                return { url: "/bulk-transfer-requests", method: "GET", params };
            },
            providesTags: (result) => {
                if (result?.requests) {
                    return [
                        ...result.requests.map(({ bulk_request_id }) => ({ type: "BulkTransfer", id: bulk_request_id })),
                        { type: "BulkTransfer", id: "LIST" },
                    ];
                }
                return [{ type: "BulkTransfer", id: "LIST" }];
            },
            transformResponse: (response) => ({
                requests: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        // GET /bulk-transfer-requests/:id — get single bulk request
        getBulkTransferRequestById: builder.query({
            query: (bulkRequestId) => ({ url: `/bulk-transfer-requests/${bulkRequestId}`, method: "GET" }),
            providesTags: (result, error, bulkRequestId) => [{ type: "BulkTransfer", id: bulkRequestId }],
            transformResponse: (response) => response.data,
        }),

        // PATCH /bulk-transfer-requests/:id/approve — approve bulk request
        approveBulkTransferRequest: builder.mutation({
            query: ({ bulkRequestId, items, transfer_bill_type, idempotencyKey }) => ({
                url: `/bulk-transfer-requests/${bulkRequestId}/approve`,
                method: "PATCH",
                data: {
                    ...(items ? { items } : {}),
                    ...(transfer_bill_type ? { transfer_bill_type } : {}),
                },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { bulkRequestId }) => [
                { type: "BulkTransfer", id: bulkRequestId },
                { type: "BulkTransfer", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // PATCH /bulk-transfer-requests/:id/reject
        rejectBulkTransferRequest: builder.mutation({
            query: ({ bulkRequestId, rejection_reason, idempotencyKey }) => ({
                url: `/bulk-transfer-requests/${bulkRequestId}/reject`,
                method: "PATCH",
                data: { rejection_reason },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { bulkRequestId }) => [
                { type: "BulkTransfer", id: bulkRequestId },
                { type: "BulkTransfer", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // PATCH /bulk-transfer-requests/:id/dispatch — dispatch bulk request
        dispatchBulkTransferRequest: builder.mutation({
            query: ({ bulkRequestId, tracking_number, expected_delivery, idempotencyKey }) => ({
                url: `/bulk-transfer-requests/${bulkRequestId}/dispatch`,
                method: "PATCH",
                data: { tracking_number, expected_delivery },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { bulkRequestId }) => [
                { type: "BulkTransfer", id: bulkRequestId },
                { type: "BulkTransfer", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // PATCH /bulk-transfer-requests/:id/receive — receive bulk request (partial/full)
        receiveBulkTransferRequest: builder.mutation({
            query: ({ bulkRequestId, items, receive_remarks, idempotencyKey }) => ({
                url: `/bulk-transfer-requests/${bulkRequestId}/receive`,
                method: "PATCH",
                data: items ? { items, receive_remarks } : { receive_remarks },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { bulkRequestId }) => [
                { type: "BulkTransfer", id: bulkRequestId },
                { type: "BulkTransfer", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        downloadBulkChallanPdf: builder.query({
            query: (bulkRequestId) => ({
                url: `/bulk-transfer-requests/${bulkRequestId}/challan/pdf`,
                method: "GET",
                responseType: "blob",
            }),
        }),

        // PATCH /bulk-transfer-requests/:id/cancel — cancel bulk request
        cancelBulkTransferRequest: builder.mutation({
            query: ({ bulkRequestId, cancel_reason, idempotencyKey }) => ({
                url: `/bulk-transfer-requests/${bulkRequestId}/cancel`,
                method: "PATCH",
                data: { cancel_reason },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { bulkRequestId }) => [
                { type: "BulkTransfer", id: bulkRequestId },
                { type: "BulkTransfer", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

    }),
});

export const {
    useCreateBulkTransferRequestMutation,
    useGetBulkTransferRequestsQuery,
    useGetBulkTransferRequestByIdQuery,
    useApproveBulkTransferRequestMutation,
    useRejectBulkTransferRequestMutation,
    useDispatchBulkTransferRequestMutation,
    useReceiveBulkTransferRequestMutation,
    useCancelBulkTransferRequestMutation,
    useLazyGetBulkTransferRequestByIdQuery,
    useLazyDownloadBulkChallanPdfQuery,
} = bulkTransferApi;