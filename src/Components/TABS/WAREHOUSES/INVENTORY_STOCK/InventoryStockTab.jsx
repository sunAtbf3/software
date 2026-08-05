
// TABS/WAREHOUSES/INVENTORY_STOCK/InventoryStockTab.jsx
//
// Complete stock management with:
// - Read-only view (default)
// - Edit stock (location, batch, expiry, threshold)
// - Adjust quantity (with reason, auto ledger entry)
// - Delete stock (hard delete with confirmation)
// - Bulk select + bulk update location + bulk delete
// - Manual stock creation (POST /product-stocks)
// - One row per variant (qty summed); expand to see per-batch stock records
// - Last inward date + last vendor from most recent purchase on that SKU
 
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { 
    X, Package, TrendingUp, AlertTriangle, Box, Calendar, 
    MapPin, Hash, Layers, Edit2, Trash2, Plus, CheckSquare, 
    Square, Move, AlertCircle, ChevronDown, ChevronRight
} from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { 
    useGetProductStocksQuery, 
    useGetAllProductStocksQuery,
    useDeleteStockMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockApi";
import { useGetCategoriesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Category_api/categoryApi";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import {
    setSearch,
    setWarehouseFilter,
    setCategoryFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openEditModal,
    openQuantityModal,
    openManualAddModal,
    toggleSelectStock,
    selectAllStocks,
    clearSelectedStocks,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockSlice";
import { CURRENT_USER } from "../../../roles";
import StockEditModal from "./StockEditModal";
import StockQuantityModal from "./StockQuantityModal";
import StockManualAddModal from "./StockManualAddModal";
import StockBulkActionBar from "./StockBulkActionBar";
 
// ── Helper Functions ───────────────────────────────────────────────────
 
const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric" 
    });
};
 
const getStockStatus = (quantity, threshold) => {
    if (quantity === 0) return { label: "Out of stock", color: "bg-red-50 text-red-600 border border-red-200", icon: "🔴" };
    if (quantity <= threshold) return { label: "Low stock", color: "bg-orange-50 text-orange-700 border border-orange-200", icon: "⚠️" };
    return { label: "In stock", color: "bg-green-50 text-green-700 border border-green-200", icon: "✅" };
};
 
const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
};
 
const variantExpandKey = (stock) =>
    stock.aggregate_key || `${stock.warehouse_id}:${stock.variant_id}`;

/** Resolve a concrete batch row for edit/qty modals when the list row is variant-aggregated. */
const resolveActionStockRow = (row) => {
    if (row?.batch_records?.length) {
        const id = row.primary_stock_id || row.stock_id;
        return row.batch_records.find((b) => b.stock_id === id) || row.batch_records[0];
    }
    return row;
};

// ── Format variant attributes array correctly ──────────────────────────
const fmtAttributes = (attributes) => {
    if (Array.isArray(attributes) && attributes.length > 0) {
        return attributes.map((a) => `${a.key}: ${a.value}`).join(", ");
    }
    return null;
};
 
