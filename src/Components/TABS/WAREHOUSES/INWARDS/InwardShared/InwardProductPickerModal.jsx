// Map inward line → product + specific variant (SKU). Stock on MAPPED goes to selected variant only.

import React, { useState, useEffect, useMemo } from "react";
import { Search, X, Package, CheckCircle, AlertCircle, ChevronLeft } from "lucide-react";
import { useGetProductsQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
import { useUpdateInwardItemMutation } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Inward_api/inwardApi";

const formatAttributes = (attrs) => {
    if (!Array.isArray(attrs) || attrs.length === 0) return "";
    return attrs
        .filter((a) => a.value != null && String(a.value).trim() !== "")
        .map((a) => `${a.key}: ${a.value}`)
        .join(" · ");
};

const findVariantByText = (variants, text) => {
    if (!text?.trim() || !variants?.length) return null;
    const t = text.trim().toLowerCase();
    return variants.find(
        (v) =>
            v.sku?.toLowerCase() === t ||
            v.product_code?.toLowerCase() === t ||
            v.system_barcode?.toLowerCase() === t
    );
};

export default function InwardProductPickerModal({ item, inward, onClose, onSuccess }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [updateInwardItem] = useUpdateInwardItemMutation();

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: productsData, isLoading, isFetching } = useGetProductsQuery({
        page: 1,
        limit: 50,
        search: debouncedSearch,
        warehouse_id: inward.warehouse_id,
        is_active: "true",
    });

    const products = productsData?.products || [];
    const variants = useMemo(
        () => (selectedProduct?.variants || []).filter((v) => v.variant_id),
        [selectedProduct]
    );

    useEffect(() => {
        if (!selectedProduct) {
            setSelectedVariantId(null);
            return;
        }
        const list = selectedProduct.variants || [];
        if (list.length === 1) {
            setSelectedVariantId(list[0].variant_id);
            return;
        }
        const matched = findVariantByText(list, item.variant_text);
        if (matched) setSelectedVariantId(matched.variant_id);
    }, [selectedProduct, item.variant_text]);

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setSelectedVariantId(null);
        setError(null);
    };

    const handleBackToProducts = () => {
        setSelectedProduct(null);
        setSelectedVariantId(null);
    };

    const handleConfirmMapping = async () => {
        if (!selectedProduct?.product_id) {
            setError("Please select a product");
            return;
        }
        if (!selectedVariantId) {
            setError("Please select a variant (SKU)");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await updateInwardItem({
                inwardId: inward.inward_id,
                inwardItemId: item.inward_item_id,
                mapped_product_id: selectedProduct.product_id,
                mapped_variant_id: selectedVariantId,
            }).unwrap();

            onSuccess();
        } catch (err) {
            const message = err?.data?.message || "Failed to map product";
            if (err?.data?.code === "VARIANT_SELECTION_REQUIRED") {
                setError("This product has multiple variants — select the correct SKU below.");
            } else {
                setError(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Map to Product & Variant</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {selectedProduct
                                ? `Choose SKU for "${item.item_name}"`
                                : `Select product, then variant (SKU) for "${item.item_name}"`}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-blue-50 border-b border-blue-100 px-5 py-3 text-sm">
                    <div className="flex justify-between">
                        <div>
                            <span className="text-xs text-blue-600 font-medium">Received line</span>
                            <p className="font-medium text-gray-800">{item.item_name}</p>
                            {item.variant_text && (
                                <p className="text-xs text-gray-500">Vendor text: {item.variant_text}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-blue-600 font-medium">Qty</span>
                            <p className="font-semibold">{item.quantity_received} units</p>
                        </div>
                    </div>
                </div>

                {!selectedProduct ? (
                    <>
                        <div className="p-5 border-b border-gray-100">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search product name, SKU, barcode..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Warehouse: {inward.warehouse?.warehouse_name || inward.warehouse_id}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-2">
                            {(isLoading || isFetching) && (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            {!isLoading && !isFetching && products.length === 0 && (
                                <div className="text-center py-12 text-gray-400 text-sm">No products found</div>
                            )}
                            {products.map((product) => {
                                const variantCount = product.variants?.length || 0;
                                return (
                                    <button
                                        key={product.product_id}
                                        type="button"
                                        onClick={() => handleSelectProduct(product)}
                                        className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-gray-50 transition-all"
                                    >
                                        <p className="font-semibold text-gray-800">{product.name}</p>
                                        {product.brand_name && (
                                            <p className="text-xs text-gray-400">{product.brand_name}</p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            {variantCount} variant{variantCount !== 1 ? "s" : ""} — tap to choose SKU →
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleBackToProducts}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                                <ChevronLeft size={14} /> Change product
                            </button>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-sm font-medium text-gray-700">{selectedProduct.name}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-2">
                            {variants.length === 0 && (
                                <p className="text-sm text-red-600">No active variants on this product.</p>
                            )}
                            {variants.map((variant) => {
                                const isSelected = selectedVariantId === variant.variant_id;
                                const attrs = formatAttributes(variant.attributes);
                                return (
                                    <button
                                        key={variant.variant_id}
                                        type="button"
                                        onClick={() => setSelectedVariantId(variant.variant_id)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                            isSelected
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-blue-300"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-mono font-semibold text-gray-800">{variant.sku}</p>
                                                <p className="text-xs font-semibold text-blue-600">
                                                    {variant.product_code}
                                                    {variant.system_barcode && (
                                                        <span className="font-medium text-gray-500"> · Barcode: {variant.system_barcode}</span>
                                                    )}
                                                </p>
                                                {attrs && <p className="text-xs text-gray-600 mt-1">{attrs}</p>}
                                                {variant.is_default && (
                                                    <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            {isSelected && <CheckCircle size={20} className="text-blue-500 shrink-0" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {error && (
                    <div className="mx-5 mb-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex gap-2">
                        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div className="border-t border-gray-100 p-5 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmMapping}
                        disabled={!selectedProduct || !selectedVariantId || isSubmitting}
                        className={`px-5 py-2 rounded-lg text-sm font-medium text-white ${
                            !selectedProduct || !selectedVariantId || isSubmitting
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {isSubmitting
                            ? "Mapping..."
                            : selectedVariant
                              ? `Map to ${selectedVariant.sku} →`
                              : "Confirm Mapping →"}
                    </button>
                </div>
            </div>
        </div>
    );
}
