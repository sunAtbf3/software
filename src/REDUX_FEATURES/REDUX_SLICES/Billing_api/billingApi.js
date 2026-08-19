// REDUX_SLICES/Billing_api/billingApi.js
//
// Billing APIs
// Endpoints: Create bill, get bill, PDF, payments, cancel
//
// FIX: PDF download — `responseHandler` is an RTK fetch-native option and has NO effect
// on Axios. Axios receives the binary PDF response and either garbles it or parses it as
// text/JSON depending on the Content-Type. The fix is to pass `responseType: "blob"` in
// the Axios config directly when the endpoint is the PDF route, and detect it via a flag
// in the query object. The axiosBaseQuery is updated to forward `responseType` to Axios,
// and getBillPdf passes `responseType: "blob"` so Axios returns a real Blob object.
// UPDATED: Added credit_note_ids to createBill
import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";
import { shopStockApi } from "../ShopStock_api/shopStockApi";

// FIX: Accept `responseType` from the query config and pass it to Axios.
// Without this, Axios always parses the response as JSON/text, so binary PDF
// data is never returned as a Blob — making `response instanceof Blob` always false.
const parseAxiosErrorData = async (data, fallbackMessage) => {
    if (!data) return { message: fallbackMessage };
    if (typeof Blob !== "undefined" && data instanceof Blob) {
        try {
            const text = await data.text();
            return JSON.parse(text);
        } catch {
            return { message: fallbackMessage };
        }
    }
    if (typeof data === "string") {
        try {
            return JSON.parse(data);
        } catch {
            return { message: data || fallbackMessage };
        }
    }
    return data;
};

const axiosBaseQuery = () => async ({ url, method, data, params, headers, responseType }) => {
    try {
        const result = await AxiosInstance({
            url,
            method,
            data,
            params,
            headers,
            // FIX: forward responseType so Axios handles binary responses correctly
            ...(responseType ? { responseType } : {}),
        });
        return { data: result.data };
    } catch (axiosError) {
        const fallback = axiosError.message || "Request failed";
        const errorData = await parseAxiosErrorData(axiosError.response?.data, fallback);
        return {
            error: {
                status: axiosError.response?.status || 500,
                data: errorData,
            },
        };
    }
};

