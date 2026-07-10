import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

const axiosBaseQuery = () => async ({ url, method, data, params, responseType }) => {
    try {
        const result = await AxiosInstance({
            url,
            method,
            data,
            params,
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

export const transferBillApi = createApi({
    reducerPath: "transferBillApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["TransferBill", "TransferBillSummary"],
    endpoints: (builder) => ({
        getTransferBills: builder.query({
            query: ({
                page = 1,
                limit = 20,
                search = "",
                from_date = "",
                to_date = "",
                transfer_bill_type = "",
                shop_id = "",
                warehouse_id = "",
                source = "",
            }) => {
                const params = { page, limit };
                if (search) params.search = search;
                if (from_date) params.from_date = from_date;
                if (to_date) params.to_date = to_date;
                if (transfer_bill_type) params.transfer_bill_type = transfer_bill_type;
                if (shop_id) params.shop_id = shop_id;
                if (warehouse_id) params.warehouse_id = warehouse_id;
                if (source) params.source = source;
                return { url: "/transfer-bills", method: "GET", params };
            },
            providesTags: [{ type: "TransferBill", id: "LIST" }],
            transformResponse: (response) => ({
                bills: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        getTransferBillSummary: builder.query({
            query: ({ from_date = "", to_date = "", transfer_bill_type = "", shop_id = "", warehouse_id = "" }) => {
                const params = {};
                if (from_date) params.from_date = from_date;
                if (to_date) params.to_date = to_date;
                if (transfer_bill_type) params.transfer_bill_type = transfer_bill_type;
                if (shop_id) params.shop_id = shop_id;
                if (warehouse_id) params.warehouse_id = warehouse_id;
                return { url: "/transfer-bills/summary", method: "GET", params };
            },
            providesTags: [{ type: "TransferBillSummary", id: "LIST" }],
            transformResponse: (response) => response.data || [],
        }),

        getTransferBillById: builder.query({
            query: ({ source, id }) => ({
                url: `/transfer-bills/${source}/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, { source, id }) => [{ type: "TransferBill", id: `${source}:${id}` }],
            transformResponse: (response) => response.data,
        }),

        downloadTransferBillPdf: builder.query({
            query: ({ source, id }) => ({
                url: `/transfer-bills/${source}/${id}/pdf`,
                method: "GET",
                responseType: "blob",
            }),
        }),
    }),
});

export const {
    useGetTransferBillsQuery,
    useGetTransferBillSummaryQuery,
    useGetTransferBillByIdQuery,
    useLazyGetTransferBillByIdQuery,
    useLazyDownloadTransferBillPdfQuery,
} = transferBillApi;
