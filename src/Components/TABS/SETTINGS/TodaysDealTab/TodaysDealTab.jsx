import React, { useMemo, useState } from "react";
import { Power, PowerOff, Search, Tag } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";
import {
  useGetSaleDealsQuery,
  useLazySearchSaleDealVariantsQuery,
  useCreateSaleDealMutation,
  useSetSaleDealActiveMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/SaleDeal_api/saleDealApi";

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
};

const toDatetimeLocalValue = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoOrNull = (localValue) => {
  const raw = String(localValue || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function TodaysDealTab() {
  const { data, isLoading, refetch } = useGetSaleDealsQuery({ live_only: true, limit: 100 });
  const [searchVariants, { isFetching: searching }] = useLazySearchSaleDealVariantsQuery();
  const [createDeal, { isLoading: creating }] = useCreateSaleDealMutation();
  const [setActive, { isLoading: toggling }] = useSetSaleDealActiveMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [drafts, setDrafts] = useState({});

  const deals = data?.deals || [];
  const busy = creating || toggling;

  const updateDraft = (variantId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] || {}), ...patch },
    }));
  };

  const handleSearch = async (event) => {
    event?.preventDefault?.();
    const search = searchTerm.trim();
    if (!search) {
      toast.error("Enter a product name or product code");
      return;
    }
    try {
      const data = await searchVariants({ search }).unwrap();
      const variants = data?.variants || [];
      setResults(variants);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const variant of variants) {
          if (!next[variant.variant_id]) {
            next[variant.variant_id] = {
              sale_price: variant.on_sale && variant.sale_price != null ? String(variant.sale_price) : "",
              expires_at: toDatetimeLocalValue(variant.sale_expires_at),
            };
          }
        }
        return next;
      });
      if (!variants.length) toast.info("No matching variants");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to search products"));
    }
  };

  const handleActivate = async (variant) => {
    const draft = drafts[variant.variant_id] || {};
    const salePrice = Number(draft.sale_price);
    if (!Number.isFinite(salePrice) || !(salePrice > 0)) {
      toast.error("Enter a sale price greater than 0");
      return;
    }
    if (salePrice > Number(variant.special_price)) {
      toast.error(`Sale price cannot exceed special ₹${formatMoney(variant.special_price)}`);
      return;
    }
    if (Number(variant.mrp) > 0 && salePrice > Number(variant.mrp)) {
      toast.error(`Sale price cannot exceed MRP ₹${formatMoney(variant.mrp)}`);
      return;
    }
    if (variant.combo_unit_price != null && salePrice < Number(variant.combo_unit_price)) {
      toast.error(`Combo SKU: sale cannot be below combo unit ₹${formatMoney(variant.combo_unit_price)}`);
      return;
    }

    const expiresAt = toIsoOrNull(draft.expires_at);
    if (draft.expires_at && !expiresAt) {
      toast.error("Expiry must be a valid date/time, or leave it empty");
      return;
    }

    try {
      await createDeal({
        variant_id: variant.variant_id,
        sale_price: salePrice,
        expires_at: expiresAt,
      }).unwrap();
      toast.success("Sale activated. Catalog special was not changed.");
      refetch();
      handleSearch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to activate sale"));
    }
  };

  const handleSaleOff = async (deal) => {
    try {
      await setActive({ saleDealId: deal.sale_deal_id, is_active: false }).unwrap();
      toast.success("Sale Off. Combo / special pricing will apply again.");
      refetch();
      if (searchTerm.trim()) handleSearch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to turn sale off"));
    }
  };

  const liveDeals = useMemo(
    () => (deals || []).filter((deal) => deal.is_live !== false && deal.is_active !== false),
    [deals]
  );

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading today’s deals…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Today's Deal / Sale</h2>
        <p className="text-sm text-gray-500 mt-1">
          Overlay only — catalog special and combo rules stay unchanged. While a sale is live, the
          billing counter (owner and franchise shops) charges the sale price and pauses combo for
          that SKU. Transfers keep using catalog special and combo as before.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name or product code"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={searching || busy}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-right px-3 py-2">MRP</th>
                <th className="text-right px-3 py-2">Special</th>
                <th className="text-right px-3 py-2">Combo unit</th>
                <th className="text-right px-3 py-2">Sale ₹</th>
                <th className="text-left px-3 py-2">Expiry</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((variant) => {
                const draft = drafts[variant.variant_id] || { sale_price: "", expires_at: "" };
                return (
                  <tr key={variant.variant_id} className="align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{variant.product_name || "—"}</p>
                      <p className="text-[11px] text-gray-500">{variant.product_code}</p>
                      {variant.on_sale && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                          <Tag size={10} /> Sale live {variant.sale_price != null ? `@ ₹${formatMoney(variant.sale_price)}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">₹{formatMoney(variant.mrp)}</td>
                    <td className="px-3 py-2 text-right">₹{formatMoney(variant.special_price)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {variant.combo_unit_price != null
                        ? `₹${formatMoney(variant.combo_unit_price)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min={variant.min_sale_price || 0.01}
                        max={variant.max_sale_price || undefined}
                        value={draft.sale_price}
                        onChange={(e) => updateDraft(variant.variant_id, { sale_price: e.target.value })}
                        className="w-24 ml-auto block text-right border border-gray-300 rounded px-2 py-1"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                        {variant.combo_unit_price != null
                          ? `₹${formatMoney(variant.min_sale_price)}–₹${formatMoney(variant.max_sale_price)}`
                          : `≤ special ₹${formatMoney(variant.special_price)}`}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="datetime-local"
                        value={draft.expires_at}
                        onChange={(e) => updateDraft(variant.variant_id, { expires_at: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">Empty = until Sale Off</p>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleActivate(variant)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-rose-600 text-white disabled:opacity-50"
                      >
                        <Power size={12} /> Activate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Live deals</h3>
        {liveDeals.length === 0 ? (
          <p className="text-sm text-gray-500">No live sales. Search a SKU to activate one.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-right px-3 py-2">Special</th>
                  <th className="text-right px-3 py-2">Sale</th>
                  <th className="text-left px-3 py-2">Expires</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {liveDeals.map((deal) => (
                  <tr key={deal.sale_deal_id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{deal.product_name || "—"}</p>
                      <p className="text-[11px] text-gray-500">{deal.product_code}</p>
                    </td>
                    <td className="px-3 py-2 text-right">₹{formatMoney(deal.special_price)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-700">₹{formatMoney(deal.sale_price)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {deal.expires_at ? new Date(deal.expires_at).toLocaleString() : "Until Sale Off"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSaleOff(deal)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 disabled:opacity-50"
                      >
                        <PowerOff size={12} /> Sale Off
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
