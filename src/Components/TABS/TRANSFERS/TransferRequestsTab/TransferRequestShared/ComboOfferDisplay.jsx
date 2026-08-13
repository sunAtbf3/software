import React from "react";
import { formatFranchiseRupee } from "../../../../../utils/comboPricing.utils";

/**
 * Transfer catalog combo cell.
 * Franchise: pack + “cheaper F” — never customer ₹/pc (that looks like transfer rate).
 * Owned shop: customer pack only.
 */
export function ComboOfferDisplay({
    offer,
    compact = false,
    transferIncentive = false,
    cheaper = false,
}) {
    if (!offer?.eligible) {
        return <span className="text-gray-300">—</span>;
    }

    if (!offer.hasOffer) {
        return (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50">
                Combo
            </span>
        );
    }

    const noteClass = compact ? "text-[9px] lg:text-[10px]" : "text-[10px]";

    if (transferIncentive) {
        return (
            <div className="leading-tight">
                <p className={`font-semibold ${cheaper ? "text-teal-800" : "text-blue-800"}`}>
                    {cheaper ? `Cheaper at ${offer.trigger} pcs` : `${offer.trigger} pcs combo`}
                </p>
                <p className={`${noteClass} font-medium text-blue-700`}>Shop: {offer.label}</p>
            </div>
        );
    }

    return (
        <div className="leading-tight">
            <p className="font-semibold text-blue-800">{offer.label}</p>
            <p className={`${noteClass} font-medium text-blue-600`}>customer bill</p>
        </div>
    );
}

export function ComboOfferBadge({ offer }) {
    if (!offer?.eligible) return null;
    return (
        <span className="mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 bg-blue-100">
            {offer.hasOffer ? offer.label : "Combo"}
        </span>
    );
}

export function ComboQtyHint({ progress, selected = false, cheaper = false }) {
    if (!selected || !progress?.active) return null;

    if (progress.unlocked && progress.neededForNext === 0) {
        return (
            <p className="mt-0.5 text-[10px] font-semibold text-teal-700">
                {cheaper ? "combo F ✓" : "combo qty ✓"}
            </p>
        );
    }
    if (progress.neededForNext > 0) {
        return (
            <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
                {cheaper
                    ? `+${progress.neededForNext} for cheaper F`
                    : `add ${progress.neededForNext} for combo`}
            </p>
        );
    }
    return null;
}

/** F.Price with combo savings nudge — only claims cheaper when combo F < special F. */
export function FranchisePriceDisplay({ blend, compact = false }) {
    const specialF = Number(blend?.specialF ?? blend?.unit);
    if (!Number.isFinite(specialF)) {
        return <span className="text-gray-300">—</span>;
    }

    const noteClass = compact ? "text-[9px] lg:text-[10px]" : "text-[10px]";
    const cheaper = blend.cheaper === true && Number.isFinite(Number(blend.comboF));
    const packHint =
        cheaper && Number(blend.triggerQty) >= 2
            ? `${formatFranchiseRupee(blend.comboF)} / ${blend.triggerQty} pcs`
            : null;

    if (blend.applied && Number(blend.leftover) > 0) {
        return (
            <div className="leading-tight">
                <p className="tabular-nums font-semibold text-teal-700">
                    {blend.comboUnits} @ {formatFranchiseRupee(blend.comboF)}
                </p>
                <p className={`tabular-nums font-semibold text-indigo-700 ${noteClass}`}>
                    {blend.leftover} @ {formatFranchiseRupee(specialF)}
                </p>
            </div>
        );
    }

    if (blend.applied) {
        return (
            <div className="leading-tight">
                <p className="tabular-nums font-semibold text-teal-700">
                    {formatFranchiseRupee(blend.comboF)}
                </p>
                <p className={`${noteClass} text-teal-700 font-medium`}>
                    {packHint || `combo · ${blend.comboUnits} pcs`}
                </p>
            </div>
        );
    }

    return (
        <div className="leading-tight">
            <p className="tabular-nums font-semibold text-indigo-700">
                {formatFranchiseRupee(specialF)}
            </p>
            {packHint && blend.neededForNext > 0 ? (
                <p className={`${noteClass} text-amber-700 font-semibold`}>{packHint}</p>
            ) : blend.triggerQty >= 2 && blend.neededForNext > 0 ? (
                <p className={`${noteClass} text-gray-400`}>
                    add {blend.neededForNext} for combo qty
                </p>
            ) : null}
        </div>
    );
}
