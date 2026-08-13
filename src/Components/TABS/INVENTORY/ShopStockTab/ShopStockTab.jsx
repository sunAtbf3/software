 // TABS/INVENTORY/ShopStockTab.jsx
//
// Shop Stock Management for SHOP_OWNER / SHOP_MANAGER
// Features: View stock, adjust quantity, bulk update, low stock alerts
// NEW: Set Min-Max Levels, Bulk Restock Request, Barcode Display & Download (Modal-based)
// UPDATED: Each variant has its own checkbox, edit, and min-max buttons

import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, Package, AlertTriangle, TrendingUp, Layers, Edit2, CheckSquare, Square, RefreshCw, Bell, Truck, Target, ChevronDown, ChevronRight, Barcode, CloudOff } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useGetLowStockAlertsQuery, useGetReorderSuggestionsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi";
import { useShopStocksForInventory } from "../../../../offline/hooks/useShopStocksForInventory";
import {
    setSearch,
    setLowStockOnly,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openQuantityModal,
    openBulkModal,
    openBulkRestockModal,
    openMinMaxModal,
    toggleSelectStock,
    selectAllStocks,
    clearSelectedStocks,
    setLoading,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockSlice";
import { getUserShopId } from "../../../../offline/constants";
import { useShopPricingVisibility } from "../../../../utils/shopPricingVisibility";
import { isAdmin } from "../../../roles";
import StockQuantityModal from "./ShopStockShared/StockQuantityModal";
import StockBulkModal from "./ShopStockShared/StockBulkModal";
import StockBulkRestockModal from "./ShopStockShared/StockBulkRestockModal";
import StockMinMaxModal from "./ShopStockShared/StockMinMaxModal";
import BarcodeLabelModal from "../ProductShared/Barcode_Compo/BarcodeLabelModal";

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getStockStatus = (quantity, threshold) => {
    if (quantity === 0) return { label: "Out of stock", color: "bg-red-50 text-red-600 border border-red-200", icon: "🔴" };
    if (quantity <= threshold) return { label: "Low stock", color: "bg-orange-50 text-orange-700 border border-orange-200", icon: "⚠️" };
    return { label: "In stock", color: "bg-green-50 text-green-700 border border-green-200", icon: "✅" };
};

// Group stocks by product_id to detect multi-variant products
const groupStocksByProduct = (stocks) => {
    const productMap = new Map();
    
    stocks.forEach(stock => {
        const product = stock.variant?.product || {};
        const variant = stock.variant || {};
        const productId = product.product_id;
        
        if (!productMap.has(productId)) {
            productMap.set(productId, {
                product_id: productId,
                product_code: product.product_code,
                name: product.name,
                stocks: [],
                variants: [],
                isMultiVariant: false,
            });
        }
        
        const group = productMap.get(productId);
        group.stocks.push(stock);
        group.variants.push({
            shop_stock_id: stock.shop_stock_id,
            variant_id: variant.variant_id,
            product_code: variant.product_code,
            sku: variant.sku,
            system_barcode: variant.system_barcode,
            special_price: variant.special_price,
            wholesale_price: variant.wholesale_price,
            purchase_price: variant.purchase_price,
            warranty: variant.warranty,
            purchase_code: variant.purchase_code,
            mrp: variant.mrp,
            expenses: variant.expenses,
            quantity_available: stock.quantity_available,
            quantity_reserved: stock.quantity_reserved || 0,
            quantity_in_transit: stock.quantity_in_transit || 0,
            low_stock_threshold: stock.low_stock_threshold,
            attributes: variant.attributes || [],
            is_default: variant.is_default,
        });
    });
    
    // Mark multi-variant products and sort variants
    const result = Array.from(productMap.values());
    result.forEach(group => {
        group.isMultiVariant = group.variants.length > 1;
        // Sort variants: primary (is_default) first, then by product_code
        group.variants.sort((a, b) => {
            if (a.is_default && !b.is_default) return -1;
            if (!a.is_default && b.is_default) return 1;
            return a.product_code?.localeCompare(b.product_code) || 0;
        });
    });
    
    return result;
};

export default function ShopStockTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const {
        search,
        lowStockOnly,
        currentPage,
        pageSize,
        selectedStockIds,
        showQuantityModal,
        showBulkModal,
        showBulkRestockModal,
        showMinMaxModal,
    } = useSelector((state) => state.shopStock);

    // Local state for expandable rows and barcode modal
    const [expandedProducts, setExpandedProducts] = useState({});
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [selectedVariantsForBarcode, setSelectedVariantsForBarcode] = useState([]);

    const isShopOwner = user?.role === "SHOP_OWNER";
    const isShopManager = user?.role === "SHOP_MANAGER";
    const canEdit = isAdmin() || isShopOwner || isShopManager;
    const { canViewWholesale } = useShopPricingVisibility();

    const userShopId = getUserShopId(user) || "";

    const {
        stocks,
        meta,
        isLoading: stocksLoading,
        isFetching: stocksFetching,
        isOnline,
        usingOfflineCache,
        refetch: refetchStocks,
    } = useShopStocksForInventory(userShopId, {
        search,
        lowStockOnly,
        page: currentPage,
        limit: pageSize,
    });

    // ── Queries (online-only extras) ──────────────────────────────────
    const { data: lowStockAlerts, refetch: refetchAlerts } = useGetLowStockAlertsQuery({
        shop_id: userShopId,
    }, { skip: !userShopId || !isOnline });

    const { data: suggestionsData, refetch: refetchSuggestions } = useGetReorderSuggestionsQuery({
        shop_id: userShopId,
    }, {
        skip: !userShopId || !isOnline,
    });

    const alerts = lowStockAlerts?.alerts || [];
    const alertCount = isOnline ? (lowStockAlerts?.count || 0) : 0;

    // Group stocks by product for expandable multi-variant display
    const groupedProducts = React.useMemo(() => groupStocksByProduct(stocks), [stocks]);

    // Create a map of variant_id -> min/max levels from suggestions
    const levelsMap = React.useMemo(() => {
        const map = new Map();
        if (suggestionsData?.items) {
            suggestionsData.items.forEach(item => {
                map.set(item.variant_id, {
                    min_level: item.min_level,
                    max_level: item.max_level,
                    suggested_quantity: item.suggested_quantity,
                });
            });
        }
        return map;
    }, [suggestionsData]);

    // ── Stats ───────────────────────────────────────────────────────────
    const totalSKUs = stocks.length;
    const totalUnits = stocks.reduce((sum, s) => sum + (s.quantity_available || 0), 0);
    const lowStockCount = stocks.filter(s => {
        const levels = levelsMap.get(s.variant_id);
        const minLevel = levels?.min_level || s.low_stock_threshold || 10;
        return s.quantity_available > 0 && s.quantity_available <= minLevel;
    }).length;
    const outOfStockCount = stocks.filter(s => s.quantity_available === 0).length;

    // ── Selection ───────────────────────────────────────────────────────
    // Get all stock IDs on current page (from all variants)
    const allStockIdsOnPage = groupedProducts.flatMap(group => 
        group.variants.map(v => v.shop_stock_id).filter(Boolean)
    );
    const allSelectedOnPage = allStockIdsOnPage.length > 0 && 
        allStockIdsOnPage.every(id => selectedStockIds.includes(id));
    const someSelected = allStockIdsOnPage.some(id => selectedStockIds.includes(id));

    const handleSelectAll = () => {
        if (allSelectedOnPage) {
            // Deselect all on current page
            const remainingIds = selectedStockIds.filter(id => !allStockIdsOnPage.includes(id));
            dispatch(selectAllStocks({ stockIds: remainingIds, isSelected: false }));
        } else {
            // Select all on current page
            const newIds = [...new Set([...selectedStockIds, ...allStockIdsOnPage])];
            dispatch(selectAllStocks({ stockIds: newIds, isSelected: true }));
        }
    };

    const handleRefresh = () => {
        refetchStocks();
        if (isOnline) {
            refetchAlerts();
            refetchSuggestions();
        }
        dispatch(clearSelectedStocks());
    };

    const toggleExpand = (productId) => {
        setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
    };

    const handleSingleVariantBarcode = (variant, productInfo) => {
        setSelectedVariantsForBarcode([{
            variant,
            product: {
                product_id: productInfo.product_id,
                name: productInfo.name,
                product_code: productInfo.product_code,
                brand_name: productInfo.brand_name || "",
            }
        }]);
        setShowBarcodeModal(true);
    };

    const handleAllVariantsBarcode = (group) => {
        const variantsWithProducts = group.variants.map(variant => ({
            variant,
            product: {
                product_id: group.product_id,
                name: group.name,
                product_code: group.product_code,
                brand_name: "",
            }
        }));
        setSelectedVariantsForBarcode(variantsWithProducts);
        setShowBarcodeModal(true);
    };

    const handleVariantQuantity = (variant, productName) => {
        const stockForModal = {
            shop_stock_id: variant.shop_stock_id,
            variant_id: variant.variant_id,
            quantity_available: variant.quantity_available,
            low_stock_threshold: variant.low_stock_threshold,
            variant: {
                product_code: variant.product_code,
                sku: variant.sku,
                product: {
                    name: productName || variant.product_code,
                }
            }
        };
        dispatch(openQuantityModal(stockForModal));
    };

    const handleVariantMinMax = (variant) => {
        const levels = levelsMap.get(variant.variant_id);
        const stockForModal = {
            shop_stock_id: variant.shop_stock_id,
            variant_id: variant.variant_id,
            quantity_available: variant.quantity_available,
            low_stock_threshold: variant.low_stock_threshold,
            variant: {
                product_code: variant.product_code,
                product: {
                    name: variant.product_code,
                }
            }
        };
        dispatch(openMinMaxModal({ 
            ...stockForModal, 
            min_level: levels?.min_level, 
            max_level: levels?.max_level 
        }));
    };

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Shop Stock Management</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Manage stock levels — set min-max thresholds, track low stock, and create bulk restock requests
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {!isOnline && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <CloudOff size={18} className="text-slate-500 shrink-0" />
                    <p className="text-sm text-slate-700">
                        Offline mode — showing cached stock{usingOfflineCache ? "" : ""}. Quantity adjustments save locally and sync when online.
                        Bulk update and min-max require internet.
                    </p>
                </div>
            )}

            {/* Low Stock Alert Banner */}
            {alertCount > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell size={18} className="text-orange-400" />
                        <p className="text-sm text-orange-700 font-medium">
                            {alertCount} low stock alert(s) — {alerts.map(a => a.variant?.product?.name).join(", ")}
                        </p>
                    </div>
                    <button onClick={() => dispatch(setLowStockOnly(true))} className="text-xs text-orange-500 hover:underline">
                        View all →
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-blue-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-blue-400 uppercase tracking-wide">Total SKUs</p>
                        <Package size={16} className="text-blue-300" />
                    </div>
                    <p className="text-3xl font-bold text-blue-700">{totalSKUs}</p>
                    <p className="text-xs text-gray-400 mt-1">in your shop</p>
                </div>
                <div className="bg-white rounded-xl border border-emerald-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-emerald-500 uppercase tracking-wide">Total Units</p>
                        <TrendingUp size={16} className="text-emerald-300" />
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">{totalUnits.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">available for sale</p>
                </div>
                <div className="bg-white rounded-xl border border-orange-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-orange-400 uppercase tracking-wide">Low Stock</p>
                        <AlertTriangle size={16} className="text-orange-300" />
                    </div>
                    <p className="text-3xl font-bold text-orange-600">{lowStockCount}</p>
                    <p className="text-xs text-gray-400 mt-1">below threshold</p>
                </div>
                <div className="bg-white rounded-xl border border-red-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-red-400 uppercase tracking-wide">Out of Stock</p>
                        <AlertTriangle size={16} className="text-red-300" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">{outOfStockCount}</p>
                    <p className="text-xs text-gray-400 mt-1">needs restock</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex gap-3">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search by product name, SKU, or barcode..."
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                    <button
                        onClick={() => dispatch(resetFilters())}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X size={13} /> Clear
                    </button>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={lowStockOnly}
                            onChange={(e) => dispatch(setLowStockOnly(e.target.checked))}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Show low stock only</span>
                    </label>
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 ml-auto focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                    >
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedStockIds.length > 0 && isOnline && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
                    <div className="bg-blue-600 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
                        <span className="text-sm font-medium">{selectedStockIds.length} item(s) selected</span>
                        <div className="w-px h-6 bg-gray-600" />
                        
                        <button
                            onClick={() => dispatch(openBulkModal())}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-full text-sm font-medium transition-colors"
                        >
                            <Layers size={14} /> Bulk Update
                        </button>
                        
                        <button
                            onClick={() => dispatch(openBulkRestockModal())}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-full text-sm font-medium transition-colors"
                        >
                            <Truck size={14} /> Create Bulk Restock Request
                        </button>
                        
                        <button
                            onClick={() => dispatch(clearSelectedStocks())}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm transition-colors"
                        >
                            <X size={14} /> Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3 w-8"></th>
                            <th className="px-4 py-3 w-10">
                                {stocks.length > 0 && (
                                    <button onClick={handleSelectAll} className="text-gray-500 hover:text-gray-700">
                                        {allSelectedOnPage ? <CheckSquare size={18} /> : someSelected ? <Square size={18} className="text-blue-500" /> : <Square size={18} />}
                                    </button>
                                )}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Variant SKU</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Available</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Reserved</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">In Transit</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Min/Max</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Suggested</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Updated</th>
                            {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Barcode</th> */}
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(stocksLoading || stocksFetching) && (
                            <tr>
                                <td colSpan={12} className="px-4 py-10 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                    </div>
                                </td>
                            </tr>
                        )}
                        {!stocksLoading && !stocksFetching && groupedProducts.length === 0 && (
                            <tr>
                                <td colSpan={12} className="px-4 py-14 text-center">
                                    <Package size={32} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">No stock records found for your shop</p>
                                    <p className="text-xs text-gray-400 mt-1">Products will appear here when stock is added</p>
                                </td>
                            </tr>
                        )}
                        {!stocksLoading && groupedProducts.map((group) => {
                            const isMultiVariant = group.isMultiVariant;
                            const firstVariant = group.variants[0]; // Primary or first variant for main row
                            
                            return (
                                <React.Fragment key={group.product_id}>
                                    {/* Main Product Row */}
                                    <tr className="hover:bg-gray-50 transition-colors bg-white">
                                        {/* Expand button - ONLY for multi-variant */}
                                        <td className="px-2 py-3">
                                            {isMultiVariant && (
                                                <button
                                                    onClick={() => toggleExpand(group.product_id)}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    {expandedProducts[group.product_id] ? (
                                                        <ChevronDown size={16} className="text-gray-500" />
                                                    ) : (
                                                        <ChevronRight size={16} className="text-gray-500" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        
                                        {/* Checkbox for main row - selects all variants? No, keep independent */}
                                        <td className="px-4 py-3">
                                            {/* Main row checkbox selects the first variant (or all? Keeping independent for clarity) */}
                                            {firstVariant && (
                                                <button 
                                                    onClick={() => dispatch(toggleSelectStock(firstVariant.shop_stock_id))} 
                                                    className="text-gray-400 hover:text-blue-600"
                                                >
                                                    {selectedStockIds.includes(firstVariant.shop_stock_id) ? 
                                                        <CheckSquare size={18} className="text-blue-600" /> : 
                                                        <Square size={18} />
                                                    }
                                                </button>
                                            )}
                                        </td>
                                        
                                        {/* Product */}
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-800">{group.name || "—"}</p>
                                            <p className="text-xs font-semibold text-blue-600">{group.product_code || "—"}</p>
                                        </td>
                                        
                                        {/* Variant SKU */}
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-semibold text-blue-600">
                                                {firstVariant?.product_code || firstVariant?.sku || "—"}
                                            </p>
                                        </td>
                                        
                                        {/* Available */}
                                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                                            {firstVariant?.quantity_available || 0}
                                        </td>
                                        
                                        {/* Reserved */}
                                        <td className="px-4 py-3 text-right text-gray-500">
                                            {firstVariant?.quantity_reserved || 0}
                                        </td>
                                        
                                        {/* In Transit */}
                                        <td className="px-4 py-3 text-right text-gray-500">
                                            {firstVariant?.quantity_in_transit || 0}
                                        </td>
                                        
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const levels = levelsMap.get(firstVariant?.variant_id);
                                                const minLevel = levels?.min_level || firstVariant?.low_stock_threshold || 10;
                                                const status = getStockStatus(firstVariant?.quantity_available, minLevel);
                                                return (
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                        {status.icon} {status.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        
                                        {/* Min/Max */}
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const levels = levelsMap.get(firstVariant?.variant_id);
                                                return levels?.min_level && levels?.max_level ? (
                                                    <span className="text-xs text-gray-600">
                                                        {levels.min_level} / {levels.max_level}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-orange-400">Not set</span>
                                                );
                                            })()}
                                        </td>
                                        
                                        {/* Suggested */}
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const levels = levelsMap.get(firstVariant?.variant_id);
                                                return levels?.suggested_quantity > 0 ? (
                                                    <span className="text-xs font-semibold text-blue-600">
                                                        {levels.suggested_quantity} units
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                );
                                            })()}
                                        </td>
                                        
                                        {/* Updated */}
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {fmtDate(firstVariant?.updated_at)}
                                        </td>
                                        
                                        {/* Barcode Action */}
                                        {/* <td className="px-4 py-3">
                                            {isMultiVariant ? (
                                                <button
                                                    onClick={() => handleAllVariantsBarcode(group)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                                    title="Generate barcode labels for all variants"
                                                >
                                                    <Barcode size={14} />
                                                    Get Labels
                                                </button>
                                            ) : (
                                                firstVariant && (
                                                    <button
                                                        onClick={() => handleSingleVariantBarcode(firstVariant, {
                                                            product_id: group.product_id,
                                                            name: group.name,
                                                            product_code: group.product_code,
                                                        })}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                                        title="Generate barcode label"
                                                    >
                                                        <Barcode size={14} />
                                                        Get Barcode
                                                    </button>
                                                )
                                            )}
                                        </td> */}
                                        
                                        {/* Actions */}
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {canEdit && firstVariant && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleVariantQuantity(firstVariant, group.name)} 
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors" 
                                                            title="Adjust Quantity"
                                                        >
                                                       <Edit2 size={15} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleVariantMinMax(firstVariant)} 
                                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40" 
                                                            title="Set Min-Max Levels"
                                                            disabled={!isOnline}
                                                        >
                                                            <Target size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Row - ALL Variants with full capabilities */}
                                    {expandedProducts[group.product_id] && isMultiVariant && group.variants.length > 0 && (
                                        <tr>
                                            <td colSpan={12} className="px-0 py-0 bg-gray-50">
                                                <div className="p-4 pl-16 border-t border-gray-100">
                                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                        <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                                                        <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-4 py-2 w-8"></th>
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Variant SKU</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Barcode</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Special Price</th>
                                                                    {canViewWholesale && (
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Wholesale Price</th>
                                                                    )}
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Purchase Price</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Warranty</th>
                                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Available</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Min/Max</th>
                                                                    {/* <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Barcode Action</th> */}
                                                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                            {group.variants.slice(1).map((variant) => {
                                                                    const variantLevels = levelsMap.get(variant.variant_id);
                                                                    const variantMinLevel = variantLevels?.min_level || variant.low_stock_threshold || 10;
                                                                    const variantStatus = getStockStatus(variant.quantity_available, variantMinLevel);
                                                                    const isVariantSelected = selectedStockIds.includes(variant.shop_stock_id);
                                                                    
                                                                    return (
                                                                        <tr key={variant.variant_id} className="hover:bg-gray-50">
                                                                            {/* Checkbox for this variant */}
                                                                            <td className="px-4 py-2 w-8">
                                                                                <button 
                                                                                    onClick={() => dispatch(toggleSelectStock(variant.shop_stock_id))} 
                                                                                    className="text-gray-400 hover:text-blue-600"
                                                                                >
                                                                                    {isVariantSelected ? 
                                                                                        <CheckSquare size={16} className="text-blue-600" /> : 
                                                                                        <Square size={16} />
                                                                                    }
                                                                                </button>
                                                                            </td>
                                                                            
                                                                            <td className="px-4 py-2">
                                                                                <span className="text-xs font-semibold text-blue-600">
                                                                                    {variant.product_code || variant.sku || "—"}
                                                                                </span>
                                                                            </td>
                                                                            
                                                                            <td className="px-4 py-2">
                                                                                <span className="font-mono text-xs text-gray-500">
                                                                                    {variant.system_barcode || "—"}
                                                                                </span>
                                                                            </td>
                                                                            
                                                                            <td className="px-4 py-2">
                                                                                <span className="text-sm font-semibold text-blue-600">
                                                                                    ₹{variant.special_price?.toLocaleString() || "—"}
                                                                                </span>
                                                                            </td>
                                                                            
                                                                            {canViewWholesale && (
                                                                            <td className="px-4 py-2">
                                                                                <span className="text-sm font-semibold text-indigo-600">
                                                                                    ₹{variant.wholesale_price?.toLocaleString() || "—"}
                                                                                </span>
                                                                            </td>
                                                                            )}
                                                                            
                                                                            <td className="px-4 py-2">
                                                                                <span className="text-sm font-semibold text-green-600">
                                                                                    ₹{variant.purchase_price?.toLocaleString() || "—"}
                                                                                </span>
                                                                            </td>

                                                                            <td className="px-4 py-2">
                                                                                <span className="text-xs text-gray-600">
                                                                                    {variant.warranty || "—"}
                                                                                </span>
                                                                            </td>
                                                                            
                                                                            <td className="px-4 py-2 text-right font-bold text-gray-800">
                                                                                {variant.quantity_available || 0}
                                                                            </td>
                                                                            
                                                                            <td className="px-4 py-2">
                                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variantStatus.color}`}>
                                                                                    {variantStatus.icon} {variantStatus.label}
                                                                                </span>
                                                                            </td>
                                                                            
                                                                            {/* Min/Max for this variant */}
                                                                            <td className="px-4 py-2">
                                                                                {variantLevels?.min_level && variantLevels?.max_level ? (
                                                                                    <span className="text-xs text-gray-600">
                                                                                        {variantLevels.min_level} / {variantLevels.max_level}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-xs text-orange-400">Not set</span>
                                                                                )}
                                                                            </td>
                                                                            
                                                                            {/* <td className="px-4 py-2">
                                                                                <button
                                                                                    onClick={() => handleSingleVariantBarcode(variant, {
                                                                                        product_id: group.product_id,
                                                                                        name: group.name,
                                                                                        product_code: group.product_code,
                                                                                    })}
                                                                                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
                                                                                >
                                                                                    <Barcode size={12} />
                                                                                    Get Barcode
                                                                                </button>
                                                                             </td> */}
                                                                            
                                                                            <td className="px-4 py-2 text-center">
                                                                                <div className="flex items-center justify-center gap-1">
                                                                                    {canEdit && (
                                                                                        <>
                                                                                            {/* <button 
                                                                                                onClick={() => handleVariantQuantity(variant, group.name)} 
                                                                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors" 
                                                                                                title="Adjust Quantity"
                                                                                            >
                                                                                                <Edit2 size={14} />
                                                                                            </button> */}
                                                                                            <button 
                                                                                                onClick={() => handleVariantMinMax(variant)} 
                                                                                                className="p-1 text-gray-400 hover:text-purple-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40" 
                                                                                                title="Set Min-Max Levels"
                                                                                                disabled={!isOnline}
                                                                                            >
                                                                                                <Target size={14} />
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                             </td>
                                                                         </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                        </div>
                                                    </div>
                                                </div>
                                             </td>
                                         </tr>
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
                    <p className="text-xs text-gray-400">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}</p>
                    <div className="flex gap-1.5">
                        <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Previous</button>
                        <span className="px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">{currentPage} / {meta.totalPages}</span>
                        <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showQuantityModal && <StockQuantityModal onSuccess={handleRefresh} />}
            {showMinMaxModal && <StockMinMaxModal onSuccess={handleRefresh} />}
            {showBulkModal && <StockBulkModal onSuccess={handleRefresh} stocks={stocks} selectedStockIds={selectedStockIds} />}
            {showBulkRestockModal && <StockBulkRestockModal onSuccess={handleRefresh} stocks={stocks} selectedStockIds={selectedStockIds} />}

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
// downb code is working but upper code have barcode 
// // TABS/INVENTORY/ShopStockTab.jsx
// //
// // Shop Stock Management for SHOP_OWNER / SHOP_MANAGER
// // Features: View stock, adjust quantity, bulk update, low stock alerts
// // NEW: Set Min-Max Levels, Bulk Restock Request

// import React, { useState, useEffect } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { X, Package, AlertTriangle, TrendingUp, Layers, Edit2, CheckSquare, Square, RefreshCw, Bell, Truck, Target } from "lucide-react";
// import { toast } from "react-toastify";
// import { useGetShopStocksQuery, useGetLowStockAlertsQuery, useGetReorderSuggestionsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi";
// import {
//     setSearch,
//     setLowStockOnly,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openQuantityModal,
//     openBulkModal,
//     openBulkRestockModal,
//     openMinMaxModal,
//     toggleSelectStock,
//     selectAllStocks,
//     clearSelectedStocks,
//     setLoading,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockSlice";
// import { CURRENT_USER, isAdmin } from "../../../roles";
// import StockQuantityModal from "./ShopStockShared/StockQuantityModal";
// import StockBulkModal from "./ShopStockShared/StockBulkModal";
// import StockBulkRestockModal from "./ShopStockShared/StockBulkRestockModal";
// import StockMinMaxModal from "./ShopStockShared/StockMinMaxModal";

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// const getStockStatus = (quantity, threshold) => {
//     if (quantity === 0) return { label: "Out of stock", color: "bg-red-100 text-red-700", icon: "🔴" };
//     if (quantity <= threshold) return { label: "Low stock", color: "bg-orange-100 text-orange-700", icon: "⚠️" };
//     return { label: "In stock", color: "bg-green-100 text-green-700", icon: "✅" };
// };

// export default function ShopStockTab() {
//     const dispatch = useDispatch();
//     const { user } = useSelector((state) => state.auth);
//     const {
//         search,
//         lowStockOnly,
//         currentPage,
//         pageSize,
//         selectedStockIds,
//         showQuantityModal,
//         showBulkModal,
//         showBulkRestockModal,
//         showMinMaxModal,
//     } = useSelector((state) => state.shopStock);

//     const isShopOwner = user?.role === "SHOP_OWNER";
//     const isShopLister = user?.role === "SHOP_MANAGER";
//     const canEdit = isAdmin() || isShopOwner || isShopLister;

//     const userShopId = user?.shop_id || "";

//     // ── Queries ─────────────────────────────────────────────────────────
//     const { data, isLoading, isFetching, refetch } = useGetShopStocksQuery({
//         page: currentPage,
//         limit: pageSize,
//         search,
//         low_stock_only: lowStockOnly,
//         shop_id: userShopId,
//     });

//     const { data: lowStockAlerts, refetch: refetchAlerts } = useGetLowStockAlertsQuery({
//         shop_id: userShopId,
//     });

//     // Fetch reorder suggestions to get min-max levels for all variants
//     const { data: suggestionsData, refetch: refetchSuggestions } = useGetReorderSuggestionsQuery({
//         shop_id: userShopId,
//     }, {
//         skip: !userShopId,
//     });

//     const stocks = data?.stocks || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
//     const alerts = lowStockAlerts?.alerts || [];
//     const alertCount = lowStockAlerts?.count || 0;

//     // Create a map of variant_id -> min/max levels from suggestions
//     const levelsMap = React.useMemo(() => {
//         const map = new Map();
//         if (suggestionsData?.items) {
//             suggestionsData.items.forEach(item => {
//                 map.set(item.variant_id, {
//                     min_level: item.min_level,
//                     max_level: item.max_level,
//                     suggested_quantity: item.suggested_quantity,
//                 });
//             });
//         }
//         return map;
//     }, [suggestionsData]);

//     // ── Stats ───────────────────────────────────────────────────────────
//     const totalSKUs = stocks.length;
//     const totalUnits = stocks.reduce((sum, s) => sum + (s.quantity_available || 0), 0);
//     const lowStockCount = stocks.filter(s => {
//         const levels = levelsMap.get(s.variant_id);
//         const minLevel = levels?.min_level || s.low_stock_threshold || 10;
//         return s.quantity_available > 0 && s.quantity_available <= minLevel;
//     }).length;
//     const outOfStockCount = stocks.filter(s => s.quantity_available === 0).length;

//     // ── Selection ───────────────────────────────────────────────────────
//     const allSelectedOnPage = stocks.length > 0 && stocks.every(s => selectedStockIds.includes(s.shop_stock_id));
//     const someSelected = stocks.some(s => selectedStockIds.includes(s.shop_stock_id));

//     const handleSelectAll = () => {
//         const currentStockIds = stocks.map(s => s.shop_stock_id);
//         if (allSelectedOnPage) {
//             const remainingIds = selectedStockIds.filter(id => !currentStockIds.includes(id));
//             dispatch(selectAllStocks({ stockIds: remainingIds, isSelected: false }));
//         } else {
//             const newIds = [...new Set([...selectedStockIds, ...currentStockIds])];
//             dispatch(selectAllStocks({ stockIds: newIds, isSelected: true }));
//         }
//     };

//     const handleRefresh = () => {
//         refetch();
//         refetchAlerts();
//         refetchSuggestions();
//         dispatch(clearSelectedStocks());
//     };

//     return (
//         <div className="space-y-5">

//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//                 <div>
//                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Shop Stock Management</h2>
//                     <p className="text-sm text-gray-500 mt-1">
//                         Manage stock levels — set min-max thresholds, track low stock, and create bulk restock requests
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2.5">
//                     {canEdit && (
//                         <button
//                             onClick={() => dispatch(openBulkModal())}
//                             className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
//                             disabled={stocks.length === 0}
//                         >
//                             <Layers size={16} /> Bulk Update
//                         </button>
//                     )}
//                     <button
//                         onClick={handleRefresh}
//                         className="px-3 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg cursor-pointer"
//                     >
//                         <RefreshCw size={14} className="inline mr-1" /> Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Low Stock Alert Banner */}
//             {alertCount > 0 && (
//                 <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center justify-between">
//                     <div className="flex items-center gap-2">
//                         <Bell size={18} className="text-orange-500" />
//                         <p className="text-sm text-orange-800 font-medium">
//                             {alertCount} low stock alert(s) — {alerts.map(a => a.variant?.product?.name).join(", ")}
//                         </p>
//                     </div>
//                     <button onClick={() => dispatch(setLowStockOnly(true))} className="text-xs text-orange-600 hover:underline">
//                         View all →
//                     </button>
//                 </div>
//             )}

//             {/* Stats Cards */}
//             <div className="grid grid-cols-4 gap-4">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Total SKUs</p>
//                         <Package size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{totalSKUs}</p>
//                     <p className="text-xs opacity-60 mt-1">in your shop</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Total Units</p>
//                         <TrendingUp size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{totalUnits.toLocaleString()}</p>
//                     <p className="text-xs opacity-60 mt-1">available for sale</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Low Stock</p>
//                         <AlertTriangle size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{lowStockCount}</p>
//                     <p className="text-xs opacity-60 mt-1">below threshold</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Out of Stock</p>
//                         <AlertTriangle size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{outOfStockCount}</p>
//                     <p className="text-xs opacity-60 mt-1">needs restock</p>
//                 </div>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
//                 <div className="flex gap-3">
//                     <input
//                         value={search}
//                         onChange={(e) => dispatch(setSearch(e.target.value))}
//                         placeholder="Search by product name, SKU, or barcode..."
//                         className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                     <button
//                         onClick={() => dispatch(resetFilters())}
//                         className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
//                     >
//                         <X size={14} /> Clear
//                     </button>
//                 </div>
//                 <div className="flex gap-3 flex-wrap">
//                     <label className="flex items-center gap-2 cursor-pointer">
//                         <input
//                             type="checkbox"
//                             checked={lowStockOnly}
//                             onChange={(e) => dispatch(setLowStockOnly(e.target.checked))}
//                             className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
//                         />
//                         <span className="text-sm text-gray-700">Show low stock only</span>
//                     </label>
//                     <select
//                         value={pageSize}
//                         onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 ml-auto cursor-pointer"
//                     >
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Bulk Action Bar */}
//             {selectedStockIds.length > 0 && (
//                 <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
//                     <div className="bg-blue-600 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
//                         <span className="text-sm font-medium">{selectedStockIds.length} item(s) selected</span>
//                         <div className="w-px h-6 bg-gray-600" />
                        
//                         <button
//                             onClick={() => dispatch(openBulkModal())}
//                             className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-full text-sm font-medium transition-colors"
//                         >
//                             <Layers size={14} /> Bulk Update
//                         </button>
                        
//                         <button
//                             onClick={() => dispatch(openBulkRestockModal())}
//                             className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-full text-sm font-medium transition-colors"
//                         >
//                             <Truck size={14} /> Create Bulk Restock Request
//                         </button>
                        
//                         <button
//                             onClick={() => dispatch(clearSelectedStocks())}
//                             className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm transition-colors"
//                         >
//                             <X size={14} /> Clear
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* Table */}
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50 border-b border-gray-100">
//                         <tr>
//                             <th className="px-4 py-3 w-10">
//                                 {stocks.length > 0 && (
//                                     <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
//                                         {allSelectedOnPage ? <CheckSquare size={18} /> : someSelected ? <Square size={18} className="text-blue-500" /> : <Square size={18} />}
//                                     </button>
//                                 )}
//                             </th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Variant</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Available</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Reserved</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">In Transit</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Min/Max</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Suggested</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Updated</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {(isLoading || isFetching) && (
//                             <tr>
//                                 <td colSpan={11} className="px-4 py-10 text-center">
//                                     <div className="flex justify-center">
//                                         <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//                                     </div>
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && !isFetching && stocks.length === 0 && (
//                             <tr>
//                                 <td colSpan={11} className="px-4 py-14 text-center">
//                                     <Package size={32} className="text-gray-300 mx-auto mb-2" />
//                                     <p className="text-gray-400 text-sm">No stock records found for your shop</p>
//                                     <p className="text-xs text-gray-400 mt-1">Products will appear here when stock is added</p>
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && stocks.map((stock) => {
//                             const product = stock.variant?.product || {};
//                             const variant = stock.variant || {};
//                             const levels = levelsMap.get(stock.variant_id);
//                             const minLevel = levels?.min_level;
//                             const maxLevel = levels?.max_level;
//                             const suggestedQty = levels?.suggested_quantity;
//                             const status = getStockStatus(stock.quantity_available, minLevel || stock.low_stock_threshold || 10);
//                             const variantAttr = variant.sku || variant.product_code || variant.system_barcode || "—";
//                             const isSelected = selectedStockIds.includes(stock.shop_stock_id);

//                             return (
//                                 <tr key={stock.shop_stock_id} className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}>
//                                     <td className="px-4 py-3">
//                                         <button onClick={() => dispatch(toggleSelectStock(stock.shop_stock_id))} className="text-gray-400 hover:text-blue-600">
//                                             {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
//                                         </button>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <p className="font-semibold text-gray-800">{product.name || "—"}</p>
//                                         <p className="text-xs font-mono text-gray-400">{product.product_code || "—"}</p>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <p className="text-xs text-gray-700">{variantAttr}</p>
//                                     </td>
//                                     <td className="px-4 py-3 text-right font-bold text-gray-800">{stock.quantity_available}</td>
//                                     <td className="px-4 py-3 text-right text-gray-600">{stock.quantity_reserved || 0}</td>
//                                     <td className="px-4 py-3 text-right text-gray-600">{stock.quantity_in_transit || 0}</td>
//                                     <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.icon} {status.label}</span></td>
//                                     <td className="px-4 py-3">
//                                         {minLevel && maxLevel ? (
//                                             <span className="text-xs text-gray-700">
//                                                 {minLevel} / {maxLevel}
//                                             </span>
//                                         ) : (
//                                             <span className="text-xs text-orange-500">Not set</span>
//                                         )}
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         {suggestedQty && suggestedQty > 0 ? (
//                                             <span className="text-xs font-semibold text-blue-600">
//                                                 {suggestedQty} units
//                                             </span>
//                                         ) : (
//                                             <span className="text-xs text-gray-400">—</span>
//                                         )}
//                                     </td>
//                                     <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(stock.updated_at)}</td>
//                                     <td className="px-4 py-3 text-center">
//                                         <div className="flex items-center justify-center gap-1">
//                                             {canEdit && (
//                                                 <>
//                                                     <button 
//                                                         onClick={() => dispatch(openQuantityModal(stock))} 
//                                                         className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" 
//                                                         title="Adjust Quantity"
//                                                     >
//                                                         <Edit2 size={15} />
//                                                     </button>
//                                                     <button 
//                                                         onClick={() => dispatch(openMinMaxModal({ ...stock, min_level: minLevel, max_level: maxLevel }))} 
//                                                         className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" 
//                                                         title="Set Min-Max Levels"
//                                                     >
//                                                         <Target size={15} />
//                                                     </button>
//                                                 </>
//                                             )}
//                                         </div>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Pagination */}
//             {meta.totalPages > 1 && (
//                 <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//                     <p className="text-sm text-gray-500">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}</p>
//                     <div className="flex gap-2">
//                         <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
//                         <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
//                         <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
//                     </div>
//                 </div>
//             )}

//             {/* Modals */}
//             {showQuantityModal && <StockQuantityModal onSuccess={handleRefresh} />}
//             {showMinMaxModal && <StockMinMaxModal onSuccess={handleRefresh} />}
//             {showBulkModal && <StockBulkModal onSuccess={handleRefresh} stocks={stocks} selectedStockIds={selectedStockIds} />}
//             {showBulkRestockModal && <StockBulkRestockModal onSuccess={handleRefresh} stocks={stocks} selectedStockIds={selectedStockIds} />}
//         </div>
//     );
// }

// // TABS/INVENTORY/ShopStockTab.jsx
// //
// // Shop Stock Management for SHOP_OWNER / SHOP_MANAGER
// // Features: View stock, adjust quantity, bulk update, low stock alerts

// import React, { useState } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { X, Package, AlertTriangle, TrendingUp, Layers, Edit2, CheckSquare, Square, RefreshCw, Bell } from "lucide-react";
// import { toast } from "react-toastify";
// import { useGetShopStocksQuery, useGetLowStockAlertsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi";
// import {
//     setSearch,
//     setLowStockOnly,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openQuantityModal,
//     openBulkModal,
//     toggleSelectStock,
//     selectAllStocks,
//     clearSelectedStocks,
//     setLoading,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockSlice";
// import { CURRENT_USER, isAdmin } from "../../../roles";
// import StockQuantityModal from "./ShopStockShared/StockQuantityModal";
// import StockBulkModal from "./ShopStockShared/StockBulkModal";

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// const getStockStatus = (quantity, threshold) => {
//     if (quantity === 0) return { label: "Out of stock", color: "bg-red-100 text-red-700", icon: "🔴" };
//     if (quantity <= threshold) return { label: "Low stock", color: "bg-orange-100 text-orange-700", icon: "⚠️" };
//     return { label: "In stock", color: "bg-green-100 text-green-700", icon: "✅" };
// };

// export default function ShopStockTab() {
//     const dispatch = useDispatch();
//     const { user } = useSelector((state) => state.auth);
//     const {
//         search,
//         lowStockOnly,
//         currentPage,
//         pageSize,
//         selectedStockIds,
//         showQuantityModal,
//         showBulkModal,
//     } = useSelector((state) => state.shopStock);

//     const isShopOwner = user?.role === "SHOP_OWNER";
//     const isShopLister = user?.role === "SHOP_MANAGER";
//     const canEdit = isAdmin() || isShopOwner || isShopLister;

//     // Get user's shop ID
//     const userShopId = user?.shop_id || "";

//     // ── Queries ─────────────────────────────────────────────────────────
//     const { data, isLoading, isFetching, refetch } = useGetShopStocksQuery({
//         page: currentPage,
//         limit: pageSize,
//         search,
//         low_stock_only: lowStockOnly,
//         shop_id: userShopId,
//     });

//     const { data: lowStockAlerts, refetch: refetchAlerts } = useGetLowStockAlertsQuery({
//         shop_id: userShopId,
//     });

//     const stocks = data?.stocks || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };
//     const alerts = lowStockAlerts?.alerts || [];
//     const alertCount = lowStockAlerts?.count || 0;

//     // ── Stats ───────────────────────────────────────────────────────────
//     const totalSKUs = stocks.length;
//     const totalUnits = stocks.reduce((sum, s) => sum + (s.quantity_available || 0), 0);
//     const lowStockCount = stocks.filter(s => s.quantity_available > 0 && s.quantity_available <= (s.low_stock_threshold || 10)).length;
//     const outOfStockCount = stocks.filter(s => s.quantity_available === 0).length;

//     // ── Selection ───────────────────────────────────────────────────────
//     const allSelectedOnPage = stocks.length > 0 && stocks.every(s => selectedStockIds.includes(s.shop_stock_id));
//     const someSelected = stocks.some(s => selectedStockIds.includes(s.shop_stock_id));

//     const handleSelectAll = () => {
//         const currentStockIds = stocks.map(s => s.shop_stock_id);
//         if (allSelectedOnPage) {
//             const remainingIds = selectedStockIds.filter(id => !currentStockIds.includes(id));
//             dispatch(selectAllStocks({ stockIds: remainingIds, isSelected: false }));
//         } else {
//             const newIds = [...new Set([...selectedStockIds, ...currentStockIds])];
//             dispatch(selectAllStocks({ stockIds: newIds, isSelected: true }));
//         }
//     };

//     const handleRefresh = () => {
//         refetch();
//         refetchAlerts();
//         dispatch(clearSelectedStocks());
//     };

//     return (
//         <div className="space-y-5">

//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//                 <div>
//                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Shop Stock Management</h2>
//                     <p className="text-sm text-gray-500 mt-1">
//                         Manage stock levels for your shop — adjust quantities, track low stock, and bulk update
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2.5">
//                     {canEdit && (
//                         <button
//                             onClick={() => dispatch(openBulkModal())}
//                             className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
//                             disabled={stocks.length === 0}
//                         >
//                             <Layers size={16} /> Bulk Update
//                         </button>
//                     )}
//                     <button
//                         onClick={handleRefresh}
//                         className="px-3 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg cursor-pointer"
//                     >
//                         <RefreshCw size={14} className="inline mr-1" /> Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Low Stock Alert Banner */}
//             {alertCount > 0 && (
//                 <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center justify-between">
//                     <div className="flex items-center gap-2">
//                         <Bell size={18} className="text-orange-500" />
//                         <p className="text-sm text-orange-800 font-medium">
//                             {alertCount} low stock alert(s) — {alerts.map(a => a.variant?.product?.name).join(", ")}
//                         </p>
//                     </div>
//                     <button onClick={() => dispatch(setLowStockOnly(true))} className="text-xs text-orange-600 hover:underline">
//                         View all →
//                     </button>
//                 </div>
//             )}

//             {/* Stats Cards */}
//             <div className="grid grid-cols-4 gap-4">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Total SKUs</p>
//                         <Package size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{totalSKUs}</p>
//                     <p className="text-xs opacity-60 mt-1">in your shop</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Total Units</p>
//                         <TrendingUp size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{totalUnits.toLocaleString()}</p>
//                     <p className="text-xs opacity-60 mt-1">available for sale</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Low Stock</p>
//                         <AlertTriangle size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{lowStockCount}</p>
//                     <p className="text-xs opacity-60 mt-1">below threshold</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md">
//                     <div className="flex items-center justify-between mb-2">
//                         <p className="text-xs opacity-75 uppercase tracking-wide font-medium">Out of Stock</p>
//                         <AlertTriangle size={16} className="opacity-60" />
//                     </div>
//                     <p className="text-3xl font-bold">{outOfStockCount}</p>
//                     <p className="text-xs opacity-60 mt-1">needs restock</p>
//                 </div>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
//                 <div className="flex gap-3">
//                     <input
//                         value={search}
//                         onChange={(e) => dispatch(setSearch(e.target.value))}
//                         placeholder="Search by product name, SKU, or barcode..."
//                         className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                     <button
//                         onClick={() => dispatch(resetFilters())}
//                         className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
//                     >
//                         <X size={14} /> Clear
//                     </button>
//                 </div>
//                 <div className="flex gap-3 flex-wrap">
//                     <label className="flex items-center gap-2 cursor-pointer">
//                         <input
//                             type="checkbox"
//                             checked={lowStockOnly}
//                             onChange={(e) => dispatch(setLowStockOnly(e.target.checked))}
//                             className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
//                         />
//                         <span className="text-sm text-gray-700">Show low stock only</span>
//                     </label>
//                     <select
//                         value={pageSize}
//                         onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 ml-auto cursor-pointer"
//                     >
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Bulk Action Bar */}
//             {selectedStockIds.length > 0 && (
//                 <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
//                     <div className="bg-blue-600 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
//                         <span className="text-sm font-medium">{selectedStockIds.length} item(s) selected</span>
//                         <div className="w-px h-6 bg-gray-600" />
//                         <button
//                             onClick={() => dispatch(openBulkModal())}
//                             className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-full text-sm font-medium transition-colors"
//                         >
//                             <Layers size={14} /> Bulk Update
//                         </button>
//                         <button
//                             onClick={() => dispatch(clearSelectedStocks())}
//                             className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm transition-colors"
//                         >
//                             <X size={14} /> Clear
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* Table */}
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50 border-b border-gray-100">
//                         <tr>
//                             <th className="px-4 py-3 w-10">
//                                 {stocks.length > 0 && (
//                                     <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
//                                         {allSelectedOnPage ? <CheckSquare size={18} /> : someSelected ? <Square size={18} className="text-blue-500" /> : <Square size={18} />}
//                                     </button>
//                                 )}
//                             </th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Variant</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Available</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Reserved</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">In Transit</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Threshold</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Updated</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {(isLoading || isFetching) && (
//                             <tr>
//                                 <td colSpan={10} className="px-4 py-10 text-center">
//                                     <div className="flex justify-center">
//                                         <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//                                     </div>
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && !isFetching && stocks.length === 0 && (
//                             <tr>
//                                 <td colSpan={10} className="px-4 py-14 text-center">
//                                     <Package size={32} className="text-gray-300 mx-auto mb-2" />
//                                     <p className="text-gray-400 text-sm">No stock records found for your shop</p>
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && stocks.map((stock) => {
//                             const product = stock.variant?.product || {};
//                             const variant = stock.variant || {};
//                             const status = getStockStatus(stock.quantity_available, stock.low_stock_threshold);
//                             const variantAttr = variant.sku || variant.product_code || variant.system_barcode || "—";
//                             const isSelected = selectedStockIds.includes(stock.shop_stock_id);

//                             return (
//                                 <tr key={stock.shop_stock_id} className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}>
//                                     <td className="px-4 py-3">
//                                         <button onClick={() => dispatch(toggleSelectStock(stock.shop_stock_id))} className="text-gray-400 hover:text-blue-600">
//                                             {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
//                                         </button>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <p className="font-semibold text-gray-800">{product.name || "—"}</p>
//                                         <p className="text-xs font-mono text-gray-400">{product.product_code || "—"}</p>
//                                     </td>
//                                     <td className="px-4 py-3">
//                                         <p className="text-xs text-gray-700">{variantAttr}</p>
//                                     </td>
//                                     <td className="px-4 py-3 text-right font-bold text-gray-800">{stock.quantity_available}</td>
//                                     <td className="px-4 py-3 text-right text-gray-600">{stock.quantity_reserved || 0}</td>
//                                     <td className="px-4 py-3 text-right text-gray-600">{stock.quantity_in_transit || 0}</td>
//                                     <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.icon} {status.label}</span></td>
//                                     <td className="px-4 py-3"><span className="text-xs text-gray-500">{stock.low_stock_threshold || 10}</span></td>
//                                     <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(stock.updated_at)}</td>
//                                     <td className="px-4 py-3 text-center">
//                                         {canEdit && (
//                                             <button onClick={() => dispatch(openQuantityModal(stock))} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Adjust Quantity">
//                                                 <Edit2 size={15} />
//                                             </button>
//                                         )}
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Pagination */}
//             {meta.totalPages > 1 && (
//                 <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//                     <p className="text-sm text-gray-500">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}</p>
//                     <div className="flex gap-2">
//                         <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
//                         <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
//                         <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
//                     </div>
//                 </div>
//             )}

//             {/* Modals */}
//             {showQuantityModal && <StockQuantityModal onSuccess={handleRefresh} />}
//             {showBulkModal && <StockBulkModal onSuccess={handleRefresh} stocks={stocks} selectedStockIds={selectedStockIds} />}

//         </div>
//     );
// }