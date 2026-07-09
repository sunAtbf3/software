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
    tagTypes: ["FranchiseSettings"],
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
    }),
});

export const {
    useGetFranchiseSettingsQuery,
    useUpdateFranchiseSettingsMutation,
} = appSettingsApi;
