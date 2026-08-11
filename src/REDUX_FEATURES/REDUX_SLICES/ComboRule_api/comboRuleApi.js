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

export const comboRuleApi = createApi({
  reducerPath: "comboRuleApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["ComboRules", "ActiveComboRules"],
  endpoints: (builder) => ({
    getComboRules: builder.query({
      query: (params = {}) => ({
        url: "/combo-rules",
        method: "GET",
        params,
      }),
      providesTags: ["ComboRules"],
      transformResponse: (response) => ({
        rules: response.data || [],
        meta: response.meta || {},
      }),
    }),
    getActiveComboRules: builder.query({
      query: () => ({
        url: "/combo-rules/active",
        method: "GET",
      }),
      providesTags: ["ActiveComboRules"],
      transformResponse: (response) => response.data || [],
    }),
    createComboRule: builder.mutation({
      query: (body) => ({
        url: "/combo-rules",
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["ComboRules", "ActiveComboRules"],
      transformResponse: (response) => response.data,
    }),
    updateComboRule: builder.mutation({
      query: ({ comboRuleId, ...body }) => ({
        url: `/combo-rules/${comboRuleId}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: ["ComboRules", "ActiveComboRules"],
      transformResponse: (response) => response.data,
    }),
    setComboRuleActive: builder.mutation({
      query: ({ comboRuleId, is_active }) => ({
        url: `/combo-rules/${comboRuleId}/active`,
        method: "PATCH",
        data: { is_active },
      }),
      invalidatesTags: ["ComboRules", "ActiveComboRules"],
      transformResponse: (response) => response.data,
    }),
    deleteComboRule: builder.mutation({
      query: (comboRuleId) => ({
        url: `/combo-rules/${comboRuleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ComboRules", "ActiveComboRules"],
      transformResponse: (response) => response.data,
    }),
  }),
});

export const {
  useGetComboRulesQuery,
  useGetActiveComboRulesQuery,
  useCreateComboRuleMutation,
  useUpdateComboRuleMutation,
  useSetComboRuleActiveMutation,
  useDeleteComboRuleMutation,
} = comboRuleApi;
