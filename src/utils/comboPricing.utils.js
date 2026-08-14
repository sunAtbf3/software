/**
 * Frontend mirror of backend comboPricing.utils.js — keep billing helpers in sync.
 * roundFranchiseRupee / describeFranchiseComboBlend are transfer-module only.
 */

const roundMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Transfer F.Price only — nearest rupee, half-up. Do not use on shop billing. */
export const roundFranchiseRupee = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
};

export const formatFranchiseRupee = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${roundFranchiseRupee(n)}`;
};

const priceKey = (price) => roundMoney(price).toFixed(2);

export const parseComboEligible = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (value == null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return false;
};

export const applyComboPricingToLines = (lines, rules = []) => {
  const activeRules = (Array.isArray(rules) ? rules : []).filter(
    (r) => r && r.is_active !== false && Number(r.trigger_qty) >= 2 && Number(r.combo_price) > 0
  );

  const ruleByPrice = new Map();
  for (const rule of activeRules) {
    const key = priceKey(rule.special_price_group);
    if (!ruleByPrice.has(key)) ruleByPrice.set(key, rule);
  }

  const normalized = (Array.isArray(lines) ? lines : []).map((line, index) => {
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
    const special = roundMoney(line.special_price);
    const hasNormalOverride =
      line.normal_unit_price != null && Number.isFinite(Number(line.normal_unit_price));
    const normalUnitPrice = hasNormalOverride
      ? roundMoney(Number(line.normal_unit_price))
      : special;
    return {
      ...line,
      line_key: line.line_key != null ? String(line.line_key) : `line_${index}`,
      quantity: qty,
      special_price: special,
      normal_unit_price: normalUnitPrice,
      combo_eligible: parseComboEligible(line.combo_eligible),
    };
  });

  const unitQueueByPrice = new Map();
  for (const line of normalized) {
    if (!line.combo_eligible || line.quantity <= 0) continue;
    const key = priceKey(line.special_price);
    if (!ruleByPrice.has(key)) continue;
    if (!unitQueueByPrice.has(key)) unitQueueByPrice.set(key, []);
    const queue = unitQueueByPrice.get(key);
    for (let i = 0; i < line.quantity; i += 1) {
      queue.push(line.line_key);
    }
  }

  const allocation = new Map();
  for (const line of normalized) {
    allocation.set(line.line_key, {
      comboUnits: 0,
      normalUnits: line.quantity,
      comboRule: null,
      comboUnitPrices: [],
    });
  }

  for (const [priceGroupKey, queue] of unitQueueByPrice.entries()) {
    const rule = ruleByPrice.get(priceGroupKey);
    if (!rule) continue;
    const triggerQty = Math.floor(Number(rule.trigger_qty));
    const comboPrice = roundMoney(rule.combo_price);
    if (triggerQty < 2 || comboPrice <= 0) continue;

    const sets = Math.floor(queue.length / triggerQty);
    if (sets <= 0) continue;

    const comboUnitCount = sets * triggerQty;
    const baseUnit = roundMoney(comboPrice / triggerQty);
    const unitPrices = [];
    for (let s = 0; s < sets; s += 1) {
      let setSum = 0;
      for (let u = 0; u < triggerQty - 1; u += 1) {
        unitPrices.push(baseUnit);
        setSum = roundMoney(setSum + baseUnit);
      }
      unitPrices.push(roundMoney(comboPrice - setSum));
    }

    for (let i = 0; i < comboUnitCount; i += 1) {
      const lineKey = queue[i];
      const alloc = allocation.get(lineKey);
      if (!alloc) continue;
      alloc.comboUnits += 1;
      alloc.normalUnits = Math.max(0, alloc.normalUnits - 1);
      alloc.comboRule = rule;
      alloc.comboUnitPrices.push(unitPrices[i]);
    }
  }

  return normalized.map((line) => {
    const alloc = allocation.get(line.line_key) || {
      comboUnits: 0,
      normalUnits: line.quantity,
      comboRule: null,
      comboUnitPrices: [],
    };

    const comboTotal = roundMoney(
      (alloc.comboUnitPrices || []).reduce((s, p) => s + Number(p || 0), 0)
    );
    const normalTotal = roundMoney(alloc.normalUnits * line.normal_unit_price);
    const lineTotal = roundMoney(comboTotal + normalTotal);
    const comboApplied = alloc.comboUnits > 0;

    let unitPrice = line.normal_unit_price;
    let comboUnitPrice = null;
    if (comboApplied && line.quantity > 0) {
      unitPrice = roundMoney(lineTotal / line.quantity);
      comboUnitPrice =
        alloc.comboUnitPrices[0] != null ? Number(alloc.comboUnitPrices[0]) : unitPrice;
    }

    return {
      line_key: line.line_key,
      variant_id: line.variant_id,
      quantity: line.quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      special_price: line.special_price,
      normal_unit_price: line.normal_unit_price,
      combo_applied: comboApplied,
      combo_unit_price: comboUnitPrice,
      combo_rule_id: alloc.comboRule?.combo_rule_id || null,
      combo_units: alloc.comboUnits,
      normal_units: alloc.normalUnits,
    };
  });
};

/**
 * Cart nudges for combo-eligible items (encourage adding more units).
 * Returns per-price-group progress + a lookup by special_price key.
 */
export const buildComboCartHints = (cartItems = [], rules = []) => {
  const activeRules = (Array.isArray(rules) ? rules : []).filter(
    (r) => r && r.is_active !== false && Number(r.trigger_qty) >= 2 && Number(r.combo_price) > 0
  );

  const ruleByPrice = new Map();
  for (const rule of activeRules) {
    const key = priceKey(rule.special_price_group);
    if (!ruleByPrice.has(key)) ruleByPrice.set(key, rule);
  }

  /** @type {Map<string, number>} */
  const eligibleUnitsByPrice = new Map();
  for (const item of Array.isArray(cartItems) ? cartItems : []) {
    if (item?.combo_eligible !== true) continue;
    if (item.price_overridden === true) continue;
    const priceType = item.price_type || "SPECIAL";
    if (priceType !== "SPECIAL" && priceType !== "RETAIL") continue;
    const key = priceKey(item.special_price ?? item.retail_price);
    if (!ruleByPrice.has(key)) continue;
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    eligibleUnitsByPrice.set(key, (eligibleUnitsByPrice.get(key) || 0) + qty);
  }

  const groups = [];
  for (const [key, rule] of ruleByPrice.entries()) {
    const units = eligibleUnitsByPrice.get(key) || 0;
    if (units <= 0) continue;
    const triggerQty = Math.floor(Number(rule.trigger_qty));
    const comboPrice = roundMoney(rule.combo_price);
    const sets = Math.floor(units / triggerQty);
    const remainder = units % triggerQty;
    const neededForNext = remainder === 0 ? 0 : triggerQty - remainder;
    groups.push({
      price_key: key,
      special_price: Number(key),
      rule_name: rule.name || "Combo offer",
      trigger_qty: triggerQty,
      combo_price: comboPrice,
      combo_unit: roundMoney(comboPrice / triggerQty),
      eligible_units: units,
      sets_applied: sets,
      needed_for_next: neededForNext,
    });
  }

  const byPriceKey = new Map(groups.map((g) => [g.price_key, g]));
  return { groups, byPriceKey };
};

/** Find active combo rule matching a special-price group. */
export const findComboRuleForSpecialPrice = (specialPrice, rules = []) => {
  const key = priceKey(specialPrice);
  const active = (Array.isArray(rules) ? rules : []).filter(
    (r) => r && r.is_active !== false && Number(r.trigger_qty) >= 2 && Number(r.combo_price) > 0
  );
  return active.find((r) => priceKey(r.special_price_group) === key) || null;
};

/** Per-unit display rate for a combo rule (combo_price / trigger_qty). */
export const comboUnitFromRule = (rule) => {
  if (!rule) return null;
  const qty = Math.floor(Number(rule.trigger_qty));
  const price = Number(rule.combo_price);
  if (!Number.isFinite(qty) || qty < 2 || !Number.isFinite(price) || price <= 0) return null;
  return roundMoney(price / qty);
};

/**
 * Catalog / transfer combo offer for a single SKU.
 * Prefers fields stamped on the variant, then falls back to the active rule.
 * Combo is a selling offer — not franchise-only.
 */
export const resolveTransferComboOffer = (item, activeComboRules = []) => {
  const empty = {
    eligible: false,
    hasOffer: false,
    trigger: 0,
    comboPrice: null,
    unit: null,
    rule: null,
    label: null,
  };
  if (item?.combo_eligible !== true) return empty;

  const rule = findComboRuleForSpecialPrice(item.special_price, activeComboRules);
  const trigger = Math.floor(Number(item.combo_trigger_qty) || Number(rule?.trigger_qty) || 0);
  const stampedPrice = Number(item.combo_price);
  const comboPrice =
    Number.isFinite(stampedPrice) && stampedPrice > 0
      ? roundMoney(stampedPrice)
      : rule && Number(rule.combo_price) > 0
        ? roundMoney(Number(rule.combo_price))
        : null;
  const stampedUnit = Number(item.combo_unit_price);
  const unit =
    Number.isFinite(stampedUnit) && stampedUnit > 0
      ? roundMoney(stampedUnit)
      : trigger >= 2 && comboPrice > 0
        ? roundMoney(comboPrice / trigger)
        : comboUnitFromRule(rule);
  const hasOffer = trigger >= 2 && comboPrice > 0;

  return {
    eligible: true,
    hasOffer,
    trigger,
    comboPrice: hasOffer ? comboPrice : null,
    unit: hasOffer ? unit : null,
    rule,
    label: hasOffer ? `${trigger} for ₹${Number(comboPrice).toFixed(0)}` : "Combo eligible",
  };
};

/** How many more of this SKU are needed to complete the next combo set. */
export const describeComboQtyProgress = ({ qty, triggerQty, comboEligible } = {}) => {
  const q = Math.max(0, Math.floor(Number(qty) || 0));
  const trigger = Math.floor(Number(triggerQty) || 0);
  if (comboEligible !== true || trigger < 2) {
    return { active: false, trigger: 0, sets: 0, neededForNext: 0, unlocked: false };
  }
  const remainder = q % trigger;
  const sets = Math.floor(q / trigger);
  return {
    active: true,
    trigger,
    sets,
    neededForNext: q <= 0 ? trigger : remainder === 0 ? 0 : trigger - remainder,
    unlocked: sets > 0,
  };
};

/**
 * Transfer-request combo: same variant qty only (does not mix products).
 */
export const buildSameProductComboHints = (items = [], rules = []) => {
  const groups = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.combo_eligible !== true) continue;
    const offer = resolveTransferComboOffer(item, rules);
    const triggerQty = offer.trigger;
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (qty <= 0 || triggerQty < 2 || !offer.hasOffer) continue;
    const remainder = qty % triggerQty;
    groups.push({
      variant_id: item.variant_id,
      product_name: item.product_name || item.product_code || "Product",
      trigger_qty: triggerQty,
      combo_price: offer.comboPrice,
      sets_applied: Math.floor(qty / triggerQty),
      needed_for_next: remainder === 0 ? 0 : triggerQty - remainder,
      eligible_units: qty,
    });
  }
  return { groups };
};

/**
 * Recover landed cost from special-based F.Price so combo F.Price can be
 * derived on the client when purchase price is hidden (F-shop view).
 * F = cost + max(0, selling − cost) × markup%
 */
const deriveCostFromSpecialFranchise = (specialPrice, specialF, markupPercent) => {
  const selling = Number(specialPrice);
  const f = Number(specialF);
  const m = Number(markupPercent) / 100;
  if (![selling, f, m].every(Number.isFinite) || m < 0 || m >= 1) return null;
  if (f + 0.009 >= selling) {
    return roundMoney(f);
  }
  const cost = (f - selling * m) / (1 - m);
  if (!Number.isFinite(cost) || cost < 0) return null;
  return roundMoney(cost);
};

const franchiseFromSelling = (cost, sellingPrice, markupPercent) => {
  const gap = Math.max(0, Number(sellingPrice) - Number(cost));
  const m = Number(markupPercent) / 100;
  if (![cost, sellingPrice, m].every(Number.isFinite) || m < 0) return null;
  return roundFranchiseRupee(Number(cost) + gap * m);
};

const resolveComboFranchiseUnit = ({
  franchiseComboUnitPrice,
  franchiseUnitPrice,
  specialPrice,
  comboSellingUnit,
  purchasePrice,
  expenses,
  markupPercent,
}) => {
  const direct = Number(franchiseComboUnitPrice);
  if (Number.isFinite(direct) && direct > 0) return roundFranchiseRupee(direct);

  const selling = Number(comboSellingUnit);
  const pct = Number(markupPercent);
  if (!Number.isFinite(selling) || selling <= 0 || !Number.isFinite(pct)) return null;

  const purchase = Number(purchasePrice);
  const exp = Number(expenses) || 0;
  if (Number.isFinite(purchase) && purchase >= 0) {
    return franchiseFromSelling(purchase + exp, selling, pct);
  }

  const cost = deriveCostFromSpecialFranchise(specialPrice, franchiseUnitPrice, pct);
  if (cost == null) return null;
  return franchiseFromSelling(cost, selling, pct);
};

/**
 * Same-product combo F.Price breakdown for transfer UI.
 * Combo sets use combo-based F.Price; leftover units keep special-based F.Price.
 */
export const describeFranchiseComboBlend = ({
  qty,
  franchiseUnitPrice,
  franchiseComboUnitPrice,
  comboTriggerQty,
  comboEligible,
  specialPrice,
  comboSellingUnit,
  purchasePrice,
  expenses,
  markupPercent,
} = {}) => {
  const q = Math.max(0, Math.floor(Number(qty) || 0));
  const specialFRaw = Number(franchiseUnitPrice);
  const specialF = Number.isFinite(specialFRaw) ? roundFranchiseRupee(specialFRaw) : NaN;
  const trigger = Math.floor(Number(comboTriggerQty) || 0);
  const comboFRaw = resolveComboFranchiseUnit({
    franchiseComboUnitPrice,
    franchiseUnitPrice,
    specialPrice,
    comboSellingUnit,
    purchasePrice,
    expenses,
    markupPercent,
  });
  const comboF = Number.isFinite(comboFRaw) ? roundFranchiseRupee(comboFRaw) : NaN;

  const savePerPc =
    Number.isFinite(specialF) && Number.isFinite(comboF)
      ? roundFranchiseRupee(specialF - comboF)
      : null;
  const cheaper = savePerPc != null && savePerPc > 0;

  const base = {
    unit: Number.isFinite(specialF) ? specialF : null,
    applied: false,
    sets: 0,
    comboUnits: 0,
    leftover: q,
    neededForNext: trigger >= 2 ? (q <= 0 ? trigger : q % trigger === 0 ? 0 : trigger - (q % trigger)) : 0,
    comboF: Number.isFinite(comboF) ? comboF : null,
    specialF: Number.isFinite(specialF) ? specialF : null,
    triggerQty: trigger,
    savePerPc: cheaper ? savePerPc : 0,
    cheaper,
    lineTotal: Number.isFinite(specialF) ? roundMoney(specialF * q) : null,
  };

  if (!Number.isFinite(specialF) || q <= 0 || comboEligible !== true || trigger < 2 || !Number.isFinite(comboF)) {
    return base;
  }

  const sets = Math.floor(q / trigger);
  if (sets <= 0) return base;

  const comboUnits = sets * trigger;
  const leftover = q - comboUnits;
  const line = comboUnits * comboF + leftover * specialF;
  return {
    ...base,
    unit: leftover > 0 ? null : comboF,
    applied: true,
    sets,
    comboUnits,
    leftover,
    lineTotal: roundMoney(line),
  };
};

/** Live blended per-unit F.Price (number) for a transfer line. */
export const blendFranchisePriceForQty = (args = {}) => describeFranchiseComboBlend(args).unit;

export { roundMoney, priceKey };

