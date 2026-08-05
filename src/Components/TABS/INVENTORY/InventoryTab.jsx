import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Plus, Package, Tag, TrendingUp,RefreshCw, Layers, Eye, Upload, Download, FolderPlus, CheckSquare, Square, ChevronDown, ChevronRight, Barcode, Printer } from "lucide-react";
import { toast } from "../../shared/ToastConfig";
import AxiosInstance from "../../../SERVICES/AxiosInstance";
import {
  useGetProductsQuery,
  useGetProductInventoryStatsQuery,
  useDeleteProductMutation,
  useBulkUpdateProductsMutation,
  useBulkArchiveProductsMutation,
} from "../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
import CategoriesTab from "../../shared/CategoriesTab/CategoriesTab";
import { useGetCategoriesQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Category_api/categoryApi";
import {
  openAddForm, closeAddForm,
  openEditForm, closeEditForm,
  openViewModal, closeViewModal,
  setSearch, setCategoryFilter, setActiveFilter,
  setCurrentPage, setPageSize, resetFilters,
  setSelectedProductIds,
  clearSelectedProducts,
  toggleSelectAll,
} from "../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
import ProductAddForm from "./ProductShared/ProductAddForm";
import ProductEditForm from "./ProductShared/ProductEditForm";
import ProductView from "./ProductShared/ProductView";
import { CURRENT_USER, can } from "../../../Components/roles";
import BulkUploadTab from "./BulkUploadTab/BulkUploadTab";
import BulkActionBar from "./BulkActionBar/BulkActionBar";
import BarcodeLabelModal from "./ProductShared/Barcode_Compo/BarcodeLabelModal";

const StatusBadge = ({ isActive }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
    isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
    {isActive ? "Active" : "Inactive"}
  </span>
);

export default function InventoryTab() {
  const dispatch = useDispatch();

  const {
    showAddForm, showEditForm, showViewModal,
    formData, formErrors,
    variants, showVariantModal, variantForm, variantErrors,
    editingVariantIndex, selectedProduct,
    search, categoryFilter, activeFilter, currentPage, pageSize,
    selectedProductIds,
  } = useSelector((state) => state.product);

  // Local state for expandable rows and barcode modal
  const [expandedProducts, setExpandedProducts] = useState({});
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedVariantsForBarcode, setSelectedVariantsForBarcode] = useState([]);
  /** @type {[{ variant_id: string, product_id: string, variant: object, product: object }]} */
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [exporting, setExporting] = useState(false);

  const handleExportProducts = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await AxiosInstance.get("/products/bulk/export", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Products exported");
    } catch (err) {
      console.error("Product export failed:", err);
      toast.error(err.response?.data?.message || "Failed to export products");
    } finally {
      setExporting(false);
    }
  };

  const warehouseId = CURRENT_USER.role === "SUPER_ADMIN" ? "" : CURRENT_USER.locationId || "";

  const productListParams = useMemo(() => {
    const base = {
      page: currentPage,
      limit: pageSize,
      search,
      category_id: categoryFilter,
      warehouse_id: warehouseId,
    };
    if (activeFilter === "true") return { ...base, is_active: true };
    if (activeFilter === "false") return { ...base, is_active: false };
    return { ...base, include_inactive: true };
  }, [currentPage, pageSize, search, categoryFilter, activeFilter, warehouseId]);

  const { data, isLoading, isFetching, refetch } = useGetProductsQuery(productListParams);
  const { data: inventoryStats, refetch: refetchStats } = useGetProductInventoryStatsQuery({ warehouse_id: warehouseId });

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { data: categoriesData } = useGetCategoriesQuery({ is_active: true, limit: 100 });
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [bulkUpdate] = useBulkUpdateProductsMutation();
  const [bulkArchive] = useBulkArchiveProductsMutation();

  const products = data?.products || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
  const categories = categoriesData?.categories || [];

  const allSelectedOnPage = products.length > 0 && 
    products.every(p => selectedProductIds.includes(p.product_id));
  const someSelected = products.some(p => selectedProductIds.includes(p.product_id));


  const stats = inventoryStats || {
    total_products: 0,
    active_count: 0,
    multi_variant_count: 0,
    avg_mrp: 0,
  };

  // Toggle expand for product row - ONLY for multi-variant products
  const toggleExpand = (productId) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  // Handle single variant barcode (opens modal with single label)
  const handleSingleVariantBarcode = (variant, product) => {
    setSelectedVariantsForBarcode([{ variant, product }]);
    setShowBarcodeModal(true);
  };

  // Handle all variants barcode for multi-variant products
  const handleAllVariantsBarcode = (product) => {
    if (!product.variants || product.variants.length === 0) {
      toast.warning("No variants found for this product");
      return;
    }
    const variantsWithProducts = product.variants.map(variant => ({ 
      variant, 
      product: {
        product_id: product.product_id,
        name: product.name,
        product_code: product.product_code,
        brand_name: product.brand_name,
      }
    }));
    setSelectedVariantsForBarcode(variantsWithProducts);
    setShowBarcodeModal(true);
  };

  // Get non-primary variants for expand row (exclude primary_variant)
  const getNonPrimaryVariants = (product) => {
    if (!product.variants || product.variants.length <= 1) return [];
    const primaryVariantId = product.primary_variant?.variant_id;
    return product.variants.filter(v => v.variant_id !== primaryVariantId);
  };

  const buildProductBrief = (product) => ({
    product_id: product.product_id,
    name: product.name,
    product_code: product.product_code,
    brand_name: product.brand_name,
  });

  const clearSelectedVariants = () => setSelectedVariants([]);

  const isVariantSelected = (variantId) =>
    selectedVariants.some((row) => row.variant_id === variantId);

  const toggleSelectVariant = (entry) => {
    if (!entry?.variant_id || !entry?.product_id) return;
    setSelectedVariants((prev) => {
      if (prev.some((row) => row.variant_id === entry.variant_id)) {
        return prev.filter((row) => row.variant_id !== entry.variant_id);
      }
      return [
        ...prev,
        {
          variant_id: entry.variant_id,
          product_id: entry.product_id,
          variant: entry.variant,
          product: entry.product,
        },
      ];
    });
  };

  const toggleSelectAllVariantsForProduct = (product, variantsList) => {
    if (!product?.product_id || !Array.isArray(variantsList) || variantsList.length === 0) return;
    const ids = variantsList.map((v) => v.variant_id);
    const allSelected = ids.every((id) => selectedVariants.some((row) => row.variant_id === id));
    const productBrief = buildProductBrief(product);

    setSelectedVariants((prev) => {
      if (allSelected) {
        return prev.filter((row) => !ids.includes(row.variant_id));
      }
      const next = prev.filter((row) => !ids.includes(row.variant_id));
      variantsList.forEach((variant) => {
        next.push({
          variant_id: variant.variant_id,
          product_id: product.product_id,
          variant,
          product: productBrief,
        });
      });
      return next;
    });
  };

  const handleArchive = async (productId, name) => {
    if (!window.confirm(`Archive "${name}"? This will soft delete the product.`)) return;
    try {
      await deleteProduct(productId).unwrap();
      toast.success(`"${name}" archived successfully`);
      refetch();
      dispatch(clearSelectedProducts());
      clearSelectedVariants();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to archive product");
    }
  };

  const clearAllSelection = () => {
    dispatch(clearSelectedProducts());
    clearSelectedVariants();
  };

  /** Products: Activate / Archive. Variants: Activate / Deactivate only. */
  const handleBulkAction = async (action) => {
    const productIds = selectedProductIds;
    const variantRows = selectedVariants;

    if (!productIds.length && !variantRows.length) {
      throw { data: { message: "Nothing selected" } };
    }

    if (productIds.length && variantRows.length) {
      throw { data: { message: "Select either products or variants — not both" } };
    }

    if (action === "activate") {
      const items = productIds.length
        ? productIds.map((id) => ({ product_id: id, is_active: true }))
        : variantRows.map((row) => ({
            product_id: row.product_id,
            variant_id: row.variant_id,
            is_active: true,
          }));
      const result = await bulkUpdate(items).unwrap();
      const failed = Array.isArray(result?.failed) ? result.failed : [];
      if (failed.length) {
        throw { data: { message: failed[0]?.message || "Some updates failed" } };
      }
    } else if (action === "deactivate") {
      if (!variantRows.length) {
        throw { data: { message: "Deactivate is only for variants" } };
      }
      const items = variantRows.map((row) => ({
        product_id: row.product_id,
        variant_id: row.variant_id,
        is_active: false,
      }));
      const result = await bulkUpdate(items).unwrap();
      const failed = Array.isArray(result?.failed) ? result.failed : [];
      if (failed.length) {
        throw { data: { message: failed[0]?.message || "Some variant updates failed" } };
      }
    } else if (action === "archive") {
      if (!productIds.length) {
        throw { data: { message: "Archive is only for products" } };
      }
      await bulkArchive(productIds).unwrap();
    } else {
      throw { data: { message: "Unsupported action" } };
    }

    refetch();
    refetchStats();
  };

  const toggleSelectProduct = (productId) => {
    if (selectedProductIds.includes(productId)) {
      dispatch(setSelectedProductIds(selectedProductIds.filter(id => id !== productId)));
    } else {
      dispatch(setSelectedProductIds([...selectedProductIds, productId]));
    }
  };

  const handleSelectAll = () => {
    if (allSelectedOnPage) {
      const remainingIds = selectedProductIds.filter(id => !products.some(p => p.product_id === id));
      dispatch(setSelectedProductIds(remainingIds));
    } else {
      const newIds = [...selectedProductIds];
      products.forEach(p => {
        if (!newIds.includes(p.product_id)) {
          newIds.push(p.product_id);
        }
      });
      dispatch(setSelectedProductIds(newIds));
    }
  };

  const handleSaveSuccess = () => {
    dispatch(closeAddForm());
    dispatch(closeEditForm());
    refetch();
    dispatch(clearSelectedProducts());
    clearSelectedVariants();
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
    dispatch(clearSelectedProducts());
    clearSelectedVariants();
  };

  const getCategoryName = (id) => categories.find(c => c.category_id === id)?.name || "—";

  // Check if product has variants (multi-variant)
  const hasMultipleVariants = (product) => {
    return product.variant_count > 1 || (product.variants && product.variants.length > 1);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products & Inventory</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage products, variants, pricing matrices, and barcode configurations.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {can("productMs.category_add") && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-green-500 border border-gray-200 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-green-600 inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FolderPlus size={16} /> Add Category
            </button>
          )}
          
          {can("productMs.export") && (
            <button
              onClick={handleExportProducts}
              disabled={exporting}
              className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download size={16} /> {exporting ? "Exporting…" : "Export Products"}
            </button>
          )}

          {can("productMs.bulk_upload") && (
            <button
              onClick={() => setShowBulkUpload(true)}
              className="bg-red-500 border border-gray-200 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-red-600 inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Upload size={16} className="text-white" /> Bulk Upload
            </button>
          )}
          
          {can("productMs.create") && (
            <button
              onClick={() => dispatch(openAddForm())}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus size={16} /> Add Product
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" >
             <RefreshCw size={13} /> Refresh
             </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-600">Total Products</p>
          <p className="text-3xl font-bold text-gray-700 mt-1">{stats.total_products}</p>
          <p className="text-xs text-gray-400 mt-1">total in system</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-600">Active</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">{stats.active_count}</p>
          <p className="text-xs text-gray-400 mt-1">total in system</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400">Multi-Variant</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">{stats.multi_variant_count}</p>
          <p className="text-xs text-gray-400 mt-1">total in system</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-400">Avg MRP</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">
            ₹{stats.avg_mrp.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">across all products</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            placeholder="Search by product name or code…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            onClick={() => dispatch(resetFilters())}
            className="bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X size={14} /> Clear
          </button>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => dispatch(setCategoryFilter(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => dispatch(setActiveFilter(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 ml-auto cursor-pointer"
          >
            {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Products & Inventory</span>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{meta.total} records</span>
        </div>
        <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {/* Expand/Collapse column - only shown for multi-variant products */}
              <th className="px-2 py-3 w-8"></th>
              
              {/* Bulk select checkbox column */}
              {(can("productMs.edit") || can("productMs.archive")) && (
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={handleSelectAll}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {allSelectedOnPage ? (
                      <CheckSquare size={18} />
                    ) : someSelected ? (
                      <Square size={18} className="text-blue-500" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
              )}
              {["Product", "Brand", "Category", "Pricing", "Variants", "Status", "Barcode", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(isLoading || isFetching) && (
              <tr><td colSpan={9} className="px-4 py-10 text-center">
                <div className="flex justify-center"><div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /></div>
              </td></tr>
            )}

            {!isLoading && !isFetching && products.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-14 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Package size={32} className="text-gray-300" />
                  <p className="text-sm text-gray-400">No products found</p>
                  <button onClick={() => dispatch(openAddForm())} className="text-xs text-gray-500 hover:underline cursor-pointer">Add your first product</button>
                </div>
              </td></tr>
            )}

            {!isLoading && products.map(p => {
              const isMultiVariant = hasMultipleVariants(p);
              const nonPrimaryVariants = getNonPrimaryVariants(p);
              
              return (
              <React.Fragment key={p.product_id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  {/* Expand button - ONLY show for multi-variant products */}
                  <td className="px-2 py-3">
                    {isMultiVariant && (
                      <button
                        onClick={() => toggleExpand(p.product_id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {expandedProducts[p.product_id] ? (
                          <ChevronDown size={16} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-400" />
                        )}
                      </button>
                    )}
                  </td>

                  {/* Checkbox */}
                  {(can("productMs.edit") || can("productMs.archive")) && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelectProduct(p.product_id)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {selectedProductIds.includes(p.product_id) ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                  )}

                  {/* Product */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                        {p.primary_variant?.images?.[0]?.url ? (
                          <img src={p.primary_variant.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-blue-600">{p.primary_variant?.product_code || p.product_code}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Brand Name */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {p.brand_name || "—"}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-xs font-medium">
                      {p.category?.name || getCategoryName(p.category_id)}
                    </span>
                  </td>

                  {/* Pricing */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 w-14">Special</span>
                        <span className="text-sm font-semibold text-blue-600">₹{p.special_price?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 w-14">Wholesale</span>
                        <span className="text-xs font-semibold text-indigo-600">₹{p.wholesale_price?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 w-14">Purchase</span>
                        <span className="text-xs font-semibold text-green-600">₹{p.purchase_price?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 w-14">MRP</span>
                        <span className="text-xs font-bold text-red-500">₹{p.mrp?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 w-14">Warranty</span>
                        <span className="text-xs text-gray-600 truncate max-w-[120px]" title={p.warranty || ""}>{p.warranty || "—"}</span>
                      </div>
                    </div>
                  </td>

                  {/* Variants */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                        p.variant_count > 1 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        <Layers size={10} />
                        {p.variant_count || 1} variant{p.variant_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge isActive={p.is_active} />
                  </td>

                  {/* Barcode Action - Different text based on variant count */}
                  <td className="px-4 py-3">
                    {isMultiVariant ? (
                      <button
                        onClick={() => handleAllVariantsBarcode(p)}
                        className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-1.5"
                        title="Generate barcode labels for all variants"
                      >
                        <Barcode size={14} />
                        Get Labels
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSingleVariantBarcode(p.primary_variant, {
                          product_id: p.product_id,
                          name: p.name,
                          product_code: p.product_code,
                          brand_name: p.brand_name,
                        })}
                        className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-1.5"
                        title="Generate barcode label"
                      >
                        <Barcode size={14} />
                        Get Barcode
                      </button>
                    )}
                  </td>
                  

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {can("productMs.read") && (
                        <button
                          onClick={() => dispatch(openViewModal(p))}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {can("productMs.edit") && (
                        <button
                          onClick={() => dispatch(openEditForm(p))}
                          className="text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                      {can("productMs.archive") && (
                        <button
                          onClick={() => handleArchive(p.product_id, p.name)}
                          disabled={isDeleting}
                          className="text-xs font-medium text-red-500 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded Row - Variants (ONLY for multi-variant, showing NON-primary variants) */}
                {expandedProducts[p.product_id] && isMultiVariant && nonPrimaryVariants.length > 0 && (
                  <tr>
                    <td colSpan={9} className="px-0 py-0 bg-gray-50">
                      <div className="p-4 pl-12 border-t border-gray-100">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 w-10">
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectAllVariantsForProduct(p, nonPrimaryVariants)}
                                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                                    title="Select all nested variants for this product"
                                  >
                                    {nonPrimaryVariants.every((v) => isVariantSelected(v.variant_id)) ? (
                                      <CheckSquare size={16} className="text-indigo-600" />
                                    ) : (
                                      <Square size={16} />
                                    )}
                                  </button>
                                </th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Variant SKU</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Barcode</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Status</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Special Price</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Wholesale</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Purchase Price</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Warranty</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Attributes</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {nonPrimaryVariants.map((variant) => (
                                <tr key={variant.variant_id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSelectVariant({
                                          variant_id: variant.variant_id,
                                          product_id: p.product_id,
                                          variant,
                                          product: buildProductBrief(p),
                                        })
                                      }
                                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                      {isVariantSelected(variant.variant_id) ? (
                                        <CheckSquare size={16} className="text-indigo-600" />
                                      ) : (
                                        <Square size={16} />
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="font-mono text-xs text-gray-600">
                                      {variant.product_code || variant.sku || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="font-mono text-xs text-gray-400">
                                      {variant.system_barcode || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <StatusBadge isActive={variant.is_active !== false} />
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="text-sm font-semibold text-blue-600">
                                      ₹{variant.special_price?.toLocaleString() || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="text-sm font-semibold text-indigo-600">
                                      ₹{variant.wholesale_price?.toLocaleString() || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="text-sm font-semibold text-green-600">
                                      ₹{variant.purchase_price?.toLocaleString() || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="text-xs text-gray-600">{variant.warranty || "—"}</span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex flex-wrap gap-1 text-gray-600">
                                      {variant.attributes?.length > 0 ? (
                                        variant.attributes.map((attr, idx) => (
                                          <span key={idx} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                            {attr.key}: {attr.value}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <button
                                      onClick={() => handleSingleVariantBarcode(variant, buildProductBrief(p))}
                                      className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                                    >
                                      <Printer size={12} />
                                      Get Barcode
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2 items-center">
            <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50 disabled:opacity-40 transition-colors">Previous</button>
            <span className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-500">{currentPage} / {meta.totalPages}</span>
            <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="text-xs border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-50 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}

      {/* One bulk bar for products and/or variants */}
      {(selectedProductIds.length > 0 || selectedVariants.length > 0) && (
        <BulkActionBar
          selectedProductCount={selectedProductIds.length}
          selectedVariantCount={selectedVariants.length}
          onBulkAction={handleBulkAction}
          onClear={clearAllSelection}
        />
      )}

      {/* Modals */}
      {showAddForm && (
        <ProductAddForm
          formData={formData} formErrors={formErrors}
          variants={variants} showVariantModal={showVariantModal}
          variantForm={variantForm} variantErrors={variantErrors}
          editingVariantIndex={editingVariantIndex}
          onSave={handleSaveSuccess}
        />
      )}

      {showEditForm && selectedProduct && (
        <ProductEditForm
          formData={formData} formErrors={formErrors}
          selectedProduct={selectedProduct}
          showVariantModal={showVariantModal}
          variantForm={variantForm} variantErrors={variantErrors}
          editingVariantIndex={editingVariantIndex}
          onSave={handleSaveSuccess}
        />
      )}

      {showViewModal && selectedProduct && (
        <ProductView
          productId={selectedProduct.product_id}
          onClose={() => dispatch(closeViewModal())}
        />
      )}

      <BulkUploadTab
        isOpen={showBulkUpload}
        onClose={() => {
          setShowBulkUpload(false);
          refetch();
        }}
      />

      {showCategoryModal && (                 
        <CategoriesTab onClose={() => setShowCategoryModal(false)} />
      )}

      {/* Barcode Label Modal */}
      <BarcodeLabelModal
        isOpen={showBarcodeModal}
        onClose={() => {
          setShowBarcodeModal(false);
          setSelectedVariantsForBarcode([]);
        }}
        variantsWithProducts={selectedVariantsForBarcode}
      />

    </div>
  );
}
// down code is working but upper code have barcode 

// import React, { useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { X, Plus, Package, Tag, TrendingUp, Layers, Eye, Upload, FolderPlus, CheckSquare, Square } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//   useGetProductsQuery,
//   useDeleteProductMutation,
//   useBulkUpdateProductsMutation,
//   useBulkArchiveProductsMutation,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
// import CategoriesTab from "../../shared/CategoriesTab/CategoriesTab";
// import { useGetCategoriesQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Category_api/categoryApi";
// import {
//   openAddForm, closeAddForm,
//   openEditForm, closeEditForm,
//   openViewModal, closeViewModal,
//   setSearch, setCategoryFilter, setActiveFilter,
//   setCurrentPage, setPageSize, resetFilters,
//   setSelectedProductIds,
//   clearSelectedProducts,
//   toggleSelectAll,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
// import ProductAddForm from "./ProductShared/ProductAddForm";
// import ProductEditForm from "./ProductShared/ProductEditForm";
// import ProductView from "./ProductShared/ProductView";
// import { CURRENT_USER,can  } from "../../../Components/roles";
// import BulkUploadTab from "./BulkUploadTab/BulkUploadTab";
// import BulkActionBar from "././BulkActionBar/BulkActionBar";

// const StatusBadge = ({ isActive }) => (
//   <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
//     isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
//   }`}>
//     <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
//     {isActive ? "Active" : "Inactive"}
//   </span>
// );

// export default function InventoryTab() {
//   const dispatch = useDispatch();

//   const {
//     showAddForm, showEditForm, showViewModal,
//     formData, formErrors,
//     variants, showVariantModal, variantForm, variantErrors,
//     editingVariantIndex, selectedProduct,
//     search, categoryFilter, activeFilter, currentPage, pageSize,
//     selectedProductIds, // ADD THIS
//   } = useSelector((state) => state.product);

//   const warehouseId = CURRENT_USER.role === "SUPER_ADMIN" ? "" : CURRENT_USER.locationId || "";

//   const { data, isLoading, isFetching, refetch } = useGetProductsQuery({
//     page: currentPage, limit: pageSize,
//     search, category_id: categoryFilter,
//     is_active: activeFilter, warehouse_id: warehouseId,
//   });

//   // ADD THIS - same query, just get all for stats
//   const { data: allData } = useGetProductsQuery({
//     page: 1, limit: 100,  // Get all records
//     search, category_id: categoryFilter,
//     is_active: activeFilter, warehouse_id: warehouseId,
//   }, { skip: false }); // Always fetch

//   const [showBulkUpload, setShowBulkUpload] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);
//   const { data: categoriesData } = useGetCategoriesQuery({ is_active: true, limit: 100 });
//   const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
//   const [bulkUpdate] = useBulkUpdateProductsMutation();
//   const [bulkArchive] = useBulkArchiveProductsMutation();

//   const products = data?.products || [];
//   const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
//   const categories = categoriesData?.categories || [];

//   // Check if all products on current page are selected
//   const allSelectedOnPage = products.length > 0 && 
//     products.every(p => selectedProductIds.includes(p.product_id));
  
//   // Some selected on page
//   const someSelected = products.some(p => selectedProductIds.includes(p.product_id));

// // Then use allData?.products for stats
// const allProducts = allData?.products || [];
// const totalActiveCount = allProducts.filter(p => p.is_active).length;
// const totalMultiVariant = allProducts.filter(p => p.variant_count > 1).length;
// const totalAvgMrp = allProducts.length
//   ? Math.round(allProducts.reduce((s, p) => s + (p.mrp || 0), 0) / allProducts.length)
//   : 0;

//   // ── Handle individual product archive (replaces deactivate) ──
//   const handleArchive = async (productId, name) => {
//     if (!window.confirm(`Archive "${name}"? This will soft delete the product.`)) return;
//     try {
//       await deleteProduct(productId).unwrap();
//       toast.success(`"${name}" archived successfully`);
//       refetch();
//       dispatch(clearSelectedProducts());
//     } catch (err) {
//       toast.error(err?.data?.message || "Failed to archive product");
//     }
//   };

//   // ── Handle bulk actions ──
//   const handleBulkAction = async (action, productIds) => {
//     if (action === "activate") {
//       const items = productIds.map(id => ({ product_id: id, is_active: true }));
//       await bulkUpdate(items).unwrap();
//     } else if (action === "deactivate") {
//       const items = productIds.map(id => ({ product_id: id, is_active: false }));
//       await bulkUpdate(items).unwrap();
//     } else if (action === "archive") {
//       await bulkArchive(productIds).unwrap();
//     }
//     refetch();
//   };

//   // ── Toggle individual product selection ──
//   const toggleSelectProduct = (productId) => {
//     if (selectedProductIds.includes(productId)) {
//       dispatch(setSelectedProductIds(selectedProductIds.filter(id => id !== productId)));
//     } else {
//       dispatch(setSelectedProductIds([...selectedProductIds, productId]));
//     }
//   };

//   // ── Toggle select all on current page ──
//   const handleSelectAll = () => {
//     if (allSelectedOnPage) {
//       // Deselect all on current page
//       const remainingIds = selectedProductIds.filter(id => !products.some(p => p.product_id === id));
//       dispatch(setSelectedProductIds(remainingIds));
//     } else {
//       // Select all on current page
//       const newIds = [...selectedProductIds];
//       products.forEach(p => {
//         if (!newIds.includes(p.product_id)) {
//           newIds.push(p.product_id);
//         }
//       });
//       dispatch(setSelectedProductIds(newIds));
//     }
//   };

//   const handleSaveSuccess = () => {
//     dispatch(closeAddForm());
//     dispatch(closeEditForm());
//     refetch();
//     dispatch(clearSelectedProducts());
//   };

//   const getCategoryName = (id) => categories.find(c => c.category_id === id)?.name || "—";

//   return (
//     <div className="space-y-5">

//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//         <div>
//           <h2 className="text-xl font-bold text-gray-900 tracking-tight">Products & Inventory</h2>
//           <p className="text-sm text-gray-500 mt-1">
//             Manage products, variants, pricing matrices, and master barcode configurations.
//           </p>
//         </div>
        
//         <div className="flex items-center gap-2.5 self-end sm:self-auto">
//           {can("productMs.category_add") && (
//             <button
//               onClick={() => setShowCategoryModal(true)}
//               className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
//             >
//               <FolderPlus size={16} /> Add Category
//             </button>
//           )}
          
//           {can("productMs.bulk_upload") && (
//             <button
//               onClick={() => setShowBulkUpload(true)}
//               className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
//             >
//               <Upload size={16} className="text-gray-500" /> Bulk Upload
//             </button>
//           )}
          
//           {can("productMs.create") && (
//           <button
//             onClick={() => dispatch(openAddForm())}
//             className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
//           >
//             <Plus size={16} /> Add Product
//           </button>
//         )}
//         </div>
//       </div>

//       {/* Stats Cards */}
//       {/* Stats Cards */}
// <div className="grid grid-cols-4 gap-4">
//   <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Total Products</p>
//       <Package size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">{allProducts.length}</p>
//     <p className="text-xs opacity-60 mt-1">matching filters</p>
//   </div>
//   <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Active</p>
//       <Tag size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">{allProducts.filter(p => p.is_active).length}</p>
//     <p className="text-xs opacity-60 mt-1">total in system</p>
//   </div>
//   <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Multi-Variant</p>
//       <Layers size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">{allProducts.filter(p => p.variant_count > 1).length}</p>
//     <p className="text-xs opacity-60 mt-1">total in system</p>
//   </div>
//   <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Avg MRP</p>
//       <TrendingUp size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">
//       ₹{allProducts.length 
//         ? Math.round(allProducts.reduce((s, p) => s + (p.mrp || 0), 0) / allProducts.length).toLocaleString() 
//         : 0}
//     </p>
//     <p className="text-xs opacity-60 mt-1">across all products</p>
//   </div>
// </div>

//       {/* Filters */}
//       <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
//         <div className="flex gap-3">
//           <input
//             value={search}
//             onChange={(e) => dispatch(setSearch(e.target.value))}
//             placeholder="Search by product name or code…"
//             className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           <button
//             onClick={() => dispatch(resetFilters())}
//             className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
//           >
//             <X size={14} /> Clear
//           </button>
//         </div>
//         <div className="flex gap-3 flex-wrap">
//           <select
//             value={categoryFilter}
//             onChange={(e) => dispatch(setCategoryFilter(e.target.value))}
//             className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="">All Categories</option>
//             {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
//           </select>
//           <select
//             value={activeFilter}
//             onChange={(e) => dispatch(setActiveFilter(e.target.value))}
//             className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="">All Status</option>
//             <option value="true">Active</option>
//             <option value="false">Inactive</option>
//           </select>
//           <select
//             value={pageSize}
//             onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//             className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 ml-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//           </select>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-50 border-b border-gray-100">
//             <tr>
//               {/* Checkbox column */}
//               {/* Bulk select checkbox column — only show if user can perform bulk actions */}
//             {(can("productMs.edit") || can("productMs.archive")) && (
//               <th className="px-4 py-3 w-10">
//                 <button
//                   onClick={handleSelectAll}
//                   className="text-gray-500 hover:text-blue-600 transition-colors"
//                 >
//                   {allSelectedOnPage ? (
//                     <CheckSquare size={18} />
//                   ) : someSelected ? (
//                     <Square size={18} className="text-blue-500" />
//                   ) : (
//                     <Square size={18} />
//                   )}
//                 </button>
//               </th>
//             )}
//               {["Product", "Vendor", "Category", "Pricing", "Variants", "Status", "Actions"].map(h => (
//                 <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
//                   {h}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-50">

//             {(isLoading || isFetching) && (
//               <tr><td colSpan={8} className="px-4 py-10 text-center">
//                 <div className="flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
//               </td></tr>
//             )}

//             {!isLoading && !isFetching && products.length === 0 && (
//               <tr><td colSpan={8} className="px-4 py-14 text-center">
//                 <div className="flex flex-col items-center gap-2">
//                   <Package size={32} className="text-gray-300" />
//                   <p className="text-gray-400 text-sm">No products found</p>
//                   <button onClick={() => dispatch(openAddForm())} className="text-blue-600 text-xs font-medium hover:underline cursor-pointer">Add your first product</button>
//                 </div>
//               </td></tr>
//             )}

//             {!isLoading && products.map(p => (
//               <tr key={p.product_id} className="hover:bg-gray-50 transition-colors">
//                 {/* Checkbox */}
//                 {/* Row checkbox — only show if user can perform bulk actions */}
//                 {(can("productMs.edit") || can("productMs.archive")) && (
//                   <td className="px-4 py-3">
//                     <button
//                       onClick={() => toggleSelectProduct(p.product_id)}
//                       className="text-gray-400 hover:text-blue-600 transition-colors"
//                     >
//                       {selectedProductIds.includes(p.product_id) ? (
//                         <CheckSquare size={18} className="text-blue-600" />
//                       ) : (
//                         <Square size={18} />
//                       )}
//                     </button>
//                   </td>
//                 )}

//                 {/* Product */}
//                 <td className="px-4 py-3">
//                   <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
//                       {p.primary_variant?.images?.[0]?.url ? (
//                         <img src={p.primary_variant.images[0].url} alt={p.name} className="w-full h-full object-cover" />
//                       ) : (
//                         <div className="w-full h-full flex items-center justify-center">
//                           <Package size={16} className="text-gray-300" />
//                         </div>
//                       )}
//                     </div>
//                     <div>
//                       <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
//                       <div className="flex items-center gap-2 mt-0.5">
//                         <span className="text-xs font-mono text-gray-400">{p.product_code}</span>
//                         {p.brand_name && <span className="text-xs text-gray-400">· {p.brand_name}</span>}
//                       </div>
//                     </div>
//                   </div>
//                 </td>

//                 {/* Vendor */}
//                 <td className="px-4 py-3">
//                   {p.primary_vendor?.company_name ? (
//                     <div>
//                       <p className="text-sm text-gray-700 font-medium">{p.primary_vendor.company_name}</p>
//                       {p.primary_vendor.city && <p className="text-xs text-gray-400">{p.primary_vendor.city}</p>}
//                     </div>
//                   ) : (
//                     <span className="text-xs text-gray-400">—</span>
//                   )}
//                 </td>

//                 {/* Category */}
//                 <td className="px-4 py-3">
//                   <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
//                     {p.category?.name || getCategoryName(p.category_id)}
//                   </span>
//                 </td>
//                 {/* Pricing */}
//                 <td className="px-4 py-3">
//                   <div className="space-y-0.5">
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs text-gray-400 w-14">MRP</span>
//                       <span className="text-sm font-bold text-red-600">₹{p.mrp?.toLocaleString()}</span>
//                     </div>
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs text-gray-400 w-14">Special</span>
//                       <span className="text-xs font-semibold text-blue-600">₹{p.special_price?.toLocaleString()}</span>
//                     </div>
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs text-gray-400 w-14">Purchase</span>
//                       <span className="text-xs font-semibold text-green-600">₹{p.purchase_price?.toLocaleString()}</span>
//                     </div>
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs text-gray-400 w-14">Expenses</span>
//                       <span className="text-xs text-gray-600">₹{p.expenses?.toLocaleString()}</span>
//                     </div>
//                   </div>
//                 </td>

//                 {/* Variants */}
//                 <td className="px-4 py-3">
//                   <div className="flex flex-col gap-1">
//                     <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${
//                       p.variant_count > 1 ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
//                     }`}>
//                       <Layers size={10} />
//                       {p.variant_count || 1} variant{p.variant_count !== 1 ? "s" : ""}
//                     </span>
//                     {p.primary_variant?.system_barcode && (
//                       <span className="text-xs font-mono text-gray-400">{p.primary_variant.system_barcode}</span>
//                     )}
//                   </div>
//                 </td>

//                 {/* Status */}
//                 <td className="px-4 py-3">
//                   <StatusBadge isActive={p.is_active} />
//                 </td>

//                 {/* Actions */}
//                 <td className="px-4 py-3">
//                   <div className="flex gap-2">
//                     {can("productMs.read") && (
//                   <button
//                     onClick={() => dispatch(openViewModal(p))}
//                     className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                     title="View Details"
//                   >
//                     <Eye size={16} />
//                   </button>
//                 )}
//                     {can("productMs.edit") && (
//                       <button
//                         onClick={() => dispatch(openEditForm(p))}
//                         className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
//                       >
//                         Edit
//                       </button>
//                     )}
//                     {/* Archive button replaces Deactivate */}
//                      {can("productMs.archive") && (
//                         <button
//                           onClick={() => handleArchive(p.product_id, p.name)}
//                           disabled={isDeleting}
//                           className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
//                         >
//                           Archive
//                         </button>
//                       )}
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       {meta.totalPages > 1 && (
//         <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//           <p className="text-sm text-gray-500">
//             Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
//           </p>
//           <div className="flex gap-2">
//             <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
//             <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
//             <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
//           </div>
//         </div>
//       )}

//       {/* Bulk Action Bar */}
//       {selectedProductIds.length > 0 && (
//         <BulkActionBar
//           selectedCount={selectedProductIds.length}
//           selectedProductIds={selectedProductIds}
//           onBulkAction={handleBulkAction}
//         />
//       )}

//       {/* Modals */}
//       {showAddForm && (
//         <ProductAddForm
//           formData={formData} formErrors={formErrors}
//           variants={variants} showVariantModal={showVariantModal}
//           variantForm={variantForm} variantErrors={variantErrors}
//           editingVariantIndex={editingVariantIndex}
//           onSave={handleSaveSuccess}
//         />
//       )}

//       {showEditForm && selectedProduct && (
//         <ProductEditForm
//           formData={formData} formErrors={formErrors}
//           selectedProduct={selectedProduct}
//           showVariantModal={showVariantModal}
//           variantForm={variantForm} variantErrors={variantErrors}
//           editingVariantIndex={editingVariantIndex}
//           onSave={handleSaveSuccess}
//         />
//       )}

//       {showViewModal && selectedProduct && (
//         <ProductView
//           productId={selectedProduct.product_id}
//           onClose={() => dispatch(closeViewModal())}
//         />
//       )}

//       <BulkUploadTab
//         isOpen={showBulkUpload}
//         onClose={() => {
//           setShowBulkUpload(false);
//           refetch();
//         }}
//       />

//       {showCategoryModal && (                 
//         <CategoriesTab onClose={() => setShowCategoryModal(false)} />
//       )}

//     </div>
//   );
// }

// down code is not updated by the new price updates use upper updated and working code 
// import React, { useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { X, Plus, Package, Tag, TrendingUp, Layers, Eye, Upload, FolderPlus, CheckSquare, Square } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//   useGetProductsQuery,
//   useDeleteProductMutation,
//   useBulkUpdateProductsMutation,
//   useBulkArchiveProductsMutation,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
// import CategoriesTab from "../../shared/CategoriesTab/CategoriesTab";
// import { useGetCategoriesQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Category_api/categoryApi";
// import {
//   openAddForm, closeAddForm,
//   openEditForm, closeEditForm,
//   openViewModal, closeViewModal,
//   setSearch, setCategoryFilter, setActiveFilter,
//   setCurrentPage, setPageSize, resetFilters,
//   setSelectedProductIds,
//   clearSelectedProducts,
//   toggleSelectAll,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
// import ProductAddForm from "./ProductShared/ProductAddForm";
// import ProductEditForm from "./ProductShared/ProductEditForm";
// import ProductView from "./ProductShared/ProductView";
// import { CURRENT_USER,can  } from "../../../Components/roles";
// import BulkUploadTab from "./BulkUploadTab/BulkUploadTab";
// import BulkActionBar from "././BulkActionBar/BulkActionBar";

// const StatusBadge = ({ isActive }) => (
//   <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
//     isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
//   }`}>
//     <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
//     {isActive ? "Active" : "Inactive"}
//   </span>
// );

// export default function InventoryTab() {
//   const dispatch = useDispatch();

//   const {
//     showAddForm, showEditForm, showViewModal,
//     formData, formErrors,
//     variants, showVariantModal, variantForm, variantErrors,
//     editingVariantIndex, selectedProduct,
//     search, categoryFilter, activeFilter, currentPage, pageSize,
//     selectedProductIds, // ADD THIS
//   } = useSelector((state) => state.product);

//   const warehouseId = CURRENT_USER.role === "SUPER_ADMIN" ? "" : CURRENT_USER.locationId || "";

//   const { data, isLoading, isFetching, refetch } = useGetProductsQuery({
//     page: currentPage, limit: pageSize,
//     search, category_id: categoryFilter,
//     is_active: activeFilter, warehouse_id: warehouseId,
//   });

//   // ADD THIS - same query, just get all for stats
//   const { data: allData } = useGetProductsQuery({
//     page: 1, limit: 100,  // Get all records
//     search, category_id: categoryFilter,
//     is_active: activeFilter, warehouse_id: warehouseId,
//   }, { skip: false }); // Always fetch

//   const [showBulkUpload, setShowBulkUpload] = useState(false);
//   const [showCategoryModal, setShowCategoryModal] = useState(false);
//   const { data: categoriesData } = useGetCategoriesQuery({ is_active: true, limit: 100 });
//   const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
//   const [bulkUpdate] = useBulkUpdateProductsMutation();
//   const [bulkArchive] = useBulkArchiveProductsMutation();

//   const products = data?.products || [];
//   const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
//   const categories = categoriesData?.categories || [];

//   // Check if all products on current page are selected
//   const allSelectedOnPage = products.length > 0 && 
//     products.every(p => selectedProductIds.includes(p.product_id));
  
//   // Some selected on page
//   const someSelected = products.some(p => selectedProductIds.includes(p.product_id));

// // Then use allData?.products for stats
// const allProducts = allData?.products || [];
// const totalActiveCount = allProducts.filter(p => p.is_active).length;
// const totalMultiVariant = allProducts.filter(p => p.variant_count > 1).length;
// const totalAvgMrp = allProducts.length
//   ? Math.round(allProducts.reduce((s, p) => s + (p.mrp || 0), 0) / allProducts.length)
//   : 0;

//   // ── Handle individual product archive (replaces deactivate) ──
//   const handleArchive = async (productId, name) => {
//     if (!window.confirm(`Archive "${name}"? This will soft delete the product.`)) return;
//     try {
//       await deleteProduct(productId).unwrap();
//       toast.success(`"${name}" archived successfully`);
//       refetch();
//       dispatch(clearSelectedProducts());
//     } catch (err) {
//       toast.error(err?.data?.message || "Failed to archive product");
//     }
//   };

//   // ── Handle bulk actions ──
//   const handleBulkAction = async (action, productIds) => {
//     if (action === "activate") {
//       const items = productIds.map(id => ({ product_id: id, is_active: true }));
//       await bulkUpdate(items).unwrap();
//     } else if (action === "deactivate") {
//       const items = productIds.map(id => ({ product_id: id, is_active: false }));
//       await bulkUpdate(items).unwrap();
//     } else if (action === "archive") {
//       await bulkArchive(productIds).unwrap();
//     }
//     refetch();
//   };

//   // ── Toggle individual product selection ──
//   const toggleSelectProduct = (productId) => {
//     if (selectedProductIds.includes(productId)) {
//       dispatch(setSelectedProductIds(selectedProductIds.filter(id => id !== productId)));
//     } else {
//       dispatch(setSelectedProductIds([...selectedProductIds, productId]));
//     }
//   };

//   // ── Toggle select all on current page ──
//   const handleSelectAll = () => {
//     if (allSelectedOnPage) {
//       // Deselect all on current page
//       const remainingIds = selectedProductIds.filter(id => !products.some(p => p.product_id === id));
//       dispatch(setSelectedProductIds(remainingIds));
//     } else {
//       // Select all on current page
//       const newIds = [...selectedProductIds];
//       products.forEach(p => {
//         if (!newIds.includes(p.product_id)) {
//           newIds.push(p.product_id);
//         }
//       });
//       dispatch(setSelectedProductIds(newIds));
//     }
//   };

//   const handleSaveSuccess = () => {
//     dispatch(closeAddForm());
//     dispatch(closeEditForm());
//     refetch();
//     dispatch(clearSelectedProducts());
//   };

//   const getCategoryName = (id) => categories.find(c => c.category_id === id)?.name || "—";

//   return (
//     <div className="space-y-5">

//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//         <div>
//           <h2 className="text-xl font-bold text-gray-900 tracking-tight">Products & Inventory</h2>
//           <p className="text-sm text-gray-500 mt-1">
//             Manage products, variants, pricing matrices, and master barcode configurations.
//           </p>
//         </div>
        
//         <div className="flex items-center gap-2.5 self-end sm:self-auto">
//           {can("productMs.category_add") && (
//             <button
//               onClick={() => setShowCategoryModal(true)}
//               className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
//             >
//               <FolderPlus size={16} /> Add Category
//             </button>
//           )}
          
//           {can("productMs.bulk_upload") && (
//             <button
//               onClick={() => setShowBulkUpload(true)}
//               className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
//             >
//               <Upload size={16} className="text-gray-500" /> Bulk Upload
//             </button>
//           )}
          
//           {can("productMs.create") && (
//           <button
//             onClick={() => dispatch(openAddForm())}
//             className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
//           >
//             <Plus size={16} /> Add Product
//           </button>
//         )}
//         </div>
//       </div>

//       {/* Stats Cards */}
//       {/* Stats Cards */}
// <div className="grid grid-cols-4 gap-4">
//   <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Total Products</p>
//       <Package size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">{allProducts.length}</p>
//     <p className="text-xs opacity-60 mt-1">matching filters</p>
//   </div>
//   <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Active</p>
//       <Tag size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">{allProducts.filter(p => p.is_active).length}</p>
//     <p className="text-xs opacity-60 mt-1">total in system</p>
//   </div>
//   <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Multi-Variant</p>
//       <Layers size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">{allProducts.filter(p => p.variant_count > 1).length}</p>
//     <p className="text-xs opacity-60 mt-1">total in system</p>
//   </div>
//   <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
//     <div className="flex items-center justify-between mb-2">
//       <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Avg MRP</p>
//       <TrendingUp size={16} className="opacity-60" />
//     </div>
//     <p className="text-3xl font-bold">
//       ₹{allProducts.length 
//         ? Math.round(allProducts.reduce((s, p) => s + (p.mrp || 0), 0) / allProducts.length).toLocaleString() 
//         : 0}
//     </p>
//     <p className="text-xs opacity-60 mt-1">across all products</p>
//   </div>
// </div>

//       {/* Filters */}
//       <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
//         <div className="flex gap-3">
//           <input
//             value={search}
//             onChange={(e) => dispatch(setSearch(e.target.value))}
//             placeholder="Search by product name or code…"
//             className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           <button
//             onClick={() => dispatch(resetFilters())}
//             className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
//           >
//             <X size={14} /> Clear
//           </button>
//         </div>
//         <div className="flex gap-3 flex-wrap">
//           <select
//             value={categoryFilter}
//             onChange={(e) => dispatch(setCategoryFilter(e.target.value))}
//             className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="">All Categories</option>
//             {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
//           </select>
//           <select
//             value={activeFilter}
//             onChange={(e) => dispatch(setActiveFilter(e.target.value))}
//             className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="">All Status</option>
//             <option value="true">Active</option>
//             <option value="false">Inactive</option>
//           </select>
//           <select
//             value={pageSize}
//             onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//             className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 ml-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//           </select>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//         <table className="w-full text-sm">
//           <thead className="bg-gray-50 border-b border-gray-100">
//             <tr>
//               {/* Checkbox column */}
//               {/* Bulk select checkbox column — only show if user can perform bulk actions */}
//             {(can("productMs.edit") || can("productMs.archive")) && (
//               <th className="px-4 py-3 w-10">
//                 <button
//                   onClick={handleSelectAll}
//                   className="text-gray-500 hover:text-blue-600 transition-colors"
//                 >
//                   {allSelectedOnPage ? (
//                     <CheckSquare size={18} />
//                   ) : someSelected ? (
//                     <Square size={18} className="text-blue-500" />
//                   ) : (
//                     <Square size={18} />
//                   )}
//                 </button>
//               </th>
//             )}
//               {["Product", "Vendor", "Category", "Pricing", "Variants", "Status", "Actions"].map(h => (
//                 <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
//                   {h}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-50">

//             {(isLoading || isFetching) && (
//               <tr><td colSpan={8} className="px-4 py-10 text-center">
//                 <div className="flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
//               </td></tr>
//             )}

//             {!isLoading && !isFetching && products.length === 0 && (
//               <tr><td colSpan={8} className="px-4 py-14 text-center">
//                 <div className="flex flex-col items-center gap-2">
//                   <Package size={32} className="text-gray-300" />
//                   <p className="text-gray-400 text-sm">No products found</p>
//                   <button onClick={() => dispatch(openAddForm())} className="text-blue-600 text-xs font-medium hover:underline cursor-pointer">Add your first product</button>
//                 </div>
//               </td></tr>
//             )}

//             {!isLoading && products.map(p => (
//               <tr key={p.product_id} className="hover:bg-gray-50 transition-colors">
//                 {/* Checkbox */}
//                 {/* Row checkbox — only show if user can perform bulk actions */}
//                 {(can("productMs.edit") || can("productMs.archive")) && (
//                   <td className="px-4 py-3">
//                     <button
//                       onClick={() => toggleSelectProduct(p.product_id)}
//                       className="text-gray-400 hover:text-blue-600 transition-colors"
//                     >
//                       {selectedProductIds.includes(p.product_id) ? (
//                         <CheckSquare size={18} className="text-blue-600" />
//                       ) : (
//                         <Square size={18} />
//                       )}
//                     </button>
//                   </td>
//                 )}

//                 {/* Product */}
//                 <td className="px-4 py-3">
//                   <div className="flex items-center gap-3">
//                     <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
//                       {p.primary_variant?.images?.[0]?.url ? (
//                         <img src={p.primary_variant.images[0].url} alt={p.name} className="w-full h-full object-cover" />
//                       ) : (
//                         <div className="w-full h-full flex items-center justify-center">
//                           <Package size={16} className="text-gray-300" />
//                         </div>
//                       )}
//                     </div>
//                     <div>
//                       <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
//                       <div className="flex items-center gap-2 mt-0.5">
//                         <span className="text-xs font-mono text-gray-400">{p.product_code}</span>
//                         {p.brand_name && <span className="text-xs text-gray-400">· {p.brand_name}</span>}
//                       </div>
//                     </div>
//                   </div>
//                 </td>

//                 {/* Vendor */}
//                 <td className="px-4 py-3">
//                   {p.primary_vendor?.company_name ? (
//                     <div>
//                       <p className="text-sm text-gray-700 font-medium">{p.primary_vendor.company_name}</p>
//                       {p.primary_vendor.city && <p className="text-xs text-gray-400">{p.primary_vendor.city}</p>}
//                     </div>
//                   ) : (
//                     <span className="text-xs text-gray-400">—</span>
//                   )}
//                 </td>

//                 {/* Category */}
//                 <td className="px-4 py-3">
//                   <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
//                     {p.category?.name || getCategoryName(p.category_id)}
//                   </span>
//                 </td>

//                 {/* Pricing */}
//                 <td className="px-4 py-3">
//                   <div className="space-y-0.5">
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs text-gray-400 w-14">MRP</span>
//                       <span className="text-sm font-bold text-red-600">₹{p.mrp?.toLocaleString()}</span>
//                     </div>
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs text-gray-400 w-14">Wholesale</span>
//                       <span className="text-xs font-semibold text-green-600">₹{p.wholesale_price?.toLocaleString()}</span>
//                     </div>
//                     <div className="flex items-center gap-1.5">
//                       <span className="text-xs text-gray-400 w-14">Retail</span>
//                       <span className="text-xs font-semibold text-blue-600">₹{p.retail_price?.toLocaleString()}</span>
//                     </div>
//                   </div>
//                 </td>

//                 {/* Variants */}
//                 <td className="px-4 py-3">
//                   <div className="flex flex-col gap-1">
//                     <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${
//                       p.variant_count > 1 ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
//                     }`}>
//                       <Layers size={10} />
//                       {p.variant_count || 1} variant{p.variant_count !== 1 ? "s" : ""}
//                     </span>
//                     {p.primary_variant?.system_barcode && (
//                       <span className="text-xs font-mono text-gray-400">{p.primary_variant.system_barcode}</span>
//                     )}
//                   </div>
//                 </td>

//                 {/* Status */}
//                 <td className="px-4 py-3">
//                   <StatusBadge isActive={p.is_active} />
//                 </td>

//                 {/* Actions */}
//                 <td className="px-4 py-3">
//                   <div className="flex gap-2">
//                     {can("productMs.read") && (
//                   <button
//                     onClick={() => dispatch(openViewModal(p))}
//                     className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                     title="View Details"
//                   >
//                     <Eye size={16} />
//                   </button>
//                 )}
//                     {can("productMs.edit") && (
//                       <button
//                         onClick={() => dispatch(openEditForm(p))}
//                         className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
//                       >
//                         Edit
//                       </button>
//                     )}
//                     {/* Archive button replaces Deactivate */}
//                      {can("productMs.archive") && (
//                         <button
//                           onClick={() => handleArchive(p.product_id, p.name)}
//                           disabled={isDeleting}
//                           className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
//                         >
//                           Archive
//                         </button>
//                       )}
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       {meta.totalPages > 1 && (
//         <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//           <p className="text-sm text-gray-500">
//             Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
//           </p>
//           <div className="flex gap-2">
//             <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
//             <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
//             <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
//           </div>
//         </div>
//       )}

//       {/* Bulk Action Bar */}
//       {selectedProductIds.length > 0 && (
//         <BulkActionBar
//           selectedCount={selectedProductIds.length}
//           selectedProductIds={selectedProductIds}
//           onBulkAction={handleBulkAction}
//         />
//       )}

//       {/* Modals */}
//       {showAddForm && (
//         <ProductAddForm
//           formData={formData} formErrors={formErrors}
//           variants={variants} showVariantModal={showVariantModal}
//           variantForm={variantForm} variantErrors={variantErrors}
//           editingVariantIndex={editingVariantIndex}
//           onSave={handleSaveSuccess}
//         />
//       )}

//       {showEditForm && selectedProduct && (
//         <ProductEditForm
//           formData={formData} formErrors={formErrors}
//           selectedProduct={selectedProduct}
//           showVariantModal={showVariantModal}
//           variantForm={variantForm} variantErrors={variantErrors}
//           editingVariantIndex={editingVariantIndex}
//           onSave={handleSaveSuccess}
//         />
//       )}

//       {showViewModal && selectedProduct && (
//         <ProductView
//           productId={selectedProduct.product_id}
//           onClose={() => dispatch(closeViewModal())}
//         />
//       )}

//       <BulkUploadTab
//         isOpen={showBulkUpload}
//         onClose={() => {
//           setShowBulkUpload(false);
//           refetch();
//         }}
//       />

//       {showCategoryModal && (                 
//         <CategoriesTab onClose={() => setShowCategoryModal(false)} />
//       )}

//     </div>
//   );
// }