import React, { useState } from "react";
import { CheckSquare, X, Power, PowerOff, Barcode } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { can } from "../../../Components/roles";

/**
 * Variant-only bulk actions. Does NOT call product archive/delete.
 */
export default function VariantBulkActionBar({
  selectedCount,
  onClear,
  onGetLabels,
  onActivate,
  onDeactivate,
  offsetForProductBar = false,
}) {
  const [busyAction, setBusyAction] = useState(null);
  const canEdit = can("productMs.edit");

  const run = async (action, fn) => {
    if (selectedCount === 0) {
      toast.warning("No variants selected");
      return;
    }
    setBusyAction(action);
    try {
      await fn();
    } catch (error) {
      toast.error(error?.data?.message || error?.message || `Failed to ${action} variants`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeactivate = () => {
    if (
      !window.confirm(
        `Deactivate ${selectedCount} variant(s)? They will be hidden from active listings until reactivated.`
      )
    ) {
      return;
    }
    run("deactivate", onDeactivate);
  };

  return (
    <div
      className={`fixed left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-200 ${
        offsetForProductBar ? "bottom-24" : "bottom-6"
      }`}
    >
      <div className="bg-indigo-600 text-white rounded-xl shadow-2xl border border-indigo-500 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-indigo-200" />
          <span className="text-sm font-medium">
            {selectedCount} variant{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="w-px h-6 bg-indigo-400/60 hidden sm:block" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => run("labels", onGetLabels)}
            disabled={!!busyAction}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Barcode size={16} />
            Get Labels
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => run("activate", onActivate)}
                disabled={!!busyAction}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Power size={16} />
                {busyAction === "activate" ? "…" : "Activate"}
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={!!busyAction}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <PowerOff size={16} />
                {busyAction === "deactivate" ? "…" : "Deactivate"}
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClear}
          className="p-1.5 hover:bg-indigo-700 rounded-lg transition-colors"
          title="Clear variant selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
