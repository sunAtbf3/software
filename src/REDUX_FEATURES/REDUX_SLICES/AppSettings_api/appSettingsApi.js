import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

const axiosBaseQuery = () => async ({ url, method, data }) => {
    try {
        const result = await AxiosInstance({ url, method, data });
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

export const appSettingsApi = createApi({
    reducerPath: "appSettingsApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["FranchiseSettings", "OnlineStockSettings", "CompanyInvoiceSettings", "WholesaleSettings"],
    endpoints: (builder) => ({
        getFranchiseSettings: builder.query({
            query: () => ({
                url: "/settings/franchise",
                method: "GET",
            }),
            providesTags: ["FranchiseSettings"],
            transformResponse: (response) => response.data,
        }),
        updateFranchiseSettings: builder.mutation({
            query: (body) => ({
                url: "/settings/franchise",
                method: "PUT",
                data: body,
            }),
            invalidatesTags: ["FranchiseSettings"],
            transformResponse: (response) => response.data,
        }),
        getOnlineStockSettings: builder.query({
            query: () => ({
                url: "/settings/online-stock",
                method: "GET",
            }),
            providesTags: ["OnlineStockSettings"],
            transformResponse: (response) => response.data,
        }),
        updateOnlineStockSettings: builder.mutation({
            query: (body) => ({
                url: "/settings/online-stock",
                method: "PUT",
                data: body,
            }),
            invalidatesTags: ["OnlineStockSettings"],
            transformResponse: (response) => response.data,
        }),
        getCompanyInvoiceSettings: builder.query({
            query: () => ({
                url: "/settings/company",
                method: "GET",
            }),
            providesTags: ["CompanyInvoiceSettings"],
            transformResponse: (response) => response.data,
        }),
        updateCompanyInvoiceSettings: builder.mutation({
            query: (body) => ({
                url: "/settings/company",
                method: "PUT",
                data: body,
            }),
            invalidatesTags: ["CompanyInvoiceSettings"],
            transformResponse: (response) => response.data,
        }),
        getWholesaleSettings: builder.query({
            query: () => ({
                url: "/settings/wholesale",
                method: "GET",
            }),
            providesTags: ["WholesaleSettings"],
            transformResponse: (response) => response.data,
        }),
        updateWholesaleSettings: builder.mutation({
            query: (body) => ({
                url: "/settings/wholesale",
                method: "PUT",
                data: body,
            }),
            invalidatesTags: ["WholesaleSettings"],
            transformResponse: (response) => response.data,
        }),
    }),
});

export const {
    useGetFranchiseSettingsQuery,
    useUpdateFranchiseSettingsMutation,
    useGetOnlineStockSettingsQuery,
    useUpdateOnlineStockSettingsMutation,
    useGetCompanyInvoiceSettingsQuery,
    useUpdateCompanyInvoiceSettingsMutation,
    useGetWholesaleSettingsQuery,
    useUpdateWholesaleSettingsMutation,
} = appSettingsApi;
