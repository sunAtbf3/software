import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";
import {
    findComboRuleForSpecialPrice,
    comboUnitFromRule,
} from "../../../../../utils/comboPricing.utils";

const fmtMoney = (value) => {
    if (value == null || value === "") return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `₹${n.toFixed(2)}`;
};

const resolveComboDisplay = (item, activeComboRules = []) => {
    if (item?.combo_eligible !== true) {
        return { eligible: false, rule: null, unit: null, label: null };
    }
    const rule = findComboRuleForSpecialPrice(item.special_price, activeComboRules);
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

export default function BulkRequestPreviewTable({
    items = [],
    onQuantityChange,
    onRemove,
    showFranchisePricing = false,
    activeComboRules = [],
}) {
    const totalQty = useMemo(
        () =>
            items.reduce((sum, item) => {
                const qty = parseInt(item.quantity, 10);
                return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
            }, 0),
        [items]
    );

    if (!items.length) {
        return (
            <div className="text-center py-10 text-sm text-gray-400 border border-gray-200 rounded-lg bg-gray-50">
                No variants selected. Go back and add products to this request.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                    Review {items.length} variant(s) before submitting
                </p>
                <p className="text-xs font-medium text-gray-600 tabular-nums">
                    Total qty: {totalQty}
                </p>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[min(55vh,28rem)] overflow-y-auto">
                    <table className={`w-full text-sm ${showFranchisePricing ? "min-w-[920px]" : "min-w-[640px]"}`}>
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                                    Product
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                                    Code / SKU
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                    WH Stock
                                </th>
                                {showFranchisePricing && (
                                    <>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">
                                            MRP
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-indigo-600">
                                            F. Price
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-blue-700 leading-tight">
                                            Combo<br />Price
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">
                                            Spl/Sale Price
                                        </th>
                                    </>
                                )}
                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">
                                    Qty
                                </th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 w-12">
                                    Remove
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item) => {
                                const maxQty = item.available_stock ?? 0;
                                const qtyNum = parseInt(item.quantity, 10);
                                const qtyInvalid =
                                    !item.quantity ||
                                    !Number.isFinite(qtyNum) ||
                                    qtyNum <= 0 ||
                                    qtyNum > maxQty;
                                const combo = showFranchisePricing
                                    ? resolveComboDisplay(item, activeComboRules)
                                    : null;

                                return (
                                    <tr key={item.variant_id} className="hover:bg-gray-50/80">
                                        <td className="px-3 py-2.5 text-sm text-gray-800 align-middle">
                                            <span className="line-clamp-2">{item.product_name || "—"}</span>
                                            {combo?.eligible && (
                                                <span className="mt-1 inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                    {combo.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 align-middle">
                                            <span className="text-xs font-mono text-gray-500">
                                                {item.product_code || "—"}
                                                {item.sku && item.sku !== item.product_code
                                                    ? ` / ${item.sku}`
                                                    : ""}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 align-middle">
                                            {maxQty}
                                        </td>
                                        {showFranchisePricing && (
                                            <>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 align-middle text-xs">
                                                    {fmtMoney(item.mrp)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-indigo-700 font-medium align-middle text-xs">
                                                    {fmtMoney(item.franchise_unit_price)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right align-middle text-xs">
                                                    {combo?.eligible ? (
                                                        <div className="leading-tight">
                                                            <p className="font-semibold text-blue-700 tabular-nums">
                                                                {combo.unit != null ? fmtMoney(combo.unit) : "—"}
                                                            </p>
                                                            <p className="text-[10px] text-blue-600 font-medium">
                                                                {combo.label}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-medium align-middle text-xs">
                                                    {fmtMoney(item.special_price)}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-3 py-2.5 text-center align-middle">
                                            <input
                                                type="number"
                                                min={1}
                                                max={maxQty}
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    onQuantityChange(item.variant_id, e.target.value)
                                                }
                                                className={`w-16 px-2 py-1 text-sm border rounded-lg text-center tabular-nums ${
                                                    qtyInvalid
                                                        ? "border-red-400 bg-red-50"
                                                        : "border-gray-300 bg-white"
                                                }`}
                                            />
                                        </td>
                                        <td className="px-2 py-2.5 text-center align-middle">
                                            <button
                                                type="button"
                                                onClick={() => onRemove(item.variant_id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                title="Remove from request"
                                            >
                                                <Trash2 size={15} />
                                            </button>
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
