import React, { useMemo, useState } from "react";
import { Trash2, Package } from "lucide-react";
import {
    describeComboQtyProgress,
    describeFranchiseComboBlend,
    resolveTransferComboOffer,
} from "../../../../../utils/comboPricing.utils";
import {
    ComboOfferDisplay,
    ComboQtyHint,
    FranchisePriceDisplay,
} from "./ComboOfferDisplay";

const fmtMoney = (value) => {
    if (value == null || value === "") return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `₹${n.toFixed(2)}`;
};

function PreviewThumb({ src, alt }) {
    const [failed, setFailed] = useState(false);
    const showImage = Boolean(src) && !failed;

    return (
        <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
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
                <Package size={14} className="text-gray-300" />
            )}
        </div>
    );
}

export default function BulkRequestPreviewTable({
    items = [],
    onQuantityChange,
    onRemove,
    showFranchisePricing = false,
    activeComboRules = [],
    franchiseMarkupPercent = null,
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
                    <table className={`w-full text-sm ${showFranchisePricing ? "min-w-[920px]" : "min-w-[760px]"}`}>
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
                                    </>
                                )}
                                <th className="px-3 py-2 text-right text-xs font-semibold text-blue-700">
                                    {showFranchisePricing ? "Shop offer" : "Combo / Offer"}
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">
                                    Spl/Sale Price
                                </th>
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
                                const combo = resolveTransferComboOffer(item, activeComboRules);
                                const comboProgress = describeComboQtyProgress({
                                    qty: qtyNum,
                                    triggerQty: combo.trigger,
                                    comboEligible: combo.eligible,
                                });
                                const fBlend = showFranchisePricing
                                    ? describeFranchiseComboBlend({
                                          qty: qtyNum,
                                          franchiseUnitPrice: item.franchise_unit_price,
                                          franchiseComboUnitPrice: item.franchise_combo_unit_price,
                                          comboTriggerQty:
                                              item.combo_trigger_qty || combo.trigger,
                                          comboEligible: item.combo_eligible === true,
                                          specialPrice: item.special_price,
                                          comboSellingUnit: item.combo_unit_price || combo.unit,
                                          purchasePrice: item.purchase_price,
                                          markupPercent: franchiseMarkupPercent,
                                      })
                                    : null;

                                return (
                                    <tr key={item.variant_id} className="hover:bg-gray-50/80">
                                        <td className="px-3 py-2.5 text-sm text-gray-800 align-middle">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <PreviewThumb
                                                    src={item.image_url}
                                                    alt={item.product_name}
                                                />
                                                <span className="line-clamp-2 min-w-0">
                                                    {item.product_name || "—"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 align-middle">
                                            <span className="text-xs font-semibold text-blue-600">
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
                                                <td className="px-3 py-2.5 text-right align-middle text-xs">
                                                    <FranchisePriceDisplay compact blend={fBlend} />
                                                </td>
                                            </>
                                        )}
                                        <td className="px-3 py-2.5 text-right align-middle text-xs">
                                            <ComboOfferDisplay
                                                offer={combo}
                                                compact
                                                transferIncentive={showFranchisePricing}
                                                cheaper={fBlend?.cheaper === true}
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-medium align-middle text-xs">
                                            {fmtMoney(item.special_price)}
                                        </td>
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
                                            <ComboQtyHint
                                                progress={comboProgress}
                                                selected
                                                cheaper={fBlend?.cheaper === true}
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
