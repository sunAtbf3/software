// REDUX_SLICES/Customer_api/customerApi.js
//
// Customer Management APIs
// Endpoints: CRUD operations for customers, search, bill history

import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

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

export const customerApi = createApi({
    reducerPath: "customerApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["Customer", "CustomerBills"],

    endpoints: (builder) => ({

        // GET /customers/search?mobile=xxx — search customer by mobile
        searchCustomers: builder.query({
            query: ({ mobile, name }) => ({
                url: "/customers/search",
                method: "GET",
                params: { mobile, name },
            }),
            providesTags: ["Customer"],
            transformResponse: (response) => response.data,
        }),

        // GET /customers — list all customers with pagination
        getCustomers: builder.query({
            query: ({ page = 1, limit = 20, loyalty_tier = "" }) => {
                const params = { page, limit };
                if (loyalty_tier) params.loyalty_tier = loyalty_tier;
                return { url: "/customers", method: "GET", params };
            },
            providesTags: (result) => {
                if (result?.data) {
                    return [
                        ...result.data.map(({ customer_id }) => ({ type: "Customer", id: customer_id })),
                        { type: "Customer", id: "LIST" },
                    ];
                }
                return [{ type: "Customer", id: "LIST" }];
            },
            transformResponse: (response) => ({
                customers: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        // GET /customers/:customerId — get customer details
        getCustomerById: builder.query({
            query: (customerId) => ({
                url: `/customers/${customerId}`,
                method: "GET",
            }),
            providesTags: (result, error, customerId) => [{ type: "Customer", id: customerId }],
            transformResponse: (response) => response.data,
        }),

        // GET /customers/:customerId/bills — get customer bill history
        getCustomerBills: builder.query({
            query: ({ customerId, page = 1, limit = 20 }) => ({
                url: `/customers/${customerId}/bills`,
                method: "GET",
                params: { page, limit },
            }),
            providesTags: (result, error, { customerId }) => [
                { type: "CustomerBills", id: customerId },
            ],
            transformResponse: (response) => ({
                bills: response.data || [],
                meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
            }),
        }),

        // POST /customers — create new customer
        createCustomer: builder.mutation({
            query: (data) => ({
                url: "/customers",
                method: "POST",
                data,
            }),
            invalidatesTags: [{ type: "Customer", id: "LIST" }],
            transformResponse: (response) => response.data,
        }),

        // PUT /customers/:customerId — update customer
        updateCustomer: builder.mutation({
            query: ({ customerId, ...data }) => ({
                url: `/customers/${customerId}`,
                method: "PUT",
                data,
            }),
            invalidatesTags: (result, error, { customerId }) => [
                { type: "Customer", id: customerId },
                { type: "Customer", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // PUT /customers/:customerId/upgrade — upgrade walk-in to GST
        upgradeCustomerToGst: builder.mutation({
            query: ({ customerId, ...data }) => ({
                url: `/customers/${customerId}/upgrade`,
                method: "PUT",
                data,
            }),
            invalidatesTags: (result, error, { customerId }) => [
                { type: "Customer", id: customerId },
                { type: "Customer", id: "LIST" },
            ],
            transformResponse: (response) => response.data,
        }),

        // DELETE /customers/:customerId — delete customer
        deleteCustomer: builder.mutation({
            query: (customerId) => ({
                url: `/customers/${customerId}`,
                method: "DELETE",
            }),
            invalidatesTags: [{ type: "Customer", id: "LIST" }],
            transformResponse: (response) => response.data,
        }),

    }),
});

export const {
    useSearchCustomersQuery,
    useLazySearchCustomersQuery,
    useGetCustomersQuery,
    useGetCustomerByIdQuery,
    useGetCustomerBillsQuery,
    useCreateCustomerMutation,
    useUpdateCustomerMutation,
    useUpgradeCustomerToGstMutation,
    useDeleteCustomerMutation,
} = customerApi;