export default function InventoryStockTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
 
    const {
        search,
        warehouseFilter,
        categoryFilter,
        currentPage,
        pageSize,
        selectedStockIds,
        showEditModal,
        showQuantityModal,
        showManualAddModal,
    } = useSelector((state) => state.stock);
 
    const [expandedVariants, setExpandedVariants] = useState({});
 
    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const isWHRole = ["WH_MANAGER", "WH_STOCK_LISTER"].includes(user?.role);
    const userWarehouseId = user?.warehouse_id || "";
 
    // Effective warehouse filter
    const effectiveWarehouseId = isSuperAdmin ? warehouseFilter : userWarehouseId;
 
    // ── Queries ─────────────────────────────────────────────────────────
    const { data, isLoading, isFetching, refetch } = useGetProductStocksQuery({
        page: currentPage,
        limit: pageSize,
        search,
        warehouse_id: effectiveWarehouseId,
    });
 
    const { data: allStocks, refetch: refetchAll } = useGetAllProductStocksQuery({
        warehouse_id: effectiveWarehouseId,
    });
 
    const { data: categoriesData } = useGetCategoriesQuery({ is_active: true, limit: 100 });
    const { data: warehousesData } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }
    );
 
    const [deleteStock] = useDeleteStockMutation();
 
    const stocks = data?.stocks || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1, stats: null };
    const warehouseStats = meta.stats;
    const categories = categoriesData?.categories || [];
    const warehouses = warehousesData?.warehouses || [];
    const allStockList = allStocks || [];
 
    const totalSKUs = warehouseStats?.sku_count ?? allStockList.length;
    const totalUnits = warehouseStats?.total_units ?? allStockList.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const lowStockCount = warehouseStats?.low_stock_count ?? allStockList.filter((s) => s.quantity > 0 && s.quantity <= (s.low_stock_threshold || 10)).length;
    const outOfStockCount = warehouseStats?.out_of_stock_count ?? allStockList.filter((s) => s.quantity === 0).length;
 
    // ── Selection (still based on flat stocks array — grouping is visual only) ──
    const allSelectedOnPage = stocks.length > 0 && 
        stocks.every(s => selectedStockIds.includes(s.stock_id));
    const someSelected = stocks.some(s => selectedStockIds.includes(s.stock_id));
 
    // ── Handle Select All ───────────────────────────────────────────────
    const handleSelectAll = () => {
        const currentStockIds = stocks.map(s => s.stock_id);
        if (allSelectedOnPage) {
            const remainingIds = selectedStockIds.filter(id => !currentStockIds.includes(id));
            dispatch(selectAllStocks({ stockIds: remainingIds, isSelected: false }));
        } else {
            const newIds = [...new Set([...selectedStockIds, ...currentStockIds])];
            dispatch(selectAllStocks({ stockIds: newIds, isSelected: true }));
        }
    };
 
    const toggleExpand = (key) => {
        setExpandedVariants((prev) => ({ ...prev, [key]: !prev[key] }));
    };
 
    // ── Handle Individual Delete ────────────────────────────────────────
    const handleDeleteStock = async (stockId, productName) => {
        if (!window.confirm(`⚠️ Delete stock for "${productName}"?\n\nThis is a HARD DELETE. The stock record will be permanently removed. Stock ledger entry will be created automatically.\n\nThis action cannot be undone.`)) {
            return;
        }
        
        try {
            await deleteStock(stockId).unwrap();
            toast.success(`Stock for "${productName}" deleted successfully`);
            refetch();
            refetchAll();
            dispatch(clearSelectedStocks());
        } catch (err) {
            toast.error(err?.data?.message || "Failed to delete stock");
        }
    };
 
    // ── Handle Refresh ──────────────────────────────────────────────────
    const handleRefresh = () => {
        refetch();
        refetchAll();
        dispatch(clearSelectedStocks());
    };
 
    const renderStockRow = (stock, { isChild = false, isVariantSummary = false, expandKey = "", canExpand = false, isExpanded = false } = {}) => {
        const product = stock.variant?.product || {};
        const variant = stock.variant || {};
        const status = getStockStatus(stock.quantity, stock.low_stock_threshold);
        const location = [stock.room_zone, stock.rack_shelf, stock.position]
            .filter(Boolean).join(" / ") || "—";
        const attrStr = fmtAttributes(variant.attributes);
        const variantLabel = attrStr || variant.sku || variant.system_barcode || "—";
        const expiringSoon = isExpiringSoon(stock.expiry_date);
        const isSelected = selectedStockIds.includes(stock.stock_id);
        const actionRow = isVariantSummary ? resolveActionStockRow(stock) : stock;
        const batchLabel = isVariantSummary
            ? (stock.batch_count > 1 ? `${stock.batch_count} batches` : (stock.batch_records?.[0]?.batch_number || "—"))
            : (stock.batch_number || "—");
        const lastVendor = stock.last_vendor_name || stock.last_purchase?.vendor?.company_name || "—";

        return (
            <tr
                key={isVariantSummary ? expandKey : stock.stock_id}
                className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : "bg-white"} ${isChild ? "border-l-2 border-l-indigo-200" : ""}`}
            >
                <td className="px-2 py-3 w-8">
                    {isVariantSummary && canExpand && (
                        <button
                            onClick={() => toggleExpand(expandKey)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title={isExpanded ? "Collapse batches" : "Expand batch breakdown"}
                        >
                            {isExpanded
                                ? <ChevronDown size={15} className="text-gray-500" />
                                : <ChevronRight size={15} className="text-gray-500" />
                            }
                        </button>
                    )}
                    {isChild && <span className="w-6 inline-block" />}
                </td>

                <td className="px-3 py-3">
                    <button
                        onClick={() => dispatch(toggleSelectStock(stock.stock_id))}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        {isSelected
                            ? <CheckSquare size={18} className="text-blue-600" />
                            : <Square size={18} />
                        }
                    </button>
                </td>

                <td className="px-4 py-3 min-w-[130px]">
                    {!isChild ? (
                        <div>
                            <p className="font-semibold text-gray-800 text-sm leading-tight">{product.name || "—"}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-0.5">{product.product_code || "—"}</p>
                            {isVariantSummary && stock.batch_count > 1 && (
                                <span className="inline-block mt-1 text-[10px] font-medium text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                                    {stock.batch_count} batches
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-300 pl-2">↳ batch</span>
                    )}
                </td>

                <td className="px-4 py-3 min-w-[110px]">
                    {!isChild ? (
                        <div>
                            <p className="text-xs text-gray-700">{variantLabel}</p>
                            {variant.sku && (
                                <p className="text-xs font-mono text-gray-500 mt-0.5">SKU: {variant.sku}</p>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 font-mono">{stock.batch_number || "—"}</span>
                    )}
                </td>

                <td className="px-4 py-3 text-right">
                    <span className="font-bold text-gray-800">{stock.quantity}</span>
                </td>

                <td className="px-4 py-3 min-w-[110px]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <span>{status.icon}</span> {status.label}
                    </span>
                </td>

                <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{batchLabel}</span>
                </td>

                <td className="px-4 py-3 min-w-[90px]">
                    {stock.expiry_date ? (
                        <div className="flex items-center gap-1">
                            <span className={`text-xs ${expiringSoon ? "text-orange-600 font-semibold" : "text-gray-400"}`}>
                                {fmtDate(stock.expiry_date)}
                            </span>
                            {expiringSoon && <AlertCircle size={12} className="text-orange-500" />}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400">—</span>
                    )}
                </td>

                <td className="px-4 py-3 min-w-[100px]">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} className="shrink-0" />
                        <span title={stock.position || ""}>{location}</span>
                    </div>
                </td>

                <td className="px-4 py-3 min-w-[90px]">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={12} className="shrink-0" />
                        <span>{fmtDate(stock.last_purchase_date)}</span>
                    </div>
                </td>

                <td className="px-4 py-3 min-w-[100px]">
                    <span className="text-xs text-gray-600">{isVariantSummary ? lastVendor : "—"}</span>
                </td>

                <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                        <button
                            onClick={() => dispatch(openEditModal(actionRow))}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Edit Stock Details"
                        >
                            <Edit2 size={15} />
                        </button>
                        <button
                            onClick={() => dispatch(openQuantityModal(actionRow))}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Adjust Quantity"
                        >
                            <Move size={15} />
                        </button>
                        <button
                            onClick={() => handleDeleteStock(stock.stock_id, product.name)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition-colors"
                            title="Delete Stock (Hard Delete)"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };
 
    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
 
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Current Stock Levels</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Manage warehouse stock — edit location, adjust quantity, or delete stock records
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => dispatch(openManualAddModal())}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={14} /> Add Stock
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>
 
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Total SKUs</p>
                    <p className="text-3xl font-bold text-gray-800">{totalSKUs}</p>
                    <p className="text-xs text-gray-400 mt-1">unique variant+warehouse combos</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Total Units</p>
                    <p className="text-3xl font-bold text-gray-800">{totalUnits.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">across all SKUs</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Low Stock</p>
                    <p className="text-3xl font-bold text-gray-800">{lowStockCount}</p>
                    <p className="text-xs text-gray-400 mt-1">below threshold</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Out of Stock</p>
                    <p className="text-3xl font-bold text-gray-800">{outOfStockCount}</p>
                    <p className="text-xs text-gray-400 mt-1">zero quantity</p>
                </div>
            </div>
 
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex gap-3">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search product, SKU, barcode, batch, location..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button
                        onClick={() => dispatch(resetFilters())}
                        className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {/* Warehouse Filter - SUPER_ADMIN only */}
                    {isSuperAdmin && (
                        <select
                            value={warehouseFilter}
                            onChange={(e) => dispatch(setWarehouseFilter(e.target.value))}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                        >
                            <option value="">All Warehouses</option>
                            {warehouses.map(w => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.warehouse_name} — {w.city}
                                </option>
                            ))}
                        </select>
                    )}
 
                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => dispatch(setCategoryFilter(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                            <option key={c.category_id} value={c.category_id}>{c.name}</option>
                        ))}
                    </select>
 
                    {/* Page Size */}
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 ml-auto focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                    >
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>
 
            {/* Bulk Action Bar */}
            {selectedStockIds.length > 0 && (
                <StockBulkActionBar
                    selectedCount={selectedStockIds.length}
                    selectedStockIds={selectedStockIds}
                    onClearSelection={() => dispatch(clearSelectedStocks())}
                    onSuccess={() => {
                        refetch();
                        refetchAll();
                        dispatch(clearSelectedStocks());
                    }}
                />
            )}
 
            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory Stock</span>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{meta.total} SKUs</span>
                </div>
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {/* Expand chevron column */}
                            <th className="px-2 py-3 w-8" />
                            {/* Checkbox column */}
                            <th className="px-3 py-3 w-10">
                                {stocks.length > 0 && (
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-gray-500 hover:text-blue-600 transition-colors"
                                    >
                                        {allSelectedOnPage ? (
                                            <CheckSquare size={18} />
                                        ) : someSelected ? (
                                            <Square size={18} className="text-blue-500" />
                                        ) : (
                                            <Square size={18} />
                                        )}
                                    </button>
                                )}
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Product</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Variant</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Qty</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Status</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Batch</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Expiry</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Location</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Last Inward</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Last Vendor</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
 
                        {(isLoading || isFetching) && (
                            <tr>
                                <td colSpan={12} className="px-4 py-10 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    </div>
                                </td>
                            </tr>
                        )}
 
                        {!isLoading && !isFetching && stocks.length === 0 && (
                            <tr>
                                <td colSpan={12} className="px-4 py-14 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Package size={32} className="text-gray-300" />
                                        <p className="text-sm text-gray-400">No stock records found</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Stock is created automatically when inwards are marked MAPPED,
                                            or you can manually add stock using the "Add Stock" button.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
 
                        {!isLoading && !isFetching && stocks.map((stock) => {
                            const key = variantExpandKey(stock);
                            const canExpand = (stock.batch_count || 0) > 1;
                            const isExpanded = !!expandedVariants[key];

                            return (
                                <React.Fragment key={key}>
                                    {renderStockRow(stock, {
                                        isVariantSummary: true,
                                        expandKey: key,
                                        canExpand,
                                        isExpanded,
                                    })}
                                    {canExpand && isExpanded && (stock.batch_records || []).map((batch) =>
                                        renderStockRow(batch, { isChild: true })
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
 
            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <p className="text-xs text-gray-400">
                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
                    </p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">{currentPage} / {meta.totalPages}</span>
                        <button
                            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                            disabled={currentPage === meta.totalPages}
                            className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
 
            {/* Modals */}
            {showEditModal && <StockEditModal onSuccess={handleRefresh} />}
            {showQuantityModal && <StockQuantityModal onSuccess={handleRefresh} />}
            {showManualAddModal && <StockManualAddModal onSuccess={handleRefresh} />}
 
        </div>
    );
}

// down code is working but we give the same power to each varient plus expandable 
// // TABS/WAREHOUSES/INVENTORY_STOCK/InventoryStockTab.jsx
// //
// // Complete stock management with:
// // - Read-only view (default)
// // - Edit stock (location, batch, expiry, threshold)
// // - Adjust quantity (with reason, auto ledger entry)
// // - Delete stock (hard delete with confirmation)
// // - Bulk select + bulk update location + bulk delete
// // - Manual stock creation (POST /product-stocks)

// import React, { useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { 
//     X, Package, TrendingUp, AlertTriangle, Box, Calendar, 
//     MapPin, Hash, Layers, Edit2, Trash2, Plus, CheckSquare, 
//     Square, Move, AlertCircle 
// } from "lucide-react";
// import { toast } from "react-toastify";
// import { 
//     useGetProductStocksQuery, 
//     useGetAllProductStocksQuery,
//     useDeleteStockMutation,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockApi";
// import { useGetCategoriesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Category_api/categoryApi";
// import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
// import {
//     setSearch,
//     setWarehouseFilter,
//     setCategoryFilter,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openEditModal,
//     openQuantityModal,
//     openManualAddModal,
//     toggleSelectStock,
//     selectAllStocks,
//     clearSelectedStocks,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockSlice";
// import { CURRENT_USER } from "../../../roles";
// import StockEditModal from "./StockEditModal";
// import StockQuantityModal from "./StockQuantityModal";
// import StockManualAddModal from "./StockManualAddModal";
// import StockBulkActionBar from "./StockBulkActionBar";

// // ── Helper Functions ───────────────────────────────────────────────────

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { 
//         day: "2-digit", 
//         month: "short", 
//         year: "numeric" 
//     });
// };

// const getStockStatus = (quantity, threshold) => {
//     if (quantity === 0) return { label: "Out of stock", color: "bg-red-50 text-red-600 border border-red-200", icon: "🔴" };
//     if (quantity <= threshold) return { label: "Low stock", color: "bg-orange-50 text-orange-700 border border-orange-200", icon: "⚠️" };
//     return { label: "In stock", color: "bg-green-50 text-green-700 border border-green-200", icon: "✅" };
// };

// const isExpiringSoon = (expiryDate) => {
//     if (!expiryDate) return false;
//     const today = new Date();
//     const expiry = new Date(expiryDate);
//     const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
//     return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
// };

// export default function InventoryStockTab() {
//     const dispatch = useDispatch();
//     const { user } = useSelector((state) => state.auth);

//     const {
//         search,
//         warehouseFilter,
//         categoryFilter,
//         currentPage,
//         pageSize,
//         selectedStockIds,
//         showEditModal,
//         showQuantityModal,
//         showManualAddModal,
//     } = useSelector((state) => state.stock);

//     const isSuperAdmin = user?.role === "SUPER_ADMIN";
//     const isWHRole = ["WH_MANAGER", "WH_STOCK_LISTER"].includes(user?.role);
//     const userWarehouseId = user?.warehouse_id || "";

//     // Effective warehouse filter
//     const effectiveWarehouseId = isSuperAdmin ? warehouseFilter : userWarehouseId;

//     // ── Queries ─────────────────────────────────────────────────────────
//     const { data, isLoading, isFetching, refetch } = useGetProductStocksQuery({
//         page: currentPage,
//         limit: pageSize,
//         search,
//         warehouse_id: effectiveWarehouseId,
//     });

//     const { data: allStocks, refetch: refetchAll } = useGetAllProductStocksQuery({
//         warehouse_id: effectiveWarehouseId,
//     });

//     const { data: categoriesData } = useGetCategoriesQuery({ is_active: true, limit: 100 });
//     const { data: warehousesData } = useGetWarehousesQuery(
//         { page: 1, limit: 100, is_active: "true" },
//         { skip: !isSuperAdmin }
//     );

//     const [deleteStock] = useDeleteStockMutation();

//     const stocks = data?.stocks || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
//     const categories = categoriesData?.categories || [];
//     const warehouses = warehousesData?.warehouses || [];
//     const allStockList = allStocks || [];

//     // ── Stats Calculations ──────────────────────────────────────────────
//     const totalSKUs = allStockList.length;
//     const totalUnits = allStockList.reduce((sum, s) => sum + (s.quantity || 0), 0);
//     const lowStockCount = allStockList.filter(s => s.quantity > 0 && s.quantity <= (s.low_stock_threshold || 10)).length;
//     const outOfStockCount = allStockList.filter(s => s.quantity === 0).length;

//     // ── Check if all stocks on current page are selected ────────────────
//     const allSelectedOnPage = stocks.length > 0 && 
//         stocks.every(s => selectedStockIds.includes(s.stock_id));
//     const someSelected = stocks.some(s => selectedStockIds.includes(s.stock_id));

//     // ── Handle Select All ───────────────────────────────────────────────
//     const handleSelectAll = () => {
//         const currentStockIds = stocks.map(s => s.stock_id);
//         if (allSelectedOnPage) {
//             // Deselect all on current page
//             const remainingIds = selectedStockIds.filter(id => !currentStockIds.includes(id));
//             dispatch(selectAllStocks({ stockIds: remainingIds, isSelected: false }));
//         } else {
//             // Select all on current page (merge with existing selections)
//             const newIds = [...new Set([...selectedStockIds, ...currentStockIds])];
//             dispatch(selectAllStocks({ stockIds: newIds, isSelected: true }));
//         }
//     };

//     // ── Handle Individual Delete ────────────────────────────────────────
//     const handleDeleteStock = async (stockId, productName) => {
//         if (!window.confirm(`⚠️ Delete stock for "${productName}"?\n\nThis is a HARD DELETE. The stock record will be permanently removed. Stock ledger entry will be created automatically.\n\nThis action cannot be undone.`)) {
//             return;
//         }
        
//         try {
//             await deleteStock(stockId).unwrap();
//             toast.success(`Stock for "${productName}" deleted successfully`);
//             refetch();
//             refetchAll();
//             dispatch(clearSelectedStocks());
//         } catch (err) {
//             toast.error(err?.data?.message || "Failed to delete stock");
//         }
//     };

//     // ── Handle Refresh ──────────────────────────────────────────────────
//     const handleRefresh = () => {
//         refetch();
//         refetchAll();
//         dispatch(clearSelectedStocks());
//     };

//     return (
//         <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">

//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
//                 <div>
//                     <h2 className="text-xl font-semibold text-gray-900">Current Stock Levels</h2>
//                     <p className="text-sm text-gray-400 mt-0.5">
//                         Manage warehouse stock — edit location, adjust quantity, or delete stock records
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     <button
//                         onClick={() => dispatch(openManualAddModal())}
//                         className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
//                     >
//                         <Plus size={14} /> Add Stock
//                     </button>
//                     <button
//                         onClick={handleRefresh}
//                         className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors"
//                     >
//                         Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Stats Cards */}
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//                 <div className="bg-white rounded-xl border border-gray-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Total SKUs</p>
//                     <p className="text-3xl font-bold text-gray-800">{totalSKUs}</p>
//                     <p className="text-xs text-gray-400 mt-1">unique variant+warehouse combos</p>
//                 </div>
//                 <div className="bg-white rounded-xl border border-gray-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Total Units</p>
//                     <p className="text-3xl font-bold text-gray-800">{totalUnits.toLocaleString()}</p>
//                     <p className="text-xs text-gray-400 mt-1">across all SKUs</p>
//                 </div>
//                 <div className="bg-white rounded-xl border border-gray-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Low Stock</p>
//                     <p className="text-3xl font-bold text-gray-800">{lowStockCount}</p>
//                     <p className="text-xs text-gray-400 mt-1">below threshold</p>
//                 </div>
//                 <div className="bg-white rounded-xl border border-gray-100 p-4">
//                     <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Out of Stock</p>
//                     <p className="text-3xl font-bold text-gray-800">{outOfStockCount}</p>
//                     <p className="text-xs text-gray-400 mt-1">zero quantity</p>
//                 </div>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
//                 <div className="flex gap-3">
//                     <input
//                         value={search}
//                         onChange={(e) => dispatch(setSearch(e.target.value))}
//                         placeholder="Search product, SKU, barcode, batch, location..."
//                         className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
//                     />
//                     <button
//                         onClick={() => dispatch(resetFilters())}
//                         className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
//                     >
//                         <X size={14} /> Clear
//                     </button>
//                 </div>
//                 <div className="flex gap-3 flex-wrap">
//                     {/* Warehouse Filter - SUPER_ADMIN only */}
//                     {isSuperAdmin && (
//                         <select
//                             value={warehouseFilter}
//                             onChange={(e) => dispatch(setWarehouseFilter(e.target.value))}
//                             className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
//                         >
//                             <option value="">All Warehouses</option>
//                             {warehouses.map(w => (
//                                 <option key={w.warehouse_id} value={w.warehouse_id}>
//                                     {w.warehouse_name} — {w.city}
//                                 </option>
//                             ))}
//                         </select>
//                     )}

//                     {/* Category Filter */}
//                     <select
//                         value={categoryFilter}
//                         onChange={(e) => dispatch(setCategoryFilter(e.target.value))}
//                         className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
//                     >
//                         <option value="">All Categories</option>
//                         {categories.map(c => (
//                             <option key={c.category_id} value={c.category_id}>{c.name}</option>
//                         ))}
//                     </select>

//                     {/* Page Size */}
//                     <select
//                         value={pageSize}
//                         onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//                         className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 ml-auto focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
//                     >
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Bulk Action Bar */}
//             {selectedStockIds.length > 0 && (
//                 <StockBulkActionBar
//                     selectedCount={selectedStockIds.length}
//                     selectedStockIds={selectedStockIds}
//                     onClearSelection={() => dispatch(clearSelectedStocks())}
//                     onSuccess={() => {
//                         refetch();
//                         refetchAll();
//                         dispatch(clearSelectedStocks());
//                     }}
//                 />
//             )}

//             {/* Table */}
//             <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
//                 <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
//                     <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inventory Stock</span>
//                     <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{meta.total} records</span>
//                 </div>
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50 border-b border-gray-100">
//                         <tr>
//                             {/* Checkbox column */}
//                             <th className="px-4 py-3 w-10">
//                                 {stocks.length > 0 && (
//                                     <button
//                                         onClick={handleSelectAll}
//                                         className="text-gray-500 hover:text-blue-600 transition-colors"
//                                     >
//                                         {allSelectedOnPage ? (
//                                             <CheckSquare size={18} />
//                                         ) : someSelected ? (
//                                             <Square size={18} className="text-blue-500" />
//                                         ) : (
//                                             <Square size={18} />
//                                         )}
//                                     </button>
//                                 )}
//                             </th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Product</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Variant</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Qty</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Status</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Batch</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Expiry</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Location</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Last Inward</th>
//                             <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-50">

//                         {(isLoading || isFetching) && (
//                             <tr>
//                                 <td colSpan={10} className="px-4 py-10 text-center">
//                                     <div className="flex justify-center">
//                                         <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
//                                     </div>
//                                  </td>
//                             </tr>
//                         )}

//                         {!isLoading && !isFetching && stocks.length === 0 && (
//                             <tr>
//                                 <td colSpan={10} className="px-4 py-14 text-center">
//                                     <div className="flex flex-col items-center gap-2">
//                                         <Package size={32} className="text-gray-300" />
//                                         <p className="text-sm text-gray-400">No stock records found</p>
//                                         <p className="text-xs text-gray-400 mt-1">
//                                             Stock is created automatically when inwards are marked MAPPED,
//                                             or you can manually add stock using the "Add Stock" button.
//                                         </p>
//                                     </div>
//                                  </td>
//                             </tr>
//                         )}

//                         {!isLoading && stocks.map((stock) => {
//                             const product = stock.variant?.product || {};
//                             const variant = stock.variant || {};
//                             const status = getStockStatus(stock.quantity, stock.low_stock_threshold);
//                             const location = [stock.room_zone, stock.rack_shelf, stock.position]
//                                 .filter(Boolean).join(" / ") || "—";
//                             const variantAttr = variant.attributes
//                                 ? Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(", ")
//                                 : variant.sku || variant.system_barcode || "—";
//                             const expiringSoon = isExpiringSoon(stock.expiry_date);
//                             const isSelected = selectedStockIds.includes(stock.stock_id);

//                             return (
//                                 <tr key={stock.stock_id} className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}>
//                                     {/* Checkbox */}
//                                     <td className="px-4 py-3">
//                                         <button
//                                             onClick={() => dispatch(toggleSelectStock(stock.stock_id))}
//                                             className="text-gray-400 hover:text-blue-600 transition-colors"
//                                         >
//                                             {isSelected ? (
//                                                 <CheckSquare size={18} className="text-blue-600" />
//                                             ) : (
//                                                 <Square size={18} />
//                                             )}
//                                         </button>
//                                     </td>

//                                     <td className="px-4 py-3">
//                                         <div>
//                                             <p className="font-semibold text-gray-800 text-sm">{product.name || "—"}</p>
//                                             <p className="text-xs font-mono text-gray-400 mt-0.5">{product.product_code || "—"}</p>
//                                         </div>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <div>
//                                             <p className="text-xs text-gray-700">{variantAttr}</p>
//                                             {variant.sku && (
//                                                 <p className="text-xs font-mono text-gray-500 mt-0.5">SKU: {variant.sku}</p>
//                                             )}
//                                             {variant.system_barcode && !variant.sku && (
//                                                 <p className="text-xs font-mono text-gray-500 mt-0.5">Barcode: {variant.system_barcode}</p>
//                                             )}
//                                         </div>
//                                     </td>
//                                     <td className="px-4 py-3 text-right">
//                                         <span className="font-bold text-gray-800">{stock.quantity}</span>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
//                                             <span>{status.icon}</span> {status.label}
//                                         </span>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <span className="text-sm text-gray-500">
//                                             {stock.batch_number || "—"}
//                                         </span>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         {stock.expiry_date ? (
//                                             <div className="flex items-center gap-1">
//                                                 <span className={`text-xs ${expiringSoon ? "text-orange-600 font-semibold" : "text-gray-400"}`}>
//                                                     {fmtDate(stock.expiry_date)}
//                                                 </span>
//                                                 {expiringSoon && (
//                                                     <AlertCircle size={12} className="text-orange-500" />
//                                                 )}
//                                             </div>
//                                         ) : (
//                                             <span className="text-xs text-gray-400">—</span>
//                                         )}
//                                      </td>
//                                     <td className="px-4 py-3">
//                                         <div className="flex items-center gap-1 text-xs text-gray-500">
//                                             <MapPin size={12} />
//                                             <span title={stock.position || ""}>{location}</span>
//                                         </div>
//                                      </td>
//                                     <td className="px-4 py-3">
//                                         <div className="flex items-center gap-1 text-xs text-gray-400">
//                                             <Calendar size={12} />
//                                             <span>{fmtDate(stock.last_purchase_date)}</span>
//                                         </div>
//                                      </td>
//                                     <td className="px-4 py-3">
//                                         <div className="flex items-center justify-center gap-1">
//                                             <button
//                                                 onClick={() => dispatch(openEditModal(stock))}
//                                                 className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
//                                                 title="Edit Stock Details"
//                                             >
//                                                 <Edit2 size={15} />
//                                             </button>
//                                             <button
//                                                 onClick={() => dispatch(openQuantityModal(stock))}
//                                                 className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-gray-100 rounded-md transition-colors"
//                                                 title="Adjust Quantity"
//                                             >
//                                                 <Move size={15} />
//                                             </button>
//                                             <button
//                                                 onClick={() => handleDeleteStock(stock.stock_id, product.name)}
//                                                 className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition-colors"
//                                                 title="Delete Stock (Hard Delete)"
//                                             >
//                                                 <Trash2 size={15} />
//                                             </button>
//                                         </div>
//                                      </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Pagination */}
//             {meta.totalPages > 1 && (
//                 <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//                     <p className="text-xs text-gray-400">
//                         Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
//                     </p>
//                     <div className="flex gap-1.5">
//                         <button
//                             onClick={() => dispatch(setCurrentPage(currentPage - 1))}
//                             disabled={currentPage === 1}
//                             className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
//                         >
//                             Previous
//                         </button>
//                         <span className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">{currentPage} / {meta.totalPages}</span>
//                         <button
//                             onClick={() => dispatch(setCurrentPage(currentPage + 1))}
//                             disabled={currentPage === meta.totalPages}
//                             className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
//                         >
//                             Next
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* Modals */}
//             {showEditModal && <StockEditModal onSuccess={handleRefresh} />}
//             {showQuantityModal && <StockQuantityModal onSuccess={handleRefresh} />}
//             {showManualAddModal && <StockManualAddModal onSuccess={handleRefresh} />}

//         </div>
//     );
// }