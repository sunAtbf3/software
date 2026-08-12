import React from "react";
import { DATE_RANGE_PRESETS } from "../../utils/dateRangePresets";

const PERIOD_OPTIONS = [
  { id: "all", label: "All time" },
  ...DATE_RANGE_PRESETS.filter((p) => p.id !== "custom").map((p) => ({
    id: p.id,
    label: p.label,
  })),
  { id: "custom", label: "Custom date" },
];

/**
 * Compact period dropdown + custom date picker(s).
 * Custom: pick a date → that day's history; optional To for a range.
 */
export default function DateRangePresetBar({
  activePreset = "last_30_days",
  fromDate = "",
  toDate = "",
  onPresetChange,
  onCustomDateChange,
  onFromChange,
  onToDateChange,
  showAllOption = true,
  disabled = false,
  rangeError = "",
}) {
  const options = showAllOption
    ? PERIOD_OPTIONS
    : PERIOD_OPTIONS.filter((o) => o.id !== "all");

  const isCustom = activePreset === "custom";
  const isRange = isCustom && fromDate && toDate && fromDate !== toDate;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[10.5rem]">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Period</label>
          <select
            value={activePreset}
            disabled={disabled}
            onChange={(e) => onPresetChange?.(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isCustom && (
          <>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                {isRange ? "From" : "Date"}
              </label>
              <input
                type="date"
                value={fromDate}
                disabled={disabled}
                onChange={(e) => {
                  const value = e.target.value;
                  if (onCustomDateChange) {
                    onCustomDateChange(value);
                  } else {
                    onFromChange?.(value);
                  }
                }}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                To <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={toDate}
                disabled={disabled || !fromDate}
                min={fromDate || undefined}
                onChange={(e) => onToDateChange?.(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </>
        )}
      </div>

      {isCustom && (
        <p className="text-[11px] text-gray-400">
          Pick a date to see that day&apos;s history. Set <span className="font-medium">To</span> only if you need a range.
        </p>
      )}

      {rangeError ? <p className="text-xs text-red-600">{rangeError}</p> : null}
    </div>
  );
}
