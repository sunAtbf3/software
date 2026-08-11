import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Package, Send } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { useLazyGetWarehouseStockCatalogQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopWarehouseCatalog_api/shopWarehouseCatalogApi";
import {
    useCreateBulkTransferRequestMutation,
    generateBulkIdempotencyKey,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferApi";
import VariantCatalogPicker from "./TransferRequestShared/VariantCatalogPicker";
import { useGetActiveComboRulesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ComboRule_api/comboRuleApi";

const MODE_OPTIONS = [
    { value: "existing", label: "Existing products", desc: "Already at your shop — restock selected variants" },
    { value: "new", label: "New products", desc: "Not yet in your shop — request from warehouse" },
];

export default function ShopStockRequestTab() {
    const { user } = useSelector((state) => state.auth);
    const userShopId = user?.shop_id || "";

    const [catalogMode, setCatalogMode] = useState("existing");
    const [warehouseId, setWarehouseId] = useState("");
    const [search, setSearch] = useState("");
    const [selection, setSelection] = useState({});
    const [remarks, setRemarks] = useState("");

    const { data: warehousesData } = useGetWarehousesQuery({ page: 1, limit: 50, is_active: "true" });
    const [fetchCatalog, { data: catalogData, isFetching: catalogLoading }] =
        useLazyGetWarehouseStockCatalogQuery();
    const [createBulkRequest, { isLoading: submitting }] = useCreateBulkTransferRequestMutation();

    const { data: activeComboRules } = useGetActiveComboRulesQuery();

    const warehouses = warehousesData?.warehouses || [];

    useEffect(() => {
        if (!warehouseId || !userShopId) return;
        fetchCatalog({
            shopId: userShopId,
            warehouse_id: warehouseId,
            mode: catalogMode,
            search: search.trim(),
            page: 1,
            limit: 100,
        });
    }, [warehouseId, catalogMode, userShopId, search, fetchCatalog]);

    const handleSelectionChange = (variantId, patch) => {
        setSelection((prev) => ({
            ...prev,
            [variantId]: { ...prev[variantId], ...patch },
        }));
    };

    const handleSelectAllProduct = (product, selectAll) => {
        setSelection((prev) => {
            const next = { ...prev };
            for (const v of product.variants || []) {
                if (!v.selectable) continue;
                if (selectAll) {
                    next[v.variant_id] = {
                        selected: true,
                        quantity: String(v.suggested_quantity || Math.min(1, v.warehouse_available)),
                        product_name: product.name,
                        sku: v.sku,
                        product_code: v.product_code,
                        available_stock: v.warehouse_available,
                        mrp: v.mrp ?? null,
                        special_price: v.special_price ?? null,
                        franchise_unit_price: v.franchise_unit_price ?? null,
                        purchase_price: v.purchase_price ?? null,
                    };
                } else {
                    next[v.variant_id] = { ...next[v.variant_id], selected: false };
                }
            }
            return next;
        });
    };

    const cartItems = useMemo(() => {
        return Object.entries(selection)
            .filter(([, s]) => s.selected)
            .map(([variantId, s]) => ({
                variant_id: variantId,
                product_name: s.product_name,
                sku: s.sku,
                product_code: s.product_code,
                quantity: s.quantity,
                available_stock: s.available_stock,
            }));
    }, [selection]);

    const handleSubmit = async () => {
        if (!warehouseId) {
            toast.error("Select a source warehouse");
            return;
        }
        if (!userShopId) {
            toast.error("Shop not linked to your account");
            return;
        }
        const invalid = cartItems.filter(
            (i) => !i.quantity || parseInt(i.quantity, 10) <= 0 || parseInt(i.quantity, 10) > i.available_stock
        );
        if (!cartItems.length) {
            toast.error("Select at least one variant");
            return;
        }
        if (invalid.length) {
            toast.error("Enter valid quantity for each selected variant (within warehouse stock)");
            return;
        }

        try {
            await createBulkRequest({
                idempotencyKey: generateBulkIdempotencyKey(),
                from_warehouse_id: warehouseId,
                to_shop_id: userShopId,
                request_type: "WH_TO_SHOP",
                request_remarks:
                    remarks.trim() ||
                    `${catalogMode === "new" ? "New products" : "Existing products"} stock request`,
                items: cartItems.map((i) => ({
                    variant_id: i.variant_id,
                    quantity: parseInt(i.quantity, 10),
                })),
            }).unwrap();
            toast.success("Bulk transfer request created");
            setSelection({});
            setRemarks("");
            fetchCatalog({
                shopId: userShopId,
                warehouse_id: warehouseId,
                mode: catalogMode,
                search: search.trim(),
                page: 1,
                limit: 100,
            });
        } catch (err) {
            toast.error(err?.data?.message || "Failed to create request");
        }
    };

    if (!userShopId) {
        return (
            <div className="p-6 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
                This flow is for shop owners. Link a shop to your account first.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Request Stock from Warehouse</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                    Pick specific variants (e.g. 2 of 4) — only selected SKUs move on dispatch
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODE_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                            setCatalogMode(opt.value);
                            setSelection({});
                        }}
                        className={`text-left p-4 rounded-xl border transition-colors ${
                            catalogMode === opt.value
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                    >
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p
                            className={`text-xs mt-1 ${
                                catalogMode === opt.value ? "text-gray-300" : "text-gray-400"
                            }`}
                        >
                            {opt.desc}
                        </p>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">
                            Source warehouse <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={warehouseId}
                            onChange={(e) => {
                                setWarehouseId(e.target.value);
                                setSelection({});
                            }}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Select warehouse</option>
                            {warehouses.map((w) => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.warehouse_name} — {w.city}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Search products</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name, code, SKU..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            disabled={!warehouseId}
                        />
                    </div>
                </div>

                {warehouseId && (
                    <VariantCatalogPicker
                        products={catalogData?.products || []}
                        selection={selection}
                        onSelectionChange={handleSelectionChange}
                        onSelectAllProduct={handleSelectAllProduct}
                        isLoading={catalogLoading}
                        franchisePricing={!!catalogData?.franchise_shop_pricing_view}
                        activeComboRules={activeComboRules || []}
                        emptyMessage={
                            catalogMode === "new"
                                ? "No new products with stock at this warehouse."
                                : "No existing shop products with stock at this warehouse."
                        }
                    />
                )}
            </div>

            {cartItems.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Package size={16} /> Request cart ({cartItems.length} variants)
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {cartItems.map((item) => (
                            <div
                                key={item.variant_id}
                                className="flex justify-between text-sm border-b border-gray-50 pb-1"
                            >
                                <span>
                                    {item.product_name}{" "}
                                    <span className="text-gray-400 font-mono text-xs">
                                        {item.product_code}
                                    </span>
                                </span>
                                <span className="font-medium">× {item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={2}
                        placeholder="Remarks (optional)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Send size={14} />
                        {submitting ? "Submitting..." : "Submit bulk request"}
                    </button>
                </div>
            )}
        </div>
    );
}
