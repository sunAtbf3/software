import React, { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useGetCompanyInvoiceSettingsQuery,
    useUpdateCompanyInvoiceSettingsMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/AppSettings_api/appSettingsApi";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";

const EMPTY = {
    transfer_invoice_legal_name: "",
    transfer_invoice_gstin: "",
    transfer_invoice_state_code: "",
    transfer_invoice_address: "",
    transfer_invoice_city: "",
    transfer_invoice_phone: "",
};

export default function CompanyDetailsTab() {
    const { data, isLoading, isFetching, refetch } = useGetCompanyInvoiceSettingsQuery();
    const [updateSettings, { isLoading: isSaving }] = useUpdateCompanyInvoiceSettingsMutation();
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        if (!data) return;
        setForm({
            transfer_invoice_legal_name: data.transfer_invoice_legal_name || "",
            transfer_invoice_gstin: data.transfer_invoice_gstin || "",
            transfer_invoice_state_code: data.transfer_invoice_state_code || "",
            transfer_invoice_address: data.transfer_invoice_address || "",
            transfer_invoice_city: data.transfer_invoice_city || "",
            transfer_invoice_phone: data.transfer_invoice_phone || "",
        });
    }, [data]);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        const legal = form.transfer_invoice_legal_name.trim();
        const gstin = form.transfer_invoice_gstin.trim().toUpperCase();
        if (!legal) {
            toast.error("Company legal name is required");
            return;
        }
        if (gstin && gstin.length !== 15) {
            toast.error("GSTIN must be 15 characters");
            return;
        }
        try {
            await updateSettings({
                transfer_invoice_legal_name: legal,
                transfer_invoice_gstin: gstin || null,
                transfer_invoice_state_code: form.transfer_invoice_state_code.trim() || null,
                transfer_invoice_address: form.transfer_invoice_address.trim() || null,
                transfer_invoice_city: form.transfer_invoice_city.trim() || null,
                transfer_invoice_phone: form.transfer_invoice_phone.trim() || null,
            }).unwrap();
            toast.success("Company details saved");
            refetch();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to save company details"));
        }
    };

    if (isLoading) {
        return <div className="p-6 text-sm text-gray-500">Loading company details…</div>;
    }

    const inputCls =
        "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 size={20} className="text-blue-600" />
                    Company Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Legal name and GSTIN used on all warehouse → shop stock transfer bills
                    (GST / non-GST). Warehouses keep their own Location ID, name, address, and
                    manager on the bill.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Company legal name *
                    </label>
                    <input
                        type="text"
                        value={form.transfer_invoice_legal_name}
                        onChange={(e) => setField("transfer_invoice_legal_name", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. OfferWale Baba Private Limited"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Company GSTIN
                        </label>
                        <input
                            type="text"
                            value={form.transfer_invoice_gstin}
                            onChange={(e) => setField("transfer_invoice_gstin", e.target.value.toUpperCase())}
                            className={inputCls}
                            placeholder="15-character GSTIN"
                            maxLength={15}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            State code (optional)
                        </label>
                        <input
                            type="text"
                            value={form.transfer_invoice_state_code}
                            onChange={(e) => setField("transfer_invoice_state_code", e.target.value)}
                            className={inputCls}
                            placeholder="Auto from GSTIN if blank"
                            maxLength={2}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Registered address (optional)
                    </label>
                    <input
                        type="text"
                        value={form.transfer_invoice_address}
                        onChange={(e) => setField("transfer_invoice_address", e.target.value)}
                        className={inputCls}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                        <input
                            type="text"
                            value={form.transfer_invoice_city}
                            onChange={(e) => setField("transfer_invoice_city", e.target.value)}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                        <input
                            type="text"
                            value={form.transfer_invoice_phone}
                            onChange={(e) => setField("transfer_invoice_phone", e.target.value)}
                            className={inputCls}
                        />
                    </div>
                </div>

                {data?.updated_at && (
                    <p className="text-xs text-gray-400">
                        Last updated: {new Date(data.updated_at).toLocaleString("en-IN")}
                        {isFetching ? " · refreshing…" : ""}
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save size={16} />
                    {isSaving ? "Saving…" : "Save company details"}
                </button>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                Bill header uses this company legal name + GSTIN. Location ID, warehouse name,
                address, and manager still come from the dispatching warehouse.
            </div>
        </div>
    );
}
