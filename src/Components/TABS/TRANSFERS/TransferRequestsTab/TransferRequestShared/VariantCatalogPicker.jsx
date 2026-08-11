import React, { useMemo } from "react";
import {
    findComboRuleForSpecialPrice,
    comboUnitFromRule,
    buildComboCartHints,
} from "../../../../../utils/comboPricing.utils";

const fmtMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

const resolveComboDisplay = (variant, activeComboRules = []) => {
    if (variant?.combo_eligible !== true) {
        return { eligible: false, rule: null, unit: null, label: null };
    }
    const rule = findComboRuleForSpecialPrice(variant.special_price, activeComboRules);
    const unit = comboUnitFromRule(rule);
    return {
        eligible: true,
        rule,
        unit,
        label: rule
            ? `${rule.trigger_qty} for ₹${Number(rule.combo_price).toFixed(0)}`
            : "Combo eligible",
    };
};

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
        available_stock: maxQty,
        mrp: variant.mrp ?? null,
        special_price: variant.special_price ?? null,
        franchise_unit_price: variant.franchise_unit_price ?? null,
        purchase_price: variant.purchase_price ?? null,
        combo_eligible: variant.combo_eligible === true,
    };
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
}) {
    const sel = selection[variant.variant_id] || { selected: false, quantity: "" };
    const maxQty = variant.warehouse_available ?? 0;
    const isSelected = !!sel.selected;
    const combo = showCombo ? resolveComboDisplay(variant, activeComboRules) : null;

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
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">
                        {isMulti ? `↳ ${product.name}` : product.name}
                    </p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">
                        {variant.product_code}
                        {variant.sku && variant.sku !== variant.product_code ? ` · ${variant.sku}` : ""}
                    </p>
                    {combo?.eligible && (
                        <span className="mt-1 inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {combo.label}
                            {combo.unit != null ? ` · ${fmtMoney(combo.unit)}/pc` : ""}
                        </span>
                    )}
                </div>
                <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={sel.quantity}
                    disabled={!isSelected || !variant.selectable}
                    onChange={(e) =>
                        onSelectionChange(variant.variant_id, { quantity: e.target.value })
                    }
                    className={`w-16 px-2 py-1 text-sm border rounded-lg text-center tabular-nums shrink-0 ${
                        isSelected ? "border-gray-300 bg-white" : "border-gray-100 bg-gray-50 text-gray-300"
                    }`}
                    placeholder="Qty"
                />
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
                    <div className="flex justify-between gap-2">
                        <span className="text-indigo-500">F. Price</span>
                        <span className="font-medium text-indigo-700 tabular-nums">
                            {fmtMoney(variant.franchise_unit_price)}
                        </span>
                    </div>
                )}
                {combo?.eligible && (
                    <div className="flex justify-between gap-2 col-span-2">
                        <span className="text-blue-600">Combo Price</span>
                        <span className="font-semibold text-blue-700 tabular-nums">
                            {combo.unit != null ? `${fmtMoney(combo.unit)} · ${combo.label}` : combo.label}
                        </span>
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
                quantity: s.quantity,
                special_price: s.special_price,
                combo_eligible: s.combo_eligible === true,
                price_type: "SPECIAL",
            }));
        return buildComboCartHints(selected, activeComboRules);
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
    const showCombo = franchisePricing || warehouseFranchiseView;

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
    };

    return (
        <div className="space-y-2 w-full min-w-0">
            <p className="text-xs text-gray-500">
                {totalSelected} variant(s) selected — tick rows and enter quantity
            </p>

            {showCombo && comboHints.groups.length > 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 space-y-1">
                    {comboHints.groups.map((group) => (
                        <p key={group.price_key} className="text-[11px] text-blue-800 leading-snug">
                            {group.sets_applied > 0 ? (
                                <>
                                    <span className="font-semibold">Combo ready</span>
                                    {" — "}
                                    {group.trigger_qty} for ₹{Number(group.combo_price).toFixed(0)}
                                    {group.needed_for_next > 0
                                        ? ` · Add ${group.needed_for_next} more @ ₹${Number(group.special_price).toFixed(0)} for next set`
                                        : " · great for selling more!"}
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold">Combo offer</span>
                                    {" — "}
                                    {group.trigger_qty} for ₹{Number(group.combo_price).toFixed(0)}
                                    {" · Add "}
                                    {group.needed_for_next} more @ ₹{Number(group.special_price).toFixed(0)} to unlock
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
                                        Combo<br />Price
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
                                                        <span className="text-xs text-gray-400 font-mono ml-2">
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
                                const combo = showCombo
                                    ? resolveComboDisplay(variant, activeComboRules)
                                    : null;

                                return (
                                    <tr
                                        key={variant.variant_id}
                                        className={`hover:bg-gray-50/80 ${isSelected ? "bg-blue-50/40" : ""}`}
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
                                            <span
                                                className="block text-xs lg:text-sm font-medium truncate"
                                                title={product.name}
                                            >
                                                {isMulti ? (
                                                    <span className="text-gray-600 text-xs">↳ {product.name}</span>
                                                ) : (
                                                    product.name
                                                )}
                                            </span>
                                            {combo?.eligible && (
                                                <span className="mt-0.5 inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                    {combo.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 lg:px-3 py-2 align-middle min-w-0">
                                            <p
                                                className="text-[10px] lg:text-xs font-mono text-gray-600 truncate"
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
                                            <td className="px-1 lg:px-2 py-2 text-right align-middle tabular-nums text-indigo-700 font-medium text-[10px] lg:text-xs">
                                                {fmtMoney(variant.franchise_unit_price)}
                                            </td>
                                        )}
                                        {showCombo && (
                                            <td className="px-1 lg:px-2 py-2 text-right align-middle text-[10px] lg:text-xs">
                                                {combo?.eligible ? (
                                                    <div className="leading-tight">
                                                        <p className="font-semibold text-blue-700 tabular-nums">
                                                            {combo.unit != null ? fmtMoney(combo.unit) : "—"}
                                                        </p>
                                                        <p className="text-[9px] lg:text-[10px] text-blue-600 font-medium">
                                                            {combo.label}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
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
