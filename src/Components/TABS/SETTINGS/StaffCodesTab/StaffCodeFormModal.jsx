import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";
import {
    useCreateShopStaffCodeMutation,
    useUpdateShopStaffCodeMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";

const EMPTY = {
    code: "",
    display_name: "",
    phone: "",
    remarks: "",
};

export default function StaffCodeFormModal({ shopId, staffCode, onClose, onSuccess }) {
    const isEdit = Boolean(staffCode?.staff_code_id);
    const [form, setForm] = useState(EMPTY);

    const [createCode, { isLoading: creating }] = useCreateShopStaffCodeMutation();
    const [updateCode, { isLoading: updating }] = useUpdateShopStaffCodeMutation();

    useEffect(() => {
        if (staffCode) {
            setForm({
                code: staffCode.code || "",
                display_name: staffCode.display_name || "",
                phone: staffCode.phone || "",
                remarks: staffCode.remarks || "",
            });
        } else {
            setForm(EMPTY);
        }
    }, [staffCode]);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!shopId) {
            toast.error("Select a shop first");
            return;
        }

        try {
            if (isEdit) {
                await updateCode({
                    shopId,
                    staffCodeId: staffCode.staff_code_id,
                    display_name: form.display_name.trim(),
                    phone: form.phone.trim() || null,
                    remarks: form.remarks.trim() || null,
                }).unwrap();
                toast.success("Staff code updated");
            } else {
                await createCode({
                    shopId,
                    code: form.code.trim().toUpperCase(),
                    display_name: form.display_name.trim(),
                    phone: form.phone.trim() || null,
                    remarks: form.remarks.trim() || null,
                }).unwrap();
                toast.success("Staff code created");
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to save staff code"));
        }
    };

    const saving = creating || updating;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" onClick={onClose} />
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <h3 className="text-base font-semibold text-gray-800">
                            {isEdit ? "Edit Staff Code" : "Add Staff Code"}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Staff Code *</label>
                            <input
                                required
                                disabled={isEdit}
                                value={form.code}
                                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                                placeholder="SC001"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase disabled:bg-gray-100"
                            />
                            {isEdit && (
                                <p className="text-[10px] text-gray-400 mt-1">Code cannot change — update display name only</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Staff Name *</label>
                            <input
                                required
                                value={form.display_name}
                                onChange={(e) => setField("display_name", e.target.value)}
                                placeholder="Rajesh Kumar"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
                            <input
                                value={form.phone}
                                onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                            <input
                                value={form.remarks}
                                onChange={(e) => setField("remarks", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {saving ? "Saving…" : isEdit ? "Update" : "Add Code"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
