import React, { useMemo, useState } from "react";
import { Plus, Power, PowerOff, Trash2, Save, X } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";
import {
  useGetComboRulesQuery,
  useCreateComboRuleMutation,
  useUpdateComboRuleMutation,
  useSetComboRuleActiveMutation,
  useDeleteComboRuleMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/ComboRule_api/comboRuleApi";

const emptyForm = {
  name: "",
  special_price_group: "",
  trigger_qty: "3",
  combo_price: "",
  is_active: true,
};

export default function ComboRulesTab() {
  const { data, isLoading, isFetching, refetch } = useGetComboRulesQuery({});
  const [createRule, { isLoading: creating }] = useCreateComboRuleMutation();
  const [updateRule, { isLoading: updating }] = useUpdateComboRuleMutation();
  const [setActive, { isLoading: toggling }] = useSetComboRuleActiveMutation();
  const [deleteRule, { isLoading: deleting }] = useDeleteComboRuleMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const rules = data?.rules || [];
  const busy = creating || updating || toggling || deleting;

  const perUnitPreview = useMemo(() => {
    const qty = Number(form.trigger_qty);
    const price = Number(form.combo_price);
    if (!Number.isFinite(qty) || qty < 2 || !Number.isFinite(price) || price <= 0) return null;
    return (price / qty).toFixed(2);
  }, [form.trigger_qty, form.combo_price]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (rule) => {
    setEditingId(rule.combo_rule_id);
    setForm({
      name: rule.name || "",
      special_price_group: String(rule.special_price_group ?? ""),
      trigger_qty: String(rule.trigger_qty ?? "3"),
      combo_price: String(rule.combo_price ?? ""),
      is_active: rule.is_active !== false,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      special_price_group: Number(form.special_price_group),
      trigger_qty: Number(form.trigger_qty),
      combo_price: Number(form.combo_price),
      is_active: Boolean(form.is_active),
    };

    if (!payload.name) {
      toast.error("Rule name is required");
      return;
    }
    if (!Number.isFinite(payload.special_price_group) || payload.special_price_group <= 0) {
      toast.error("Special price group must be > 0");
      return;
    }
    if (!Number.isInteger(payload.trigger_qty) || payload.trigger_qty < 2) {
      toast.error("Trigger qty must be an integer ≥ 2");
      return;
    }
    if (!Number.isFinite(payload.combo_price) || payload.combo_price <= 0) {
      toast.error("Combo price must be > 0");
      return;
    }

    try {
      if (editingId) {
        await updateRule({ comboRuleId: editingId, ...payload }).unwrap();
        toast.success("Combo rule updated");
      } else {
        await createRule(payload).unwrap();
        toast.success("Combo rule created");
      }
      closeForm();
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save combo rule"));
    }
  };

  const handleToggle = async (rule) => {
    try {
      await setActive({
        comboRuleId: rule.combo_rule_id,
        is_active: !rule.is_active,
      }).unwrap();
      toast.success(rule.is_active ? "Rule deactivated" : "Rule activated");
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update rule status"));
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Delete combo rule "${rule.name}"?`)) return;
    try {
      await deleteRule(rule.combo_rule_id).unwrap();
      toast.success("Combo rule deleted");
      refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete rule"));
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Loading combo rules…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Combo Offers</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Global rules for all shops. Based on variant special price + combo eligible flag.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Add Combo Rule
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              {editingId ? "Edit Combo Rule" : "New Combo Rule"}
            </h3>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='e.g. 3 for ₹100'
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Special price group (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.special_price_group}
                onChange={(e) => setForm((f) => ({ ...f, special_price_group: e.target.value }))}
                placeholder="40"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Trigger qty</label>
              <input
                type="number"
                min={2}
                step="1"
                value={form.trigger_qty}
                onChange={(e) => setForm((f) => ({ ...f, trigger_qty: e.target.value }))}
                placeholder="3"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Combo price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={form.combo_price}
                onChange={(e) => setForm((f) => ({ ...f, combo_price: e.target.value }))}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Active
              </label>
            </div>
          </div>
          {perUnitPreview && (
            <p className="text-xs text-blue-600">
              Per-unit combo price on bill ≈ ₹{perUnitPreview} ({form.combo_price} ÷ {form.trigger_qty})
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-60"
            >
              <Save size={14} />
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Special ₹</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Combo ₹</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Per unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No combo rules yet. Create one to start (products stay unaffected until combo_eligible is on).
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const perUnit = Number(rule.combo_price) / Number(rule.trigger_qty);
                  return (
                    <tr key={rule.combo_rule_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{rule.name}</td>
                      <td className="px-4 py-3 text-gray-600">₹{Number(rule.special_price_group).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{rule.trigger_qty}</td>
                      <td className="px-4 py-3 text-gray-600">₹{Number(rule.combo_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-blue-600 font-medium">
                        ₹{Number.isFinite(perUnit) ? perUnit.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            rule.is_active
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(rule)}
                            className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggle(rule)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                            title={rule.is_active ? "Deactivate" : "Activate"}
                          >
                            {rule.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(rule)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {isFetching && (
          <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">Refreshing…</p>
        )}
      </div>
    </div>
  );
}
