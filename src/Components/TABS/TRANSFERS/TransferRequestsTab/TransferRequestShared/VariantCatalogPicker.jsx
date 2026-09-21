import React, { useMemo, useState } from "react";
import { Package } from "lucide-react";
import {
    buildSameProductComboHints,
    describeComboQtyProgress,
    describeFranchiseComboBlend,
    resolveTransferComboOffer,
} from "../../../../../utils/comboPricing.utils";
import {
    ComboOfferDisplay,
    ComboQtyHint,
    FranchisePriceDisplay,
} from "./ComboOfferDisplay";

const fmtMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

/** Small product thumb — fails soft to Package icon if URL broken/missing. */
function VariantThumb({ src, alt, sizeClass = "w-10 h-10" }) {
    const [failed, setFailed] = useState(false);
    const showImage = Boolean(src) && !failed;

    return (
        <div
            className={`${sizeClass} rounded-md overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center`}
        >
            {showImage ? (
                <img
                    src={src}
                    alt={alt || "Product"}
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <Package size={16} className="text-gray-300" />
            )}
        </div>
    );
}

const buildSelectionPatch = (product, variant, checked, existingQty) => {
    const maxQty = variant.warehouse_available ?? 0;
    return {
        selected: checked,
        quantity:
            checked && !existingQty
                ? String(variant.suggested_quantity || Math.min(1, maxQty) || 1)
                : existingQty,
        product_name: product.name,
        sku: variant.sku,
        product_code: variant.product_code,
        image_url: variant.image_url || null,
        available_stock: maxQty,
        mrp: variant.mrp ?? null,
        special_price: variant.special_price ?? null,
        franchise_unit_price: variant.franchise_unit_price ?? null,
        franchise_combo_unit_price: variant.franchise_combo_unit_price ?? null,
        combo_trigger_qty: variant.combo_trigger_qty ?? null,
        combo_price: variant.combo_price ?? null,
        combo_unit_price: variant.combo_unit_price ?? null,
        purchase_price: variant.purchase_price ?? null,
        combo_eligible: variant.combo_eligible === true,
    };
};

const resolveFranchiseBlend = (variant, sel, combo, markupPercent) => {
    const qty = sel?.selected ? sel.quantity : 0;
    return describeFranchiseComboBlend({
        qty,
        franchiseUnitPrice: variant.franchise_unit_price ?? sel?.franchise_unit_price,
        franchiseComboUnitPrice:
            variant.franchise_combo_unit_price ?? sel?.franchise_combo_unit_price,
        comboTriggerQty:
            variant.combo_trigger_qty ||
            sel?.combo_trigger_qty ||
            combo?.trigger,
        comboEligible: variant.combo_eligible === true || sel?.combo_eligible === true,
        specialPrice: variant.special_price ?? sel?.special_price,
        comboSellingUnit: variant.combo_unit_price ?? combo?.unit,
        purchasePrice: variant.purchase_price ?? sel?.purchase_price,
        markupPercent,
    });
};

