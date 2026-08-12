/**
 * Shared date-range presets for shop Sale / Purchase history filters.
 * Uses local calendar dates (YYYY-MM-DD) — matches `<input type="date">` and API from_date/to_date.
 */

export const DATE_RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "last_7_days", label: "1 Week" },
  { id: "last_30_days", label: "1 Month" },
  { id: "last_90_days", label: "3 Months" },
  { id: "custom", label: "Custom" },
];

/** Inclusive day count helpers (today counts as day 1). */
const PRESET_DAY_SPANS = {
  today: 1,
  last_7_days: 7,
  last_30_days: 30,
  last_90_days: 90,
};

/**
 * Format a Date as local YYYY-MM-DD (avoid UTC shift from toISOString).
 */
export const toIsoDateLocal = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayIsoLocal = () => toIsoDateLocal(new Date());

/**
 * Resolve preset → { from, to, preset } as YYYY-MM-DD inclusive range.
 * Unknown / custom → empty from/to with preset "custom".
 */
export const resolveDateRangePreset = (presetId, now = new Date()) => {
  if (!presetId || presetId === "custom" || presetId === "all") {
    return { from: "", to: "", preset: presetId === "all" ? "all" : "custom" };
  }

  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  const span = PRESET_DAY_SPANS[presetId];

  if (presetId === "this_month") {
    start.setDate(1);
  } else if (span != null) {
    start.setDate(start.getDate() - (span - 1));
  } else {
    return { from: "", to: "", preset: "custom" };
  }

  return {
    from: toIsoDateLocal(start),
    to: toIsoDateLocal(end),
    preset: presetId,
  };
};

/**
 * Infer which preset matches current from/to (for chip highlight).
 */
export const matchDateRangePreset = (from, to, now = new Date()) => {
  if (!from && !to) return "all";
  for (const id of ["today", "last_7_days", "last_30_days", "last_90_days", "this_month"]) {
    const range = resolveDateRangePreset(id, now);
    if (range.from === from && range.to === to) return id;
  }
  return "custom";
};

/**
 * Validate inclusive range. Empty open ends are allowed.
 */
export const isValidDateRange = (from, to) => {
  if (!from || !to) return true;
  return String(from) <= String(to);
};

/**
 * Human label for active range (stats card).
 */
export const formatDateRangeLabel = (from, to) => {
  if (!from && !to) return "All time";
  if (from && to && from === to) return from;
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  return `Until ${to}`;
};
