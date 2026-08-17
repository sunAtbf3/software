import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

const axiosBaseQuery =
  () =>
  async ({ url, method, data, params }) => {
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

export const saleDealApi = createApi({
  reducerPath: "saleDealApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["SaleDeals", "SaleDealVariants"],
  endpoints: (builder) => ({
    getSaleDeals: builder.query({
      query: (params = {}) => ({
        url: "/sale-deals",
        method: "GET",
        params,
      }),
      providesTags: ["SaleDeals"],
      transformResponse: (response) => ({
        deals: response.data || [],
        meta: response.meta || {},
      }),
    }),
    searchSaleDealVariants: builder.query({
      query: ({ search }) => ({
        url: "/sale-deals/search-variants",
        method: "GET",
        params: { search },
      }),
      providesTags: ["SaleDealVariants"],
      transformResponse: (response) => response.data,
    }),
    createSaleDeal: builder.mutation({
      query: (body) => ({
        url: "/sale-deals",
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["SaleDeals", "SaleDealVariants"],
      transformResponse: (response) => response.data,
    }),
    updateSaleDeal: builder.mutation({
      query: ({ saleDealId, ...body }) => ({
        url: `/sale-deals/${saleDealId}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["SaleDeals", "SaleDealVariants"],
      transformResponse: (response) => response.data,
    }),
    setSaleDealActive: builder.mutation({
      query: ({ saleDealId, is_active }) => ({
        url: `/sale-deals/${saleDealId}/active`,
        method: "PATCH",
        data: { is_active },
      }),
      invalidatesTags: ["SaleDeals", "SaleDealVariants"],
      transformResponse: (response) => response.data,
    }),
  }),
});

export const {
  useGetSaleDealsQuery,
  useLazySearchSaleDealVariantsQuery,
  useCreateSaleDealMutation,
  useUpdateSaleDealMutation,
  useSetSaleDealActiveMutation,
} = saleDealApi;
