// // REDUX_SLICES/TransferRequest_api/transferRequestApi.js
//
// Transfer Request APIs (Approval workflow)
// Base path: /api/v1/transfer-requests
// Includes: Regular + Emergency requests

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

export const generateIdempotencyKey = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

export const transferRequestApi = createApi({
    reducerPath: "transferRequestApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["TransferRequest", "MyTransferRequest"],

    endpoints: (builder) => ({

        // ── POST /transfer-requests (Regular) ──────────────────────────────────
        createTransferRequest: builder.mutation({
            query: ({ idempotencyKey, ...data }) => ({
                url: "/transfer-requests",
                method: "POST",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["TransferRequest", "MyTransferRequest"],
            transformResponse: (response) => response.data,
        }),

        // ── POST /transfer-requests/emergency (NEW) ─────────────────────────────
        createEmergencyTransferRequest: builder.mutation({
            query: ({ idempotencyKey, ...data }) => ({
                url: "/transfer-requests/emergency",
                method: "POST",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: ["TransferRequest", "MyTransferRequest"],
            transformResponse: (response) => response.data,
        }),

        downloadTransferChallanPdf: builder.query({
            query: (requestId) => ({
                url: `/transfer-requests/${requestId}/challan/pdf`,
                method: "GET",
                responseType: "blob",
            }),
        }),

        // ── GET /transfer-requests (list all, role-scoped) ────────────────────
        getTransferRequests: builder.query({
            query: ({ page = 1, limit = 20, status = "", request_type = "", priority = "" }) => {
                const params = { page, limit };
                if (status) params.status = status;
                if (request_type) params.request_type = request_type;
                if (priority) params.priority = priority;
                return { url: "/transfer-requests", method: "GET", params };
            },
            providesTags: (result) => {
                if (result?.requests) {
                    return [
                        ...result.requests.map(({ request_id }) => ({ type: "TransferRequest", id: request_id })),
                        { type: "TransferRequest", id: "LIST" },
                    ];
                }
                return [{ type: "TransferRequest", id: "LIST" }];
            },
            transformResponse: (response) => ({
                requests: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        // ── GET /transfer-requests/my-requests ────────────────────────────────
        getMyTransferRequests: builder.query({
            query: ({ page = 1, limit = 20, status = "" }) => {
                const params = { page, limit };
                if (status) params.status = status;
                return { url: "/transfer-requests/my-requests", method: "GET", params };
            },
            providesTags: (result) => {
                if (result?.requests) {
                    return [
                        ...result.requests.map(({ request_id }) => ({ type: "MyTransferRequest", id: request_id })),
                        { type: "MyTransferRequest", id: "LIST" },
                    ];
                }
                return [{ type: "MyTransferRequest", id: "LIST" }];
            },
            transformResponse: (response) => ({
                requests: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        // ── GET /transfer-requests/:requestId ─────────────────────────────────
        getTransferRequestById: builder.query({
            query: (requestId) => ({ url: `/transfer-requests/${requestId}`, method: "GET" }),
            providesTags: (result, error, requestId) => [{ type: "TransferRequest", id: requestId }],
            transformResponse: (response) => response.data,
        }),

        // ── PATCH /transfer-requests/:requestId/approve ───────────────────────
        approveTransferRequest: builder.mutation({
            query: ({ requestId, transfer_bill_type, idempotencyKey }) => ({
                url: `/transfer-requests/${requestId}/approve`,
                method: "PATCH",
                data: transfer_bill_type ? { transfer_bill_type } : {},
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { requestId }) => [
                { type: "TransferRequest", id: requestId },
                { type: "TransferRequest", id: "LIST" },
                { type: "MyTransferRequest", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // ── PATCH /transfer-requests/:requestId/reject ────────────────────────
        rejectTransferRequest: builder.mutation({
            query: ({ requestId, rejection_reason, idempotencyKey }) => ({
                url: `/transfer-requests/${requestId}/reject`,
                method: "PATCH",
                data: { rejection_reason },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { requestId }) => [
                { type: "TransferRequest", id: requestId },
                { type: "TransferRequest", id: "LIST" },
                { type: "MyTransferRequest", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // ── PATCH /transfer-requests/:requestId/dispatch ──────────────────────
        dispatchTransferRequest: builder.mutation({
            query: ({ requestId, tracking_number, expected_delivery, idempotencyKey }) => ({
                url: `/transfer-requests/${requestId}/dispatch`,
                method: "PATCH",
                data: { tracking_number, expected_delivery },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { requestId }) => [
                { type: "TransferRequest", id: requestId },
                { type: "TransferRequest", id: "LIST" },
                { type: "MyTransferRequest", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // ── PATCH /transfer-requests/:requestId/receive ───────────────────────
        receiveTransferRequest: builder.mutation({
            query: ({ requestId, received_quantity, receive_remarks, idempotencyKey }) => ({
                url: `/transfer-requests/${requestId}/receive`,
                method: "PATCH",
                data: { received_quantity, receive_remarks },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { requestId }) => [
                { type: "TransferRequest", id: requestId },
                { type: "TransferRequest", id: "LIST" },
                { type: "MyTransferRequest", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // ── PATCH /transfer-requests/:requestId/cancel ────────────────────────
        cancelTransferRequest: builder.mutation({
            query: ({ requestId, cancel_reason, idempotencyKey }) => ({
                url: `/transfer-requests/${requestId}/cancel`,
                method: "PATCH",
                data: { cancel_reason },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { requestId }) => [
                { type: "TransferRequest", id: requestId },
                { type: "TransferRequest", id: "LIST" },
                { type: "MyTransferRequest", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

    }),
});

export const {
    // Mutations
    useCreateTransferRequestMutation,
    useCreateEmergencyTransferRequestMutation,  // ✅ NEW
    useApproveTransferRequestMutation,
    useRejectTransferRequestMutation,
    useDispatchTransferRequestMutation,
    useReceiveTransferRequestMutation,
    useCancelTransferRequestMutation,
    // Queries
    useGetTransferRequestsQuery,
    useGetMyTransferRequestsQuery,
    useGetTransferRequestByIdQuery,
    useLazyGetTransferRequestByIdQuery,
    useLazyDownloadTransferChallanPdfQuery,
} = transferRequestApi;