export const billingApi = createApi({
    reducerPath: "billingApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["Bill"],

    endpoints: (builder) => ({

        // POST /bills — create new bill
        // POST /bills — create new bill (UPDATED: accepts credit_note_ids)
        createBill: builder.mutation({
            query: ({ idempotencyKey, credit_note_ids = [], ...data }) => ({
                url: "/bills",
                method: "POST",
                data: { ...data, credit_note_ids },
                headers: { "Idempotency-Key": idempotencyKey },
                
            }),
            invalidatesTags: ["Bill"],
            transformResponse: (response) => response.data,
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(
                        shopStockApi.util.invalidateTags([
                            { type: "ShopStock", id: "LIST" },
                            { type: "ShopStock", id: "CATALOG" },
                            "LowStockAlerts",
                        ])
                    );
                } catch {
                    /* bill failed — leave stock cache unchanged */
                }
            },
        }),

        // GET /bills/:billId — get bill details
        getBillById: builder.query({
            query: (billId) => ({
                url: `/bills/${billId}`,
                method: "GET",
            }),
            providesTags: (result, error, billId) => [{ type: "Bill", id: billId }],
            transformResponse: (response) => response.data,
        }),

        // GET /bills — list bills with filters (shop scope enforced on backend)
        getBills: builder.query({
            query: ({
                page = 1,
                limit = 20,
                payment_status = "",
                from_date = "",
                to_date = "",
                shop_id = "",
                bill_number = "",
                customer_mobile = "",
                sales_channel = "",
                is_cancelled = "",
                exclude_non_listed = "",
            } = {}) => {
                const params = { page, limit };
                if (payment_status) params.payment_status = payment_status;
                if (from_date) params.from_date = from_date;
                if (to_date) params.to_date = to_date;
                if (shop_id) params.shop_id = shop_id;
                if (bill_number) params.bill_number = bill_number;
                if (customer_mobile) params.customer_mobile = customer_mobile;
                if (sales_channel) params.sales_channel = sales_channel;
                if (is_cancelled !== "" && is_cancelled != null) params.is_cancelled = is_cancelled;
                if (exclude_non_listed !== "" && exclude_non_listed != null) {
                    params.exclude_non_listed = exclude_non_listed;
                }
                return { url: "/bills", method: "GET", params };
            },
            providesTags: (result) => {
                if (result?.bills) {
                    return [
                        ...result.bills.map(({ bill_id }) => ({ type: "Bill", id: bill_id })),
                        { type: "Bill", id: "LIST" },
                    ];
                }
                return [{ type: "Bill", id: "LIST" }];
            },
            transformResponse: (response) => ({
                bills: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        // GET /bills/:billId/pdf — download PDF invoice
        // FIX: Removed the fetch-native `responseHandler` option — it has no effect on Axios.
        // Instead, pass `responseType: "blob"` so Axios correctly returns a Blob object.
        // transformResponse is also removed because with responseType "blob", result.data
        // IS the Blob — no transformation needed.
        getBillPdf: builder.query({
            query: ({ billId, printFormat = "A4" }) => ({
                url: `/bills/${billId}/pdf`,
                method: "GET",
                params: { printFormat },
                responseType: "blob", // FIX: tells Axios to return binary data as a Blob
            }),
            keepUnusedDataFor: 0,
            transformResponse: (response) => response,
        }),

        // POST /bills/:billId/payments — add partial payment
        addPayment: builder.mutation({
            query: ({ billId, idempotencyKey, ...data }) => ({
                url: `/bills/${billId}/payments`,
                method: "POST",
                data,
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { billId }) => [{ type: "Bill", id: billId }],
            transformResponse: (response) => response.data,
        }),

        // PATCH /bills/:billId/cancel — cancel bill
        cancelBill: builder.mutation({
            query: ({ billId, idempotencyKey, reason }) => ({
                url: `/bills/${billId}/cancel`,
                method: "PATCH",
                data: { reason },
                headers: { "Idempotency-Key": idempotencyKey },
            }),
            invalidatesTags: (result, error, { billId }) => [{ type: "Bill", id: billId }],
            transformResponse: (response) => response.data,
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(
                        shopStockApi.util.invalidateTags([
                            { type: "ShopStock", id: "LIST" },
                            { type: "ShopStock", id: "CATALOG" },
                            "LowStockAlerts",
                        ])
                    );
                } catch {
                    /* ignore */
                }
            },
        }),



        // GET /bills/reports/daily — daily sales summary
        getDailySummary: builder.query({
            query: ({ shop_id, date }) => ({
                url: `/bills/reports/daily`,
                method: "GET",
                params: { shop_id, date },
            }),
            transformResponse: (response) => response.data,
        }),



        // GET /bills/reports/gst — GST report by HSN
        getGSTReport: builder.query({
            query: ({ shop_id, from_date, to_date }) => ({
                url: `/bills/reports/gst`,
                method: "GET",
                params: { shop_id, from_date, to_date },
            }),
            transformResponse: (response) => response.data,
        }),

        // GET /bills/reports/shop-overview — period sales aggregates (shop-scoped)
        getShopOverview: builder.query({
            query: ({ shop_id = "", from_date, to_date }) => {
                const params = { from_date, to_date };
                if (shop_id) params.shop_id = shop_id;
                return { url: `/bills/reports/shop-overview`, method: "GET", params };
            },
            transformResponse: (response) => response.data,
        }),

    }),
});

export const {
    useCreateBillMutation,
    useGetBillByIdQuery,
    useGetBillsQuery,
    useLazyGetBillPdfQuery,
    useAddPaymentMutation,
    useCancelBillMutation,
    useGetDailySummaryQuery,
    useGetGSTReportQuery,
    useGetShopOverviewQuery,
} = billingApi;
