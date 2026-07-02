/** Canonical unit-of-measure options — keep in sync with backend constants. */
export const UNIT_OF_MEASURE_OPTIONS = [
  'Pcs',
  'Pair',
  'Set',
  'Pack',
  'Packet',
  'Box',
  'Carton',
  'Dozen',
  'Roll',
  'Bundle',
  'Bag',
  'Bottle',
  'Can',
  'Jar',
  'Tube',
  'Strip',
  'Sheet',
  'Ream',
  'Meter',
  'Foot',
  'Inch',
  'Gram',
  'Kilogram',
  'Milliliter',
  'Liter',
  'Unit',
  'Case',
  'Lot',
];

const LEGACY_ALIASES = {
  PCS: 'Pcs',
  PAIR: 'Pair',
  SET: 'Set',
  PACK: 'Pack',
  PACKET: 'Packet',
  BOX: 'Box',
  CARTON: 'Carton',
  DOZEN: 'Dozen',
  ROLL: 'Roll',
  BUNDLE: 'Bundle',
  BAG: 'Bag',
  BOTTLE: 'Bottle',
  CAN: 'Can',
  JAR: 'Jar',
  TUBE: 'Tube',
  STRIP: 'Strip',
  SHEET: 'Sheet',
  REAM: 'Ream',
  METER: 'Meter',
  MTR: 'Meter',
  FOOT: 'Foot',
  FT: 'Foot',
  INCH: 'Inch',
  IN: 'Inch',
  GRAM: 'Gram',
  GM: 'Gram',
  G: 'Gram',
  KILOGRAM: 'Kilogram',
  KG: 'Kilogram',
  MILLILITER: 'Milliliter',
  ML: 'Milliliter',
  LITER: 'Liter',
  LTR: 'Liter',
  L: 'Liter',
  UNIT: 'Unit',
  CASE: 'Case',
  LOT: 'Lot',
};

const CANONICAL_LOOKUP = new Map(
  UNIT_OF_MEASURE_OPTIONS.map((value) => [value.toLowerCase(), value])
);

export const normalizeUnitOfMeasure = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const alias = LEGACY_ALIASES[trimmed.toUpperCase()];
  if (alias) return alias;

  return CANONICAL_LOOKUP.get(trimmed.toLowerCase()) || trimmed;
};

/** Dropdown options including a legacy stored value when editing older products. */
export const getUnitOfMeasureSelectOptions = (currentValue) => {
  const options = [...UNIT_OF_MEASURE_OPTIONS];
  const normalized = normalizeUnitOfMeasure(currentValue);
  if (normalized && !options.includes(normalized)) {
    options.unshift(normalized);
  }
  return options;
};
