import React from "react";

/**
 * Reusable key/value attribute editor for product variants (primary + extra).
 */
export default function VariantAttributesEditor({
  attributes = [{ key: "", value: "" }],
  onUpdateAttribute,
  onAddRow,
  onRemoveRow,
  className = "",
}) {
  const rows = attributes?.length ? attributes : [{ key: "", value: "" }];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Variant Attributes
        </label>
        <button
          type="button"
          onClick={onAddRow}
          className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
        >
          + Add Row
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        e.g. Color / Size — shown on bills so customers know which variant was sold.
      </p>
      <div className="space-y-2">
        {rows.map((attr, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={attr.key}
              onChange={(e) => onUpdateAttribute(i, e.target.value, attr.value)}
              placeholder="e.g. Color"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={attr.value}
              onChange={(e) => onUpdateAttribute(i, attr.key, e.target.value)}
              placeholder="e.g. Red"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveRow(i)}
                className="text-red-400 hover:text-red-600 text-sm cursor-pointer px-1"
                aria-label="Remove attribute row"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