function VariantCard({
    product,
    variant,
    isMulti,
    selection,
    onSelectionChange,
    showPurchase,
    showSpecial,
    showMrp,
    showFranchisePrice,
    showCombo = false,
    activeComboRules = [],
    franchiseMarkupPercent = null,
}) {
    const sel = selection[variant.variant_id] || { selected: false, quantity: "" };
    const maxQty = variant.warehouse_available ?? 0;
    const isSelected = !!sel.selected;
    const combo = resolveTransferComboOffer(variant, activeComboRules);
    const comboProgress = describeComboQtyProgress({
        qty: isSelected ? sel.quantity : 0,
        triggerQty: combo.trigger,
        comboEligible: combo.eligible,
    });
    const fBlend = showFranchisePrice
        ? resolveFranchiseBlend(variant, sel, combo, franchiseMarkupPercent)
        : null;

    return (
        <div
            className={`rounded-lg border p-3 space-y-2 ${
                isSelected ? "border-blue-200 bg-blue-50/50" : "border-gray-200 bg-white"
            }`}
        >
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!variant.selectable}
                    onChange={(e) =>
                        onSelectionChange(
                            variant.variant_id,
                            buildSelectionPatch(product, variant, e.target.checked, sel.quantity)
                        )
                    }
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 shrink-0"
                />
                <div className="flex-1 min-w-0 flex items-start gap-2.5">
                    <VariantThumb
                        src={variant.image_url}
                        alt={product.name}
                        sizeClass="w-11 h-11"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 leading-snug">
                            {isMulti ? `↳ ${product.name}` : product.name}
                        </p>
                        <p className="text-xs font-semibold text-blue-600 mt-0.5">
                            {variant.product_code}
                            {variant.sku && variant.sku !== variant.product_code ? (
                                <span className="font-medium text-gray-400"> · {variant.sku}</span>
                            ) : null}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <input
                        type="number"
                        min={1}
                        max={maxQty}
                        value={sel.quantity}
                        disabled={!isSelected || !variant.selectable}
                        onChange={(e) =>
                            onSelectionChange(variant.variant_id, { quantity: e.target.value })
                        }
                        className={`w-16 px-2 py-1 text-sm border rounded-lg text-center tabular-nums ${
                            isSelected ? "border-gray-300 bg-white" : "border-gray-100 bg-gray-50 text-gray-300"
                        }`}
                        placeholder="Qty"
                    />
                    <ComboQtyHint
                        progress={comboProgress}
                        selected={isSelected}
                        cheaper={fBlend?.cheaper === true}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs pl-7">
                <div className="flex justify-between gap-2">
                    <span className="text-gray-400">WH Stock</span>
                    <span className="font-medium text-gray-700 tabular-nums">{maxQty}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Shop Stock</span>
                    <span className="text-gray-600 tabular-nums">{variant.shop_available ?? 0}</span>
                </div>
                {showPurchase && (
                    <div className="flex justify-between gap-2">
                        <span className="text-gray-400">Purchase</span>
                        <span className="text-gray-600 tabular-nums">{fmtMoney(variant.purchase_price)}</span>
                    </div>
                )}
                {showMrp && (
                    <div className="flex justify-between gap-2">
                        <span className="text-gray-400">MRP</span>
                        <span className="text-gray-700 tabular-nums">{fmtMoney(variant.mrp)}</span>
                    </div>
                )}
                {showFranchisePrice && (
                    <div className="flex justify-between gap-2 items-start">
                        <span className="text-indigo-500">F. Price</span>
                        <FranchisePriceDisplay blend={fBlend} />
                    </div>
                )}
                {combo.eligible && (
                    <div className="flex justify-between gap-2 col-span-2 items-start">
                        <span className="text-blue-700 font-medium">
                            {showFranchisePrice ? "Shop offer" : "Combo / Offer"}
                        </span>
                        <ComboOfferDisplay
                            offer={combo}
                            transferIncentive={showFranchisePrice}
                            cheaper={fBlend?.cheaper === true}
                        />
                    </div>
                )}
                {showSpecial && (
                    <div className="flex justify-between gap-2">
                        <span className="text-emerald-600">Spl/Sale Price</span>
                        <span className="font-medium text-emerald-700 tabular-nums">
                            {variant.special_price != null ? fmtMoney(variant.special_price) : "—"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Flat table variant picker — inventory/billing style, responsive across screen sizes.
 */
export default function VariantCatalogPicker({
    products = [],
    selection = {},
    onSelectionChange,
    onSelectAllProduct,
    isLoading = false,
    emptyMessage = "No products found for this warehouse and mode.",
    franchisePricing = false,
    warehouseFranchiseView = false,
    activeComboRules = [],
    franchiseMarkupPercent = null,
}) {
    const totalSelected = useMemo(
        () => Object.values(selection).filter((s) => s.selected).length,
        [selection]
    );

    const tableRows = useMemo(() => {
        const rows = [];
        for (const product of products) {
            const variants = (product.variants || []).filter((v) => v.selectable !== false);
            if (!variants.length) continue;

            const isMulti = variants.length > 1;
            if (isMulti) {
                rows.push({ kind: "group", product, variants });
            }
            for (const variant of variants) {
                rows.push({ kind: "variant", product, variant, isMulti });
            }
        }
        return rows;
    }, [products]);

    const comboHints = useMemo(() => {
        const selected = Object.entries(selection)
            .filter(([, s]) => s?.selected)
            .map(([variantId, s]) => ({
                variant_id: variantId,
                product_name: s.product_name,
                product_code: s.product_code,
                quantity: s.quantity,
                special_price: s.special_price,
                combo_eligible: s.combo_eligible === true,
                combo_trigger_qty: s.combo_trigger_qty ?? null,
                combo_price: s.combo_price ?? null,
                combo_unit_price: s.combo_unit_price ?? null,
            }));
        return buildSameProductComboHints(selected, activeComboRules);
    }, [selection, activeComboRules]);

    if (isLoading) {
        return (
            <div className="text-center py-8 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                Loading catalog...
            </div>
        );
    }

    if (!products.length) {
        return (
            <div className="text-center py-8 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                {emptyMessage}
            </div>
        );
    }

    const showPurchase = warehouseFranchiseView;
    // Franchise shop managers need Spl/Sale Price to compare against F.Price (cost).
    const showSpecial = true;
    const showMrp = franchisePricing || warehouseFranchiseView;
    const showFranchisePrice = franchisePricing || warehouseFranchiseView;
    // Combo is a selling offer for every shop — not franchise-only.
    const showCombo = true;

    const colCount =
        5 +
        (showPurchase ? 1 : 0) +
        (showSpecial ? 1 : 0) +
        (showMrp ? 1 : 0) +
        (showFranchisePrice ? 1 : 0) +
        (showCombo ? 1 : 0);

    const cardProps = {
        selection,
        onSelectionChange,
        showPurchase,
        showSpecial,
        showMrp,
        showFranchisePrice,
        showCombo,
        activeComboRules,
        franchiseMarkupPercent,
    };

    return (
        <div className="space-y-2 w-full min-w-0">
            <p className="text-xs text-gray-500">
                {totalSelected} variant(s) selected — tick rows and enter quantity
                {showFranchisePrice
                    ? " · Same product: combo qty can lower F.Price"
                    : showCombo
                      ? " · Shop offer is on the same product only"
                      : ""}
            </p>

            {comboHints.groups.length > 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 space-y-1">
                    {comboHints.groups.map((group) => (
                        <p key={group.variant_id} className="text-[11px] text-blue-800 leading-snug">
                            {group.sets_applied > 0 ? (
                                <>
                                    <span className="font-semibold">{group.product_name}</span>
                                    {" — "}
                                    {group.sets_applied} set{group.sets_applied > 1 ? "s" : ""} of{" "}
                                    {group.trigger_qty} for ₹{Number(group.combo_price).toFixed(0)}
                                    {group.needed_for_next > 0
                                        ? ` · add ${group.needed_for_next} more of this product for next set${
                                              showFranchisePrice ? " (cheaper F)" : ""
                                          }`
                                        : showFranchisePrice
                                          ? " · cheaper F.Price on this qty"
                                          : ""}
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold">{group.product_name}</span>
                                    {" — "}
                                    {group.trigger_qty} for ₹{Number(group.combo_price).toFixed(0)}
                                    {" · add "}
                                    {group.needed_for_next} more of this product
                                    {showFranchisePrice
                                        ? " for cheaper F.Price"
                                        : " to unlock"}
                                </>
                            )}
                        </p>
                    ))}
                </div>
            )}

            {/* Mobile / small tablet — card layout, no horizontal scroll */}
            <div className="md:hidden space-y-2 max-h-[min(60vh,28rem)] overflow-y-auto">
                {tableRows.map((row) => {
                    if (row.kind === "group") {
                        const { product, variants } = row;
                        const selectedInProduct = variants.filter(
                            (v) => selection[v.variant_id]?.selected
                        ).length;
                        const allSelected =
                            variants.length > 0 && selectedInProduct === variants.length;

                        return (
                            <div
                                key={`group-${product.product_id}`}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate">
                                            {product.name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-mono">
                                            {product.product_code} · {variants.length} variants
                                        </p>
                                    </div>
                                    {onSelectAllProduct && (
                                        <button
                                            type="button"
                                            onClick={() => onSelectAllProduct(product, !allSelected)}
                                            className="text-xs text-blue-600 hover:underline shrink-0"
                                        >
                                            {allSelected ? "Clear all" : "Select all"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <VariantCard
                            key={row.variant.variant_id}
                            product={row.product}
                            variant={row.variant}
                            isMulti={row.isMulti}
                            {...cardProps}
                        />
                    );
                })}
            </div>

            {/* Desktop / tablet — table */}
            <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[min(60vh,28rem)] overflow-y-auto">
                    <table className="w-full min-w-[820px] text-sm">
                        <colgroup>
                            <col className="w-[4%]" />
                            <col className="w-[24%]" />
                            <col className="w-[12%]" />
                            <col className="w-[7%]" />
                            <col className="w-[7%]" />
                            {showPurchase && <col className="w-[8%]" />}
                            {showMrp && <col className="w-[8%]" />}
                            {showFranchisePrice && <col className="w-[8%]" />}
                            {showCombo && <col className="w-[10%]" />}
                            {showSpecial && <col className="w-[9%]" />}
                            <col className="w-[9%]" />
                        </colgroup>
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-1 lg:px-2 py-2" />
                                <th className="px-2 lg:px-3 py-2 text-left text-[10px] lg:text-xs font-semibold text-gray-500">
                                    Product
                                </th>
                                <th className="px-2 lg:px-3 py-2 text-left text-[10px] lg:text-xs font-semibold text-gray-500">
                                    Code / SKU
                                </th>
                                <th className="px-1 lg:px-2 py-2 text-right text-[10px] lg:text-xs font-semibold text-gray-500">
                                    WH Stock
                                </th>
                                <th className="px-1 lg:px-2 py-2 text-right text-[10px] lg:text-xs font-semibold text-gray-500">
                                    Shop Stock
                                </th>
                                {showPurchase && (
                                    <th className="px-1 lg:px-2 py-2 text-right text-[10px] lg:text-xs font-semibold text-gray-500">
                                        Purchase
                                    </th>
                                )}
                                {showMrp && (
                                    <th className="px-1 lg:px-2 py-2 text-right text-[10px] lg:text-xs font-semibold text-gray-500">
                                        MRP
                                    </th>
                                )}
                                {showFranchisePrice && (
                                    <th className="px-1 lg:px-2 py-2 text-right text-[10px] lg:text-xs font-semibold text-indigo-600">
                                        F. Price
                                    </th>
                                )}
                                {showCombo && (
                                    <th className="px-1 lg:px-2 py-2 text-right text-[10px] lg:text-xs font-semibold text-blue-700 leading-tight">
                                        {showFranchisePrice ? "Shop offer" : "Combo / Offer"}
                                    </th>
                                )}
                                {showSpecial && (
                                    <th className="px-1 lg:px-2 py-2 text-right text-[10px] lg:text-xs font-semibold text-emerald-700">
                                        Spl/Sale Price
                                    </th>
                                )}
                                <th className="px-1 lg:px-2 py-2 text-center text-[10px] lg:text-xs font-semibold text-gray-500">
                                    Qty
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tableRows.map((row) => {
                                if (row.kind === "group") {
                                    const { product, variants } = row;
                                    const selectedInProduct = variants.filter(
                                        (v) => selection[v.variant_id]?.selected
                                    ).length;
                                    const allSelected =
                                        variants.length > 0 && selectedInProduct === variants.length;

                                    return (
                                        <tr key={`group-${product.product_id}`} className="bg-slate-50">
                                            <td colSpan={colCount} className="px-2 lg:px-3 py-1.5">
                                                <div className="flex items-center justify-between gap-2 min-w-0">
                                                    <div className="min-w-0 truncate">
                                                        <span className="text-xs font-semibold text-gray-700">
                                                            {product.name}
                                                        </span>
                                                        <span className="text-xs font-semibold text-blue-600 ml-2">
                                                            {product.product_code}
                                                        </span>
                                                        <span className="text-xs text-gray-400 ml-1 hidden lg:inline">
                                                            · {variants.length} variants
                                                        </span>
                                                    </div>
                                                    {onSelectAllProduct && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onSelectAllProduct(product, !allSelected)
                                                            }
                                                            className="text-xs text-blue-600 hover:underline shrink-0"
                                                        >
                                                            {allSelected ? "Clear all" : "Select all"}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                const { product, variant, isMulti } = row;
                                const sel = selection[variant.variant_id] || {
                                    selected: false,
                                    quantity: "",
                                };
                                const maxQty = variant.warehouse_available ?? 0;
                                const shopStock = variant.shop_available ?? 0;
                                const isSelected = !!sel.selected;
                                const combo = resolveTransferComboOffer(variant, activeComboRules);
                                const comboProgress = describeComboQtyProgress({
                                    qty: isSelected ? sel.quantity : 0,
                                    triggerQty: combo.trigger,
                                    comboEligible: combo.eligible,
                                });
                                const fBlend = showFranchisePrice
                                    ? resolveFranchiseBlend(
                                          variant,
                                          sel,
                                          combo,
                                          franchiseMarkupPercent
                                      )
                                    : null;

                                return (
                                    <tr
                                        key={variant.variant_id}
                                        className={`hover:bg-gray-50/80 ${
                                            isSelected
                                                ? "bg-blue-50/40"
                                                : combo.hasOffer
                                                  ? "bg-sky-50/50"
                                                  : ""
                                        }`}
                                    >
                                        <td className="px-1 lg:px-2 py-2 text-center align-middle">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={!variant.selectable}
                                                onChange={(e) =>
                                                    onSelectionChange(
                                                        variant.variant_id,
                                                        buildSelectionPatch(
                                                            product,
                                                            variant,
                                                            e.target.checked,
                                                            sel.quantity
                                                        )
                                                    )
                                                }
                                                className="w-4 h-4 rounded border-gray-300"
                                            />
                                        </td>
                                        <td
                                            className={`px-2 lg:px-3 py-2 align-middle text-gray-800 ${
                                                isMulti ? "pl-4 lg:pl-6" : ""
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <VariantThumb
                                                    src={variant.image_url}
                                                    alt={product.name}
                                                    sizeClass="w-10 h-10"
                                                />
                                                <span
                                                    className="block text-xs lg:text-sm font-medium truncate min-w-0"
                                                    title={product.name}
                                                >
                                                    {isMulti ? (
                                                        <span className="text-gray-600 text-xs">↳ {product.name}</span>
                                                    ) : (
                                                        product.name
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 lg:px-3 py-2 align-middle min-w-0">
                                            <p
                                                className="text-[10px] lg:text-xs font-semibold text-blue-600 truncate"
                                                title={variant.product_code}
                                            >
                                                {variant.product_code}
                                            </p>
                                            {variant.sku && variant.sku !== variant.product_code && (
                                                <p
                                                    className="text-[10px] text-gray-400 font-mono truncate"
                                                    title={variant.sku}
                                                >
                                                    {variant.sku}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-1 lg:px-2 py-2 text-right align-middle tabular-nums text-gray-700">
                                            {maxQty}
                                        </td>
                                        <td className="px-1 lg:px-2 py-2 text-right align-middle tabular-nums text-gray-500">
                                            {shopStock}
                                        </td>
                                        {showPurchase && (
                                            <td className="px-1 lg:px-2 py-2 text-right align-middle tabular-nums text-gray-500 text-[10px] lg:text-xs">
                                                {fmtMoney(variant.purchase_price)}
                                            </td>
                                        )}
                                        {showMrp && (
                                            <td className="px-1 lg:px-2 py-2 text-right align-middle tabular-nums text-gray-700 text-[10px] lg:text-xs">
                                                {fmtMoney(variant.mrp)}
                                            </td>
                                        )}
                                        {showFranchisePrice && (
                                            <td className="px-1 lg:px-2 py-2 text-right align-middle text-[10px] lg:text-xs">
                                                <FranchisePriceDisplay compact blend={fBlend} />
                                            </td>
                                        )}
                                        {showCombo && (
                                            <td className="px-1 lg:px-2 py-2 text-right align-middle text-[10px] lg:text-xs">
                                                <ComboOfferDisplay
                                                    offer={combo}
                                                    compact
                                                    transferIncentive={showFranchisePrice}
                                                    cheaper={fBlend?.cheaper === true}
                                                />
                                            </td>
                                        )}
                                        {showSpecial && (
                                            <td className="px-1 lg:px-2 py-2 text-right align-middle tabular-nums text-emerald-700 font-medium text-[10px] lg:text-xs">
                                                {variant.special_price != null
                                                    ? fmtMoney(variant.special_price)
                                                    : "—"}
                                            </td>
                                        )}
                                        <td className="px-1 lg:px-2 py-2 text-center align-middle">
                                            <input
                                                type="number"
                                                min={1}
                                                max={maxQty}
                                                value={sel.quantity}
                                                disabled={!isSelected || !variant.selectable}
                                                onChange={(e) =>
                                                    onSelectionChange(variant.variant_id, {
                                                        quantity: e.target.value,
                                                    })
                                                }
                                                className={`w-full max-w-[4.5rem] mx-auto px-1.5 py-1 text-xs lg:text-sm border rounded-lg text-center tabular-nums ${
                                                    isSelected
                                                        ? "border-gray-300 bg-white"
                                                        : "border-gray-100 bg-gray-50 text-gray-300"
                                                }`}
                                                placeholder="—"
                                            />
                                            <ComboQtyHint
                                                progress={comboProgress}
                                                selected={isSelected}
                                                cheaper={fBlend?.cheaper === true}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
