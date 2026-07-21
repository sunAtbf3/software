import React, { useEffect, useState } from "react";

import { Percent, Save } from "lucide-react";

import { toast } from "../../../shared/ToastConfig";

import {

    useGetFranchiseSettingsQuery,

    useUpdateFranchiseSettingsMutation,

} from "../../../../REDUX_FEATURES/REDUX_SLICES/AppSettings_api/appSettingsApi";

import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";



export default function FranchiseSettingsTab() {

    const { data, isLoading, isFetching, refetch } = useGetFranchiseSettingsQuery();

    const [updateSettings, { isLoading: isSaving }] = useUpdateFranchiseSettingsMutation();

    const [markupPercent, setMarkupPercent] = useState("40");



    const allowedOptions = data?.allowed_markup_percents || [20, 40, 60];



    useEffect(() => {

        if (data?.franchise_markup_percent != null) {

            setMarkupPercent(String(data.franchise_markup_percent));

        }

    }, [data?.franchise_markup_percent]);



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



    if (isLoading) {

        return <div className="p-6 text-sm text-gray-500">Loading franchise settings…</div>;

    }



    return (

        <div className="space-y-6 max-w-xl">

            <div>

                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">

                    <Percent size={20} className="text-blue-600" />

                    Franchise Transfer Pricing

                </h2>

                <p className="text-sm text-gray-500 mt-1">

                    F.Price = total cost + (special price − total cost) × markup%. Total cost =
                    purchase + expenses. Applied on warehouse → franchise shop transfers only.
                    GST identity for transfer bills is configured in Company Details.

                </p>

            </div>



            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">

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

                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${Number(markupPercent) === pct

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

                    {isSaving ? "Saving…" : "Save markup"}

                </button>

            </div>

        </div>

    );

}


