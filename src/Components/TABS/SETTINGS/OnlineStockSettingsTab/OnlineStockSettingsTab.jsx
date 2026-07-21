import React, { useEffect, useMemo, useState } from "react";
import { Save, Warehouse } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useGetOnlineStockSettingsQuery,
    useUpdateOnlineStockSettingsMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/AppSettings_api/appSettingsApi";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";

export default function OnlineStockSettingsTab() {
    const { data, isLoading, isFetching, refetch } = useGetOnlineStockSettingsQuery();
    const { data: warehousesData, isLoading: warehousesLoading } = useGetWarehousesQuery({
        page: 1,
        limit: 100,
        is_active: "true",
    });
    const [updateSettings, { isLoading: isSaving }] = useUpdateOnlineStockSettingsMutation();
    const [warehouseId, setWarehouseId] = useState("");

    const warehouses = useMemo(() => warehousesData?.warehouses || [], [warehousesData]);

    useEffect(() => {
        setWarehouseId(data?.online_warehouse_id || "");
    }, [data?.online_warehouse_id]);

    const handleSave = async () => {
        try {
            await updateSettings({
                online_warehouse_id: warehouseId ? warehouseId : null,
            }).unwrap();
            toast.success("Online fulfillment warehouse updated");
            refetch();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to update online stock settings"));
        }
    };

    if (isLoading || warehousesLoading) {
        return <div className="p-6 text-sm text-gray-500">Loading online stock settings…</div>;
    }

    const selectedMatchesSaved = (warehouseId || null) === (data?.online_warehouse_id || null);

    return (
        <div className="space-y-6 max-w-xl">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Warehouse size={20} className="text-blue-600" />
                    Online Stock (E-comm / Wholesale)
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Choose the single warehouse whose variant stock is the source of truth for
                    e-comm and wholesale. Stock is matched by product code per variant — never
                    merged across variants.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                {data?.env_override_active && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <code className="text-xs">ONLINE_WAREHOUSE_ID</code> env override is active
                        on the server. UI selection is saved but stock APIs will use the env
                        warehouse until the env var is removed.
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                        Online fulfillment warehouse
                    </label>
                    <select
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">— Not configured —</option>
                        {warehouses.map((wh) => (
                            <option key={wh.warehouse_id} value={wh.warehouse_id}>
                                {wh.warehouse_code} — {wh.warehouse_name}
                                {wh.city ? ` (${wh.city})` : ""}
                            </option>
                        ))}
                    </select>
                    {data?.online_warehouse && (
                        <p className="mt-2 text-xs text-gray-500">
                            Current: {data.online_warehouse.warehouse_code} —{" "}
                            {data.online_warehouse.warehouse_name}
                            {!data.online_warehouse.is_active ? " (inactive)" : ""}
                        </p>
                    )}
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
                    disabled={isSaving || selectedMatchesSaved}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save size={16} />
                    {isSaving ? "Saving…" : "Save warehouse"}
                </button>
            </div>
        </div>
    );
}
