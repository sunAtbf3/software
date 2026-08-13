// TABS/WAREHOUSES/INVENTORY_STOCK/StockManualAddModal.jsx
//
// Manual stock creation
// Uses POST /product-stocks
// For direct stock addition without inward process

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Search, AlertTriangle } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useCreateStockMutation } from "../../../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockApi";
import { useGetProductsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import {
    closeManualAddModal,
    updateManualForm,
    setManualErrors,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockSlice";
import { CURRENT_USER } from "../../../roles";

export default function StockManualAddModal({ onSuccess }) {
    const dispatch = useDispatch();
    const { manualForm, manualErrors } = useSelector((state) => state.stock);
    const { user } = useSelector((state) => state.auth);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [showProductList, setShowProductList] = useState(false);
    const [createStock] = useCreateStockMutation();

    const isSuperAdmin = user?.role === "SUPER_ADMIN";
    const isWHRole = ["WH_MANAGER", "WH_STOCK_LISTER"].includes(user?.role);
    // const userWarehouseId = user?.warehouse_id || "";
    const userWarehouseId = user?.locationId || user?.warehouseId || user?.warehouse_id || "";

    // Fetch products for selection
    const { data: productsData, isLoading: productsLoading } = useGetProductsQuery({
        page: 1,
        limit: 100,
        search: searchTerm,
        warehouse_id: isWHRole ? userWarehouseId : manualForm.warehouse_id,
        is_active: "true",
    });

    const { data: warehousesData } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: false }
    );
    const warehouses = warehousesData?.warehouses || [];

    const products = productsData?.products || [];

    // Auto-set warehouse_id for WH roles
    useEffect(() => {
        if (isWHRole && userWarehouseId) {
            dispatch(updateManualForm({ warehouse_id: userWarehouseId }));
        }
    }, [isWHRole, userWarehouseId]);
    console.log("Full user object:", user);
    console.log("warehouse_id:", user?.warehouse_id);
    console.log("locationId:", user?.locationId);
    console.log("warehouseId:", user?.warehouseId);

    const inputCls = (name) =>
        `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${manualErrors[name] ? "border-red-400" : "border-gray-300"
        }`;

    const errorMsg = (name) =>
        manualErrors[name] ? (
            <p className="text-xs text-red-500 mt-1">{manualErrors[name]}</p>
        ) : null;

    const validate = () => {
        const errors = {};
        if (!manualForm.variant_id) {
            errors.variant_id = "Please select a product variant";
        }
        if (!manualForm.quantity || manualForm.quantity <= 0) {
            errors.quantity = "Quantity must be greater than 0";
        }
        if (!manualForm.room_zone) {
            errors.room_zone = "Zone is required";
        }
        if (!manualForm.rack_shelf) {
            errors.rack_shelf = "Rack/Shelf is required";
        }
        if (manualForm.low_stock_threshold < 0) {
            errors.low_stock_threshold = "Threshold cannot be negative";
        }
        return errors;
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setSelectedVariant(product.primary_variant || product.variants?.[0] || null);
        setShowProductList(false);
        setSearchTerm(product.name);

        if (selectedVariant) {
            dispatch(updateManualForm({ variant_id: selectedVariant.variant_id }));
        }
    };

    const handleVariantChange = (variantId) => {
        const variant = selectedProduct?.variants?.find(v => v.variant_id === variantId);
        setSelectedVariant(variant);
        dispatch(updateManualForm({ variant_id: variantId }));
    };

    const handleSave = async () => {
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            dispatch(setManualErrors(errors));
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                variant_id: manualForm.variant_id,
                quantity: parseInt(manualForm.quantity),
                room_zone: manualForm.room_zone,
                rack_shelf: manualForm.rack_shelf,
                position: manualForm.position || null,
                batch_number: manualForm.batch_number || "",
                expiry_date: manualForm.expiry_date ? new Date(manualForm.expiry_date).toISOString() : null,
                low_stock_threshold: parseInt(manualForm.low_stock_threshold) || 10,
                remarks: manualForm.remarks || null,
            };

            // Add warehouse_id for SUPER_ADMIN only
            if (isSuperAdmin && manualForm.warehouse_id) {
                payload.warehouse_id = manualForm.warehouse_id;
            }

            await createStock(payload).unwrap();
            toast.success("Stock added successfully");
            dispatch(closeManualAddModal());
            if (onSuccess) onSuccess();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const be = {};
                err.data.errors.forEach(({ field, message }) => { be[field] = message; });
                dispatch(setManualErrors(be));
            } else {
                toast.error(err?.data?.message || "Failed to add stock");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Manual Stock Addition</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Add stock directly without inward process
                        </p>
                    </div>
                    <button
                        onClick={() => dispatch(closeManualAddModal())}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-5">

                    {/* Warehouse (SUPER_ADMIN only) */}
                    {/* Warehouse - HIDDEN for WH roles, DROPDOWN for SUPER_ADMIN */}
                    {isSuperAdmin ? (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Warehouse <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={manualForm.warehouse_id}
                                onChange={(e) => dispatch(updateManualForm({ warehouse_id: e.target.value }))}
                                className={inputCls("warehouse_id")}
                            >
                                <option value="">Select Warehouse</option>
                                {warehouses.map(w => (
                                    <option key={w.warehouse_id} value={w.warehouse_id}>
                                        {w.warehouse_name} — {w.city}
                                    </option>
                                ))}
                            </select>
                            {errorMsg("warehouse_id")}
                        </div>
                    ) : (
                        // WH roles: warehouse is auto-set, UI name shown
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Warehouse
                            </label>
                            <input
                                type="text"
                                value={warehouses.find(w => w.warehouse_id === manualForm.warehouse_id)?.warehouse_name || manualForm.warehouse_id}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                            />
                        </div>
                    )}

                    {/* Product Search */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Product <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowProductList(true);
                                    setSelectedProduct(null);
                                    setSelectedVariant(null);
                                }}
                                onFocus={() => setShowProductList(true)}
                                placeholder="Search by product name, SKU, or barcode..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Product List Dropdown */}
                        {showProductList && searchTerm.length > 1 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {productsLoading ? (
                                    <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>
                                ) : products.length === 0 ? (
                                    <div className="px-4 py-2 text-sm text-gray-400">No products found</div>
                                ) : (
                                    products.map(product => (
                                        <div
                                            key={product.product_id}
                                            onClick={() => handleSelectProduct(product)}
                                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                        >
                                            <p className="text-sm font-medium text-gray-800">{product.name}</p>
                                            <p className="text-xs font-semibold text-blue-600">{product.product_code}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {product.variant_count} variant(s)
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        {errorMsg("variant_id")}
                    </div>

                    {/* Variant Selection (if product has multiple variants) */}
                    {selectedProduct && selectedProduct.variant_count > 1 && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Variant <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedVariant?.variant_id || ""}
                                onChange={(e) => handleVariantChange(e.target.value)}
                                className={inputCls("variant_id")}
                            >
                                <option value="">Select variant</option>
                                {selectedProduct.variants?.map(variant => (
                                    <option key={variant.variant_id} value={variant.variant_id}>
                                    {variant.sku || variant.system_barcode || variant.product_code}
                                    {variant.attributes?.length
                                        ? ` - ${variant.attributes.map(a => `${a.key}: ${a.value}`).join(", ")}`
                                        : ""}
                                </option>
                                ))}
                            </select>
                            {errorMsg("variant_id")}
                        </div>
                    )}

                    {/* Quantity */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={manualForm.quantity}
                            onChange={(e) => dispatch(updateManualForm({ quantity: e.target.value }))}
                            placeholder="e.g., 100"
                            className={inputCls("quantity")}
                        />
                        {errorMsg("quantity")}
                    </div>

                    {/* Location Fields */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Location <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <input
                                    value={manualForm.room_zone}
                                    onChange={(e) => dispatch(updateManualForm({ room_zone: e.target.value }))}
                                    placeholder="Zone"
                                    className={inputCls("room_zone")}
                                />
                                {errorMsg("room_zone")}
                            </div>
                            <div>
                                <input
                                    value={manualForm.rack_shelf}
                                    onChange={(e) => dispatch(updateManualForm({ rack_shelf: e.target.value }))}
                                    placeholder="Rack/Shelf"
                                    className={inputCls("rack_shelf")}
                                />
                                {errorMsg("rack_shelf")}
                            </div>
                            <div>
                                <input
                                    value={manualForm.position}
                                    onChange={(e) => dispatch(updateManualForm({ position: e.target.value }))}
                                    placeholder="Position"
                                    className={inputCls("position")}
                                />
                                {errorMsg("position")}
                            </div>
                        </div>
                    </div>

                    {/* Batch Number */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Batch Number</label>
                        <input
                            value={manualForm.batch_number}
                            onChange={(e) => dispatch(updateManualForm({ batch_number: e.target.value }))}
                            placeholder="e.g., BATCH-MANUAL-001"
                            className={inputCls("batch_number")}
                        />
                        {errorMsg("batch_number")}
                    </div>

                    {/* Expiry Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                        <input
                            type="date"
                            value={manualForm.expiry_date}
                            onChange={(e) => dispatch(updateManualForm({ expiry_date: e.target.value }))}
                            className={inputCls("expiry_date")}
                        />
                        {errorMsg("expiry_date")}
                    </div>

                    {/* Low Stock Threshold */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                        <input
                            type="number"
                            min="0"
                            value={manualForm.low_stock_threshold}
                            onChange={(e) => dispatch(updateManualForm({ low_stock_threshold: parseInt(e.target.value) || 0 }))}
                            className={inputCls("low_stock_threshold")}
                        />
                        {errorMsg("low_stock_threshold")}
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                            value={manualForm.remarks}
                            onChange={(e) => dispatch(updateManualForm({ remarks: e.target.value }))}
                            rows={2}
                            placeholder="Reason for manual stock addition"
                            className={`${inputCls("remarks")} resize-none`}
                        />
                        {errorMsg("remarks")}
                    </div>

                    {/* Warning Note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700">
                            ⚠️ Manual stock addition creates a stock ledger entry with type "ADJUSTMENT".
                            For audit trail, prefer using inward process when possible.
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={() => dispatch(closeManualAddModal())}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                    >
                        {isSubmitting ? "Adding..." : "Add Stock"}
                    </button>
                </div>

            </div>
    </div>
</div>
    );
}