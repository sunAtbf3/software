import React, { useEffect, useState } from "react";
import { Building2, Save, RefreshCw, Info, FileText, MapPin } from "lucide-react";
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
    transfer_invoice_email: "",
};

const inputCls =
    "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors";

const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide";

function SectionHeader({ icon: Icon, title, description }) {
    return (
        <div>
            <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 shrink-0">
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                    {description && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

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
            transfer_invoice_email: data.transfer_invoice_email || "",
        });
    }, [data]);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        const legal = form.transfer_invoice_legal_name.trim();
        const gstin = form.transfer_invoice_gstin.trim().toUpperCase();
        const email = form.transfer_invoice_email.trim();
        if (!legal) {
            toast.error("Company legal name is required");
            return;
        }
        if (gstin && gstin.length !== 15) {
            toast.error("GSTIN must be 15 characters");
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Enter a valid company email");
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
                transfer_invoice_email: email || null,
            }).unwrap();
            toast.success("Company details saved");
            refetch();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to save company details"));
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm font-medium tracking-wide">Loading company details…</span>
            </div>
        );
    }

    const gstinLen = form.transfer_invoice_gstin.length;

    return (
        <div className="max-w-4xl mx-auto px-1 py-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-100">
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 shadow-sm hidden sm:block">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Company Details</h2>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-xl leading-relaxed">
                            Legal identity and GST used on warehouse → shop stock transfer bills.
                            Warehouse location, name, and manager still appear from the dispatching warehouse.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-60 shrink-0"
                    title="Refresh company details"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-blue-500" : ""}`} />
                    {isFetching ? "Refreshing…" : "Refresh"}
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md/5 transition-all duration-300 overflow-hidden">
                <div className="p-5 md:p-7 space-y-8">
                    <section className="space-y-4">
                        <SectionHeader
                            icon={FileText}
                            title="Legal identity"
                            description="Registered company name printed on transfer bill headers."
                        />
                        <div>
                            <label className={labelCls}>
                                Company legal name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.transfer_invoice_legal_name}
                                onChange={(e) => setField("transfer_invoice_legal_name", e.target.value)}
                                className={inputCls}
                                placeholder="e.g. OfferWale Baba Private Limited"
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <SectionHeader
                            icon={Building2}
                            title="Tax & GST"
                            description="GSTIN and state code for GST and non-GST transfer bills."
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Company GSTIN</label>
                                <input
                                    type="text"
                                    value={form.transfer_invoice_gstin}
                                    onChange={(e) =>
                                        setField("transfer_invoice_gstin", e.target.value.toUpperCase())
                                    }
                                    className={`${inputCls} font-mono tracking-wide uppercase`}
                                    placeholder="15-character GSTIN"
                                    maxLength={15}
                                />
                                <p className="mt-1.5 text-[11px] text-gray-400">
                                    {gstinLen}/15 characters
                                    {gstinLen > 0 && gstinLen < 15 ? " · incomplete" : ""}
                                </p>
                            </div>
                            <div>
                                <label className={labelCls}>
                                    State code <span className="font-normal text-gray-400">(optional)</span>
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
                    </section>

                    <section className="space-y-4">
                        <SectionHeader
                            icon={MapPin}
                            title="Registered address & contact"
                            description="Optional details shown on bills when configured."
                        />
                        <div>
                            <label className={labelCls}>
                                Registered address <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={form.transfer_invoice_address}
                                onChange={(e) => setField("transfer_invoice_address", e.target.value)}
                                className={inputCls}
                                placeholder="Street, area, landmark"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>City</label>
                                <input
                                    type="text"
                                    value={form.transfer_invoice_city}
                                    onChange={(e) => setField("transfer_invoice_city", e.target.value)}
                                    className={inputCls}
                                    placeholder="City"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Phone</label>
                                <input
                                    type="text"
                                    value={form.transfer_invoice_phone}
                                    onChange={(e) => setField("transfer_invoice_phone", e.target.value)}
                                    className={inputCls}
                                    placeholder="Contact number"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>
                                Email <span className="font-normal text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="email"
                                value={form.transfer_invoice_email}
                                onChange={(e) => setField("transfer_invoice_email", e.target.value)}
                                className={inputCls}
                                placeholder="company@example.com"
                                autoComplete="email"
                            />
                            <p className="mt-1.5 text-[11px] text-gray-400">
                                Phone and email print on GST and Non-GST stock transfer bill headers.
                            </p>
                        </div>
                    </section>
                </div>

                <div className="mx-5 md:mx-7 mb-5 md:mb-7 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        Bill header uses this company legal name, GSTIN, phone, and email.
                        Location ID, warehouse name, address, and dispatched-by still come from the
                        dispatching warehouse.
                    </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 md:px-7 py-4 bg-gray-50/60 border-t border-gray-100">
                    {data?.updated_at ? (
                        <p className="text-[11px] text-gray-400">
                            Last saved: {new Date(data.updated_at).toLocaleString("en-IN")}
                        </p>
                    ) : (
                        <span />
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all duration-150 shadow-sm shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
                    >
                        {isSaving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Saving…</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save company details</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
