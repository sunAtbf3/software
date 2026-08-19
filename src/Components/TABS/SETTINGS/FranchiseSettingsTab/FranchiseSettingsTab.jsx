import React, { useEffect, useState } from "react";
import { Percent, Save } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useGetFranchiseSettingsQuery,
    useUpdateFranchiseSettingsMutation,
    useGetWholesaleSettingsQuery,
    useUpdateWholesaleSettingsMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/AppSettings_api/appSettingsApi";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";

export default function FranchiseSettingsTab() {
    const { data, isLoading, isFetching, refetch } = useGetFranchiseSettingsQuery();
    const [updateSettings, { isLoading: isSaving }] = useUpdateFranchiseSettingsMutation();
    const [markupPercent, setMarkupPercent] = useState("40");
    const allowedOptions = data?.allowed_markup_percents || [20, 40, 60];

    const {
        data: wholesaleData,
        isLoading: wholesaleLoading,
        isFetching: wholesaleFetching,
        refetch: refetchWholesale,
    } = useGetWholesaleSettingsQuery();
    const [updateWholesale, { isLoading: isSavingWholesale }] = useUpdateWholesaleSettingsMutation();
    const [wholesalePercent, setWholesalePercent] = useState("40");

    useEffect(() => {
        if (data?.franchise_markup_percent != null) {
            setMarkupPercent(String(data.franchise_markup_percent));
        }
    }, [data?.franchise_markup_percent]);

    useEffect(() => {
        if (wholesaleData?.wholesale_markup_percent != null) {
            setWholesalePercent(String(wholesaleData.wholesale_markup_percent));
        }
    }, [wholesaleData?.wholesale_markup_percent]);

    const handleSave = async () => {
        const pct = Number(markupPercent);
        if (!allowedOptions.includes(pct)) {
            toast.error(`Markup must be one of: ${allowedOptions.join("%, ")}%`);
            return;
        }
        try {
            await updateSettings({ franchise_markup_percent: pct }).unwrap();
            toast.success("Franchise markup updated");
            refetch();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to update franchise settings"));
        }
    };

    const handleSaveWholesale = async () => {
        const pct = Number(wholesalePercent);
        if (!Number.isFinite(pct) || pct < 0 || pct > 1000) {
            toast.error("Wholesale % must be a number between 0 and 1000");
            return;
        }
        try {
            await updateWholesale({ wholesale_markup_percent: pct }).unwrap();
            toast.success("Wholesale markup updated");
            refetchWholesale();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to update wholesale settings"));
        }
    };

    if (isLoading || wholesaleLoading) {
        return <div className="p-6 text-sm text-gray-500">Loading pricing settings…</div>;
    }

    return (
        <div className="space-y-6 max-w-xl">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Percent size={20} className="text-blue-600" />
                    Pricing
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Franchise F.Price and owner-shop wholesale use the same formula with separate %.
                    Changing % does not rewrite old bills or product masters.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Franchise transfer markup</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        F.Price = total cost + (special price − total cost) × markup%. Total cost =
                        purchase + expenses. Warehouse → franchise transfers only. 20 / 40 / 60.
                    </p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                        Global franchise markup %
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {allowedOptions.map((pct) => (
                            <button
                                key={pct}
                                type="button"
                                onClick={() => setMarkupPercent(String(pct))}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    Number(markupPercent) === pct
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                {pct}%
                            </button>
                        ))}
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
                    disabled={isSaving || Number(markupPercent) === data?.franchise_markup_percent}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save size={16} />
                    {isSaving ? "Saving…" : "Save franchise markup"}
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Owner shop wholesale billing</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Same formula as F.Price, custom %. Used on Mehta Mart owner billing counters
                        only — not franchise shops, and not the catalog wholesale_price field.
                    </p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                        Wholesale markup %
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            max="1000"
                            step="0.01"
                            value={wholesalePercent}
                            onChange={(e) => setWholesalePercent(e.target.value)}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-500">%</span>
                    </div>
                </div>
                {wholesaleData?.updated_at && (
                    <p className="text-xs text-gray-400">
                        Last updated: {new Date(wholesaleData.updated_at).toLocaleString("en-IN")}
                        {wholesaleFetching ? " · refreshing…" : ""}
                    </p>
                )}
                <button
                    type="button"
                    onClick={handleSaveWholesale}
                    disabled={
                        isSavingWholesale
                        || Number(wholesalePercent) === Number(wholesaleData?.wholesale_markup_percent)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                    <Save size={16} />
                    {isSavingWholesale ? "Saving…" : "Save wholesale markup"}
                </button>
            </div>
        </div>
    );
}
