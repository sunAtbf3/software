import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

const parseQueryBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
};

const axiosBaseQuery = () => async ({ url, method, data, params, headers }) => {
  try {
    const result = await AxiosInstance({ url, method, data, params, headers });
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

export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["Product"],

  endpoints: (builder) => ({

    // ── GET /products ───────────────────────────────────────────────────────
    getProducts: builder.query({
      query: ({ page = 1, limit = 20, search = "", category_id = "", is_active = "", include_inactive = false, warehouse_id = "" }) => {
        const params = { page, limit };
        if (search) params.search = search;
        if (category_id) params.category_id = category_id;
        if (warehouse_id) params.warehouse_id = warehouse_id;
        const activeFilter = parseQueryBoolean(is_active);
        if (activeFilter !== undefined) params.is_active = activeFilter ? "true" : "false";
        if (parseQueryBoolean(include_inactive) === true) params.include_inactive = "true";
        return { url: "/products", method: "GET", params };
      },
      providesTags: (result) => {
        if (result?.products) {
          return [
            ...result.products.map(({ product_id }) => ({ type: "Product", id: product_id })),
            { type: "Product", id: "LIST" },
          ];
        }
        return [{ type: "Product", id: "LIST" }];
      },
      transformResponse: (response) => ({
        products: response.data || [],
        meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
      }),
    }),

    getProductInventoryStats: builder.query({
      query: ({ warehouse_id = "" } = {}) => {
        const params = {};
        if (warehouse_id) params.warehouse_id = warehouse_id;
        return { url: "/products/inventory-stats", method: "GET", params };
      },
      providesTags: [{ type: "Product", id: "STATS" }],
      transformResponse: (response) => response.data,
    }),
    

    // ── GET /products/:productId ────────────────────────────────────────────
    getProductById: builder.query({
      query: (productId) => ({ url: `/products/${productId}`, method: "GET" }),
      providesTags: (result, error, productId) => [{ type: "Product", id: productId }],
      transformResponse: (response) => response.data,
    }),

    // ── POST /products (JSON only — no images) ──────────────────────────────
    createProduct: builder.mutation({
      query: (productData) => ({
        url: "/products",
        method: "POST",
        data: productData,
        headers: { "Content-Type": "application/json" },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Product", id: "STATS" }],
      transformResponse: (response) => response.data,
    }),

    // ── POST /products (Multipart with images) ──────────────────────────────
    createProductWithImages: builder.mutation({
      query: ({ formData }) => ({
        url: "/products",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Product", id: "STATS" }],
      transformResponse: (response) => response.data,
    }),

    // ── PUT /products/:productId ────────────────────────────────────────────
    updateProduct: builder.mutation({
      query: ({ productId, ...productData }) => ({
        url: `/products/${productId}`,
        method: "PUT",
        data: productData,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
        { type: "Product", id: "STATS" },
      ],
      transformResponse: (response) => response.data,
    }),

    // ── DELETE /products/:productId — soft delete ───────────────────────────
    deleteProduct: builder.mutation({
      query: (productId) => ({
        url: `/products/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, productId) => [
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
        { type: "Product", id: "STATS" },
      ],
      transformResponse: (response) => response.data,
    }),

    // ── POST /products/:productId/variants ──────────────────────────────────
    createVariant: builder.mutation({
      query: ({ productId, ...variantData }) => ({
        url: `/products/${productId}/variants`,
        method: "POST",
        data: variantData,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
        { type: "Product", id: "STATS" },
      ],
      transformResponse: (response) => response.data,
    }),

    // ── PUT /products/:productId/variants/:variantId ────────────────────────
    updateVariant: builder.mutation({
      query: ({ productId, variantId, ...variantData }) => ({
        url: `/products/${productId}/variants/${variantId}`,
        method: "PUT",
        data: variantData,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
        { type: "Product", id: "STATS" },
      ],
      transformResponse: (response) => response.data,
    }),

    // ── POST /products/:productId/variants/:variantId/images ────────────────
    uploadVariantImages: builder.mutation({
      query: ({ productId, variantId, formData }) => ({
        url: `/products/${productId}/variants/${variantId}/images`,
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: "Product", id: productId }],
      transformResponse: (response) => response.data,
    }),

    // ── PUT /products/:productId/variants/:variantId/images (sync/replace) ────────
    syncVariantImages: builder.mutation({
      query: ({ productId, variantId, formData }) => ({
        url: `/products/${productId}/variants/${variantId}/images`,
        method: "PUT",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: "Product", id: productId }],
      transformResponse: (response) => response.data,
    }),

    // ── PATCH /products/bulk (Bulk Update) ───────────────────────────
    bulkUpdateProducts: builder.mutation({
      query: (items) => ({
        url: "/products/bulk",
        method: "PATCH",
        data: { items },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Product", id: "STATS" }],
      transformResponse: (response) => response.data,
    }),

    // ── DELETE /products/bulk (Bulk Archive/Soft Delete) ─────────────
    bulkArchiveProducts: builder.mutation({
      query: (productIds) => ({
        url: "/products/bulk",
        method: "DELETE",
        data: { product_ids: productIds },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Product", id: "STATS" }],
      transformResponse: (response) => response.data,
    }),

    // ── PATCH /products/bulk/restore (Bulk Restore from Archive) ──────────────
    bulkRestoreProducts: builder.mutation({
      query: (productIds) => ({
        url: "/products/bulk/restore",
        method: "PATCH",
        data: { product_ids: productIds },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Product", id: "STATS" }],
      transformResponse: (response) => response.data,
    }),

    // ── DELETE /products/hard-delete-by-date (Permanent Delete by Date) ───────
    hardDeleteProductsByDate: builder.mutation({
      query: ({ date }) => ({
        url: "/products/hard-delete-by-date",
        method: "DELETE",
        params: { date },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, { type: "Product", id: "STATS" }],
      transformResponse: (response) => response.data,
    }),

    // Add to endpoints:
    getInactiveProducts: builder.query({
      query: ({ page = 1, limit = 20, search = "", category_id = "", warehouse_id = "" }) => {
        const params = { page, limit };
        if (search) params.search = search;
        if (category_id) params.category_id = category_id;
        if (warehouse_id) params.warehouse_id = warehouse_id;
        return { url: "/products/inactive", method: "GET", params };
      },
      providesTags: (result) => {
        if (result?.products) {
          return [
            ...result.products.map(({ product_id }) => ({ type: "Product", id: product_id })),
            { type: "Product", id: "INACTIVE_LIST" },
          ];
        }
        return [{ type: "Product", id: "INACTIVE_LIST" }];
      },
      transformResponse: (response) => ({
        products: response.data || [],
        meta: response.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
      }),
    }),



       // GET /products/by-barcode/:barcode?shop_id= — for billing scan
        getProductByBarcode: builder.query({
            query: (arg) => {
                const barcode = typeof arg === "string" ? arg : arg?.barcode;
                const shop_id = typeof arg === "object" ? arg?.shop_id : undefined;
                return {
                    url: `/products/by-barcode/${encodeURIComponent(barcode)}`,
                    method: "GET",
                    ...(shop_id ? { params: { shop_id } } : {}),
                };
            },
            providesTags: (result, error, arg) => {
                const barcode = typeof arg === "string" ? arg : arg?.barcode;
                return [{ type: "Product", id: `barcode-${barcode}` }];
            },
            transformResponse: (response) => response.data,
        }),

  }),
});

export const {
  useGetProductsQuery,
  useGetProductInventoryStatsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useCreateProductWithImagesMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateVariantMutation,
  useUpdateVariantMutation,
  useUploadVariantImagesMutation,
  useSyncVariantImagesMutation,
  useBulkUpdateProductsMutation,
  useBulkArchiveProductsMutation,
  useBulkRestoreProductsMutation,
  useHardDeleteProductsByDateMutation,
  useGetInactiveProductsQuery,

   useGetProductByBarcodeQuery,
    useLazyGetProductByBarcodeQuery,
} = productApi;