/**
 * Variant attribute helpers — mirrors backend variantAttributes.utils.js
 */

const isNonEmptyString = (value) =>
  value != null && String(value).trim().length > 0;

/**
 * @param {unknown} raw
 * @returns {Array<{ key: string, value: string }>}
 */
export const normalizeAttributes = (raw) => {
  if (raw === null || raw === undefined || raw === '') return [];

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const key = isNonEmptyString(entry.key) ? String(entry.key).trim() : '';
        const value = isNonEmptyString(entry.value) ? String(entry.value).trim() : '';
        if (!key || !value) return null;
        return { key, value };
      })
      .filter(Boolean);
  }

  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([key, value]) => {
        const k = isNonEmptyString(key) ? String(key).trim() : '';
        const v = isNonEmptyString(value) ? String(value).trim() : '';
        if (!k || !v) return null;
        return { key: k, value: v };
      })
      .filter(Boolean);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      return normalizeAttributes(JSON.parse(trimmed));
    } catch {
      return trimmed
        .split('|')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const [key, ...rest] = pair.split(':');
          const k = key?.trim() || '';
          const v = rest.join(':').trim();
          if (!k || !v) return null;
          return { key: k, value: v };
        })
        .filter(Boolean);
    }
  }

  return [];
};

/**
 * @param {unknown} raw
 * @returns {Array<{ key: string, value: string }>|undefined}
 */
export const sanitizeAttributesForPayload = (raw) => {
  const normalized = normalizeAttributes(raw);
  return normalized.length ? normalized : undefined;
};

/**
 * @param {unknown} raw
 * @param {{ separator?: string, maxLength?: number }} [options]
 * @returns {string}
 */
export const formatAttributesDisplay = (raw, { separator = ', ', maxLength } = {}) => {
  const parsed = normalizeAttributes(raw);
  if (!parsed.length) return '';

  let text = parsed.map(({ key, value }) => `${key}: ${value}`).join(separator);
  if (maxLength && text.length > maxLength) {
    return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
  }
  return text;
};

/**
 * Resolve attributes from a bill line item or cart row.
 * @param {object} item
 * @returns {Array<{ key: string, value: string }>}
 */
export const resolveItemVariantAttributes = (item) =>
  normalizeAttributes(
    item?.variant_attributes ??
    item?.variant?.attributes ??
    item?.attributes
  );

export const EMPTY_ATTRIBUTE_ROW = { key: '', value: '' };

/**
 * @param {unknown} raw
 * @returns {Array<{ key: string, value: string }>}
 */
export const attributesForForm = (raw) => {
  const normalized = normalizeAttributes(raw);
  return normalized.length ? normalized : [{ ...EMPTY_ATTRIBUTE_ROW }];
};
