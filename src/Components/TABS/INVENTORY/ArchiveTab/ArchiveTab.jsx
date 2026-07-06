import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "../../../shared/ToastConfig";
import { Package, Eye, RotateCcw, Trash2, AlertTriangle, X, Square, CheckSquare } from "lucide-react";
import {
  useGetInactiveProductsQuery,
  useBulkRestoreProductsMutation,
  useHardDeleteProductsMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
import {
  openViewModal,
  closeViewModal,
  setSearch,
  setCurrentPage,
  setPageSize,
  resetFilters,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
import ProductView from "../ProductShared/ProductView";
import { can, CURRENT_USER } from "../../../roles";

export default function ArchiveTab() {
  const dispatch = useDispatch();
  const {
    showViewModal,
    selectedProduct,
    search,
    currentPage,
    pageSize,
  } = useSelector((state) => state.product);

  const warehouseId = CURRENT_USER.role === "SUPER_ADMIN" ? "" : CURRENT_USER.locationId || "";
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useGetInactiveProductsQuery({
    page: currentPage,
    limit: pageSize,
    search,
    warehouse_id: warehouseId,
  });

  const [bulkRestore, { isLoading: isRestoring }] = useBulkRestoreProductsMutation();
  const [hardDeleteProducts, { isLoading: isDeleting }] = useHardDeleteProductsMutation();

  const products = data?.products || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const allSelectedOnPage = products.length > 0 && products.every(p => selectedProductIds.includes(p.product_id));
  const canPermanentDelete = can("product.permanent_delete");

  const toggleSelectProduct = (productId) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const handleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map(p => p.product_id));
    }
  };

  const handleSingleRestore = async (productId) => {
    if (!window.confirm("Restore this product from archive?")) return;
    try {
      await bulkRestore([productId]).unwrap();
      toast.success("Product restored successfully");
      refetch();
      setSelectedProductIds([]);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to restore product");
    }
  };

  const handleBulkRestore = async () => {
    if (selectedProductIds.length === 0) {
      toast.warning("No products selected");
      return;
    }

    if (!window.confirm(`Restore ${selectedProductIds.length} product(s) from archive?`)) return;

    try {
      await bulkRestore(selectedProductIds).unwrap();
      toast.success(`${selectedProductIds.length} product(s) restored successfully`);
      refetch();
      setSelectedProductIds([]);
      setIsDropdownOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to restore products");
    }
  };

  const handlePermanentDelete = async (productIds = selectedProductIds) => {
    if (!productIds.length) {
      toast.warning("Select archived products to permanently delete");
      return;
    }

    if (!window.confirm(
      `Permanently delete ${productIds.length} selected product(s)?\n\nThis removes them from the warehouse catalog and shop stock. This cannot be undone.`
    )) {
      return;
    }

    try {
      const result = await hardDeleteProducts(productIds).unwrap();
      toast.success(`${result.deleted} product(s) permanently deleted`);
      refetch();
      setSelectedProductIds([]);
      setIsDropdownOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete products");
    }
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
  };

  return (
    <div className="space-y-5">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">Archive Zone</h3>
            <p className="text-sm text-red-600">
              Archived products are inactive in inventory. Restore them or permanently delete selected items.
              Products with billing or purchase history cannot be permanently deleted.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-600 space-y-3">
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            placeholder="Search archived products..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={() => {
              dispatch(resetFilters());
              dispatch(setSearch(""));
              setSelectedProductIds([]);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <X size={14} /> Clear
          </button>
        </div>

        <div className="flex justify-between items-center">
          <select
            value={pageSize}
            onChange={(e) => {
              dispatch(setPageSize(Number(e.target.value)));
              setSelectedProductIds([]);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
          </select>

          {canPermanentDelete && selectedProductIds.length > 0 && (
            <button
              onClick={() => handlePermanentDelete()}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Delete {selectedProductIds.length} Selected Permanently
            </button>
          )}
        </div>
      </div>

      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-600 text-white rounded-xl shadow-2xl border border-gray-700 px-4 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedProductIds.length} product{selectedProductIds.length !== 1 ? "s" : ""} selected
            </span>
            <div className="w-px h-6 bg-gray-700" />

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm"
              >
                Bulk Actions
                <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
                    <button onClick={handleBulkRestore} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50">
                      <RotateCcw size={16} /> Restore Selected
                    </button>

                    {canPermanentDelete && (
                      <>
                        <div className="border-t border-gray-100" />
                        <button
                          onClick={() => handlePermanentDelete()}
                          disabled={isDeleting}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={16} /> Delete Permanently
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <button onClick={clearSelection} className="p-1.5 hover:bg-blue-700 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl text-gray-700 border border-gray-200 overflow-hidden">
        <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-10">
                {products.length > 0 && (
                  <button onClick={handleSelectAll} className="text-gray-700 hover:text-red-600">
                    {allSelectedOnPage ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                )}
              </th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Last Updated</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(isLoading || isFetching) && (
              <tr><td colSpan={5} className="text-center py-10">Loading...</td></tr>
            )}

            {!isLoading && products.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">No archived products found</td></tr>
            )}

            {!isLoading && products.map((p) => (
              <tr key={p.product_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button onClick={() => toggleSelectProduct(p.product_id)}>
                    {selectedProductIds.includes(p.product_id) ?
                      <CheckSquare size={18} className="text-red-600" /> :
                      <Square size={18} />
                    }
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.product_code}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Archived
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => dispatch(openViewModal(p))}
                      className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleSingleRestore(p.product_id)}
                      disabled={isRestoring}
                      className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg"
                    >
                      <RotateCcw size={12} className="inline mr-1" /> Restore
                    </button>
                    {canPermanentDelete && (
                      <button
                        onClick={() => handlePermanentDelete([p.product_id])}
                        disabled={isDeleting}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
                      >
                        <Trash2 size={12} className="inline mr-1" /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                dispatch(setCurrentPage(currentPage - 1));
                setSelectedProductIds([]);
              }}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">{currentPage} / {meta.totalPages}</span>
            <button
              onClick={() => {
                dispatch(setCurrentPage(currentPage + 1));
                setSelectedProductIds([]);
              }}
              disabled={currentPage === meta.totalPages}
              className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showViewModal && selectedProduct && (
        <ProductView productId={selectedProduct.product_id} onClose={() => dispatch(closeViewModal())} />
      )}
    </div>
  );
}
