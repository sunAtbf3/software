// TABS/TRANSFERS/StockSearchTab.jsx
//
// Emergency Stock Search across all warehouses and shops
// Search by product_code, sku, barcode, variant_id
// Shows results with stock quantity and distance
// Click "Request" to create emergency transfer request

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search, MapPin, Warehouse, Store, Truck, RefreshCw, X } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useLazySearchStockQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/StockSearch_api/stockSearchApi";
import {
    setSearchType,
    setSearchValue,
    setCity,
    setNearbyOnly,
    setSearchResults,
    setLoading,
    setError,
    clearError,
    resetSearch,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/StockSearch_api/stockSearchSlice";
// import { openCreateModal, updateCreateForm } from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestSlice";
import { 
    openCreateModal, 
    updateCreateForm 
} from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestSlice";
import { 
    useCreateEmergencyTransferRequestMutation,
    generateIdempotencyKey 
} from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
import { CURRENT_USER } from "../../../roles";

const SEARCH_TYPES = [
    { value: "product_code", label: "Product Code", placeholder: "e.g., IP15CASE" },
    { value: "sku", label: "SKU", placeholder: "e.g., SKU-IP15-001" },
    { value: "barcode", label: "Barcode", placeholder: "e.g., 8901234567890" },
    { value: "variant_id", label: "Variant ID", placeholder: "e.g., var_iphone_001" },
];

const getLocationIcon = (type) => {
    if (type === "warehouse") return <Warehouse size={14} className="text-blue-500" />;
    return <Store size={14} className="text-green-500" />;
};

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function StockSearchTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { searchParams, searchResults, isLoading, error } = useSelector((state) => state.stockSearch);
    
    const [triggerSearch] = useLazySearchStockQuery();
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [requestQuantity, setRequestQuantity] = useState("");

    const handleSearch = async () => {
        if (!searchParams.searchValue.trim()) {
            toast.error("Please enter a search term");
            return;
        }

        dispatch(setLoading(true));
        dispatch(clearError());

        try {
            const params = {};
            params[searchParams.searchType] = searchParams.searchValue.trim();
            if (searchParams.city) params.city = searchParams.city;
            if (searchParams.nearby_only) params.nearby_only = true;

            const result = await triggerSearch(params).unwrap();
            dispatch(setSearchResults(result));

            const rows =
                Array.isArray(result.variants) && result.variants.length
                    ? result.variants
                    : [
                          {
                              warehouses: result.warehouses || [],
                              shops: result.shops || [],
                          },
                      ];
            const hasStock = rows.some(
                (row) => (row.warehouses?.length || 0) > 0 || (row.shops?.length || 0) > 0
            );
            if (!hasStock) {
                toast.info("No stock found matching your search");
            }
        } catch (err) {
            dispatch(setError(err?.data?.message || "Search failed"));
            toast.error("Search failed. Please try again.");
        } finally {
            dispatch(setLoading(false));
        }
    };

   const handleCreateEmergencyRequest = async (location) => {
    if (!requestQuantity || parseInt(requestQuantity) <= 0) {
        toast.error("Please enter valid quantity");
        return;
    }

    const locationType = location.warehouse_id ? "WH_TO_SHOP" : "SHOP_TO_SHOP";
    
    // Prepare payload for emergency API
    const payload = {
        request_type: locationType,
        quantity: parseInt(requestQuantity),
        variant_id: searchResults?.variant?.variant_id,
        priority: "HIGH",
        expected_delivery: new Date(Date.now() + 86400000).toISOString(),
        request_remarks: `Emergency request from search: ${searchParams.searchValue}`,
    };
    
    // Add source based on type
    if (location.warehouse_id) {
        payload.from_warehouse_id = location.warehouse_id;
        payload.to_shop_id = user?.shop_id;
    } else if (location.shop_id) {
        payload.from_shop_id = location.shop_id;
        payload.to_shop_id = user?.shop_id;
    }
    
    // Submit emergency request directly
    try {
        const mutation = useCreateEmergencyTransferRequest();
        await mutation({ idempotencyKey: generateIdempotencyKey(), ...payload }).unwrap();
        toast.success("🚨 Emergency transfer request created successfully");
        setSelectedLocation(null);
        setRequestQuantity("");
    } catch (err) {
        toast.error(err?.data?.message || "Failed to create emergency request");
    }
};

    const product = searchResults?.product;
    const variant = searchResults?.variant;
    const warehouses = searchResults?.warehouses || [];
    const shops = searchResults?.shops || [];

    return (
        <div className="space-y-5">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">🚨 Emergency Stock Search</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Search for products across all warehouses and shops — create emergency transfer requests instantly
                    </p>
                </div>
                <button onClick={() => dispatch(resetSearch())} className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-1">
                    <RefreshCw size={14} /> Reset
                </button>
            </div>

            {/* Search Form */}
            <div className="bg-white rounded-xl border border-gray-200 text-gray-700 p-5 space-y-4">
                <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Search By</label>
                        <select 
                            value={searchParams.searchType} 
                            onChange={(e) => dispatch(setSearchType(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            {SEARCH_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Search Value <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={searchParams.searchValue}
                            onChange={(e) => dispatch(setSearchValue(e.target.value))}
                            placeholder={SEARCH_TYPES.find(t => t.value === searchParams.searchType)?.placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                </div>
                <div className="flex gap-3 flex-wrap items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">City (Optional)</label>
                        <input
                            type="text"
                            value={searchParams.city}
                            onChange={(e) => dispatch(setCity(e.target.value))}
                            placeholder="Filter by city"
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                    <label className="flex items-center gap-2 pb-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={searchParams.nearby_only}
                            onChange={(e) => dispatch(setNearbyOnly(e.target.checked))}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Nearby only (same city)</span>
                    </label>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                    >
                        <Search size={16} /> {isLoading ? "Searching..." : "Search Stock"}
                    </button>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-600">{error}</div>}
            </div>

            {/* Search Results */}
            {searchResults && (
                <div className="space-y-4">
                    {/* Product Info */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 className="font-semibold text-gray-800">{product?.name}</h3>
                                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                    <span className="font-mono">Code: {product?.product_code}</span>
                                    <span className="font-mono">SKU: {variant?.sku}</span>
                                    {variant?.system_barcode && <span className="font-mono">Barcode: {variant?.system_barcode}</span>}
                                </div>
                            </div>
                            {variant?.attributes && (
                                <div className="flex gap-2">
                                    {Object.entries(variant.attributes).map(([k, v]) => (
                                        <span key={k} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{k}: {v}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warehouses Section */}
                    {warehouses.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Warehouse size={16} /> Warehouses</h4>
                            <div className="space-y-2">
                                {warehouses.map((wh, idx) => (
                                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-3">
                                                <Warehouse size={16} className="text-blue-500" />
                                                <div>
                                                    <p className="font-medium text-gray-800">{wh.warehouse_name}</p>
                                                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1"><MapPin size={10} /> {wh.city}</span>
                                                        <span>Stock: <span className="font-semibold text-gray-700">{wh.stock_quantity} units</span></span>
                                                        <span>Updated: {fmtDate(wh.last_updated)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { setSelectedLocation(wh); setRequestQuantity(wh.stock_quantity.toString()); }}
                                                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                                            >
                                                🚨 Emergency Request
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shops Section */}
                    {shops.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Store size={16} /> Shops</h4>
                            <div className="space-y-2">
                                {shops.map((shop, idx) => (
                                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-3">
                                                <Store size={16} className="text-green-500" />
                                                <div>
                                                    <p className="font-medium text-gray-800">{shop.shop_name}</p>
                                                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1"><MapPin size={10} /> {shop.city}</span>
                                                        <span>Stock: <span className="font-semibold text-gray-700">{shop.stock_quantity} units</span></span>
                                                        <span>Updated: {fmtDate(shop.last_updated)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { setSelectedLocation(shop); setRequestQuantity(shop.stock_quantity.toString()); }}
                                                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                                            >
                                                🚨 Emergency Request
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {warehouses.length === 0 && shops.length === 0 && (
                        <div className="text-center py-8 text-gray-400">No stock found</div>
                    )}
                </div>
            )}

            {/* Emergency Request Modal */}
            {selectedLocation && (
                <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">🚨 Emergency Request</h3>
                                <p className="text-xs text-gray-400">{selectedLocation.warehouse_name || selectedLocation.shop_name}</p>
                            </div>
                            <button onClick={() => setSelectedLocation(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                <p><strong>Product:</strong> {product?.name}</p>
                                <p><strong>Available Stock:</strong> {selectedLocation.stock_quantity} units</p>
                                <p><strong>Source Type:</strong> {selectedLocation.warehouse_id ? "Warehouse" : "Shop"}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Request Quantity <span className="text-red-500">*</span></label>
                                <input type="number" min="1" max={selectedLocation.stock_quantity} value={requestQuantity} onChange={(e) => setRequestQuantity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-xs text-red-600">⚠️ This will create a HIGH priority emergency request. Source manager will be notified immediately.</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => setSelectedLocation(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                            <button onClick={() => handleCreateEmergencyRequest(selectedLocation)} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Create Emergency Request</button>
                        </div>
                    </div>
    </div>
</div>
            )}

        </div>
    );
}