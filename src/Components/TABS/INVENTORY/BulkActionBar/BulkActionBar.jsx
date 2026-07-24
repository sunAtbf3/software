import React, { useState } from "react";
import { toast } from "../../../shared/ToastConfig";
import { CheckSquare, Trash2, Power, PowerOff, X } from "lucide-react";

/**
 * One bar for product and/or variant selection.
 * - Products: Activate + Archive (soft-delete)
 * - Variants: Activate + Deactivate only (never product DELETE)
 */
export default function BulkActionBar({
  selectedProductCount = 0,
  selectedVariantCount = 0,
  onBulkAction,
  onClear,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState(null);

  const hasProducts = selectedProductCount > 0;
  const hasVariants = selectedVariantCount > 0;
  const selectedCount = selectedProductCount + selectedVariantCount;
  const mixed = hasProducts && hasVariants;

  const selectionLabel = () => {
    const parts = [];
    if (hasProducts) {
      parts.push(
        `${selectedProductCount} product${selectedProductCount !== 1 ? "s" : ""}`
      );
    }
    if (hasVariants) {
      parts.push(
        `${selectedVariantCount} variant${selectedVariantCount !== 1 ? "s" : ""}`
      );
    }
    return `${parts.join(", ")} selected`;
  };

  const handleAction = async (action) => {
    if (selectedCount === 0) {
      toast.warning("Nothing selected");
      return;
    }

    if (mixed) {
      toast.warning("Select either products or variants — not both at once");
      return;
    }

    if (action === "archive" && hasVariants) {
      toast.warning("Archive is only for products. Use Deactivate for variants.");
      return;
    }

    if (action === "deactivate" && hasProducts) {
      toast.warning("Deactivate is only for variants. Use Archive for products.");
      return;
    }

    const confirmMessages = {
      activate: hasVariants
        ? `Activate ${selectedVariantCount} variant(s)?`
        : `Activate ${selectedProductCount} product(s)?`,
      deactivate: `Deactivate ${selectedVariantCount} variant(s)?`,
      archive: `Archive ${selectedProductCount} product(s)? This will soft delete them.`,
    };

    if (!window.confirm(confirmMessages[action])) return;

    setActionType(action);
    try {
      await onBulkAction(action);
      onClear?.();
      setIsOpen(false);

      const successMessages = {
        activate: hasVariants
          ? "Variant(s) activated successfully"
          : "Product(s) activated successfully",
        deactivate: "Variant(s) deactivated successfully",
        archive: "Product(s) archived successfully",
      };
      toast.success(successMessages[action]);
    } catch (error) {
      toast.error(error?.data?.message || `Failed to ${action}`);
    } finally {
      setActionType(null);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-blue-600 text-white rounded-xl shadow-2xl border border-gray-700 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-blue-400" />
          <span className="text-sm font-medium">{selectionLabel()}</span>
        </div>

        <div className="w-px h-6 bg-gray-700" />

        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-medium transition-colors"
          >
            Bulk Actions
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleAction("activate")}
                  disabled={!!actionType || mixed}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  <Power size={16} />
                  Activate
                </button>

                {/* Variants only: Deactivate */}
                {hasVariants && !hasProducts && (
                  <>
                    <div className="border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => handleAction("deactivate")}
                      disabled={!!actionType}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      <PowerOff size={16} />
                      Deactivate
                    </button>
                  </>
                )}

                {/* Products only: Archive */}
                {hasProducts && !hasVariants && (
                  <>
                    <div className="border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => handleAction("archive")}
                      disabled={!!actionType}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Archive
                    </button>
                  </>
                )}

                {mixed && (
                  <>
                    <div className="border-t border-gray-100" />
                    <p className="px-3 py-2 text-xs text-amber-700 bg-amber-50">
                      Clear selection and pick only products or only variants.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onClear?.()}
          className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
