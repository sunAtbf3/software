// TABS/BACKUP/AutoBackupTab/AutoBackupTab.jsx

import React, { useEffect, useState } from "react";
import { RefreshCw, Download, Trash2 } from "lucide-react";
import {
    useGetBackupStatsQuery,
    useGetBackupSettingsQuery,
    useUpdateBackupSettingsMutation,
    useGetBackupHistoryQuery,
    useDeleteBackupMutation,
    downloadBackupById,
    triggerBrowserDownload,
    formatBackupDate,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Backup_api/backupApi";

function Toggle({ enabled, onToggle, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={onToggle}
            className={`relative rounded-full w-10 h-6 transition-colors ${enabled ? "bg-blue-600" : "bg-gray-200"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? "translate-x-4" : ""}`} />
        </button>
    );
}

const statusClass = (status) => {
    if (status === "SUCCESS") return "bg-green-50 text-green-700 border border-green-200";
    if (status === "FAILED") return "bg-red-50 text-red-600 border border-red-200";
    return "bg-yellow-50 text-yellow-700 border border-yellow-200";
};

export default function AutoBackupTab() {
    const { data: stats, isFetching: statsLoading, refetch: refetchStats } = useGetBackupStatsQuery();
    const { data: settings, isLoading: settingsLoading } = useGetBackupSettingsQuery();
    const { data: historyData, refetch: refetchHistory } = useGetBackupHistoryQuery({ page: 1, limit: 20 });
    const [updateSettings, { isLoading: saving }] = useUpdateBackupSettingsMutation();
    const [deleteBackup] = useDeleteBackupMutation();

    const [enabled, setEnabled] = useState(false);
    const [frequency, setFrequency] = useState("DAILY");
    const [time, setTime] = useState("02:00");
    const [retention, setRetention] = useState("30");

    useEffect(() => {
        if (!settings) return;
        setEnabled(Boolean(settings.auto_backup_enabled));
        setFrequency(settings.auto_backup_frequency || "DAILY");
        setTime(settings.auto_backup_time || "02:00");
        setRetention(String(settings.retention_days || 30));
    }, [settings]);

    const history = historyData?.items || [];
    const lastBackup = stats?.last_backup;
    const nextScheduled = stats?.next_backup_scheduled;

    const handleRefresh = () => {
        refetchStats();
        refetchHistory();
    };

    const handleSave = async () => {
        try {
            await updateSettings({
                auto_backup_enabled: enabled,
                auto_backup_frequency: frequency,
                auto_backup_time: time,
                retention_days: Number(retention),
            }).unwrap();
            alert("Backup settings saved successfully");
        } catch (err) {
            alert(err?.data?.message || "Failed to save settings");
        }
    };

    const handleDownload = async (backupId) => {
        try {
            const { blob, filename } = await downloadBackupById(backupId);
            triggerBrowserDownload(blob, filename);
        } catch (err) {
            alert(err?.response?.data?.message || "Download failed. Computer backups are not stored on the server.");
        }
    };

    const handleDelete = async (backupId) => {
        if (!window.confirm("Delete this backup record? Drive files will also be removed if stored in cloud.")) return;
        try {
            await deleteBackup(backupId).unwrap();
        } catch (err) {
            alert(err?.data?.message || "Failed to delete backup");
        }
    };

    if (settingsLoading) {
        return <div className="p-6 text-sm text-gray-400">Loading backup settings...</div>;
    }

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Auto Backup</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Automatically backup your data on a schedule</p>
                </div>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={statsLoading}
                    className="bg-white border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5 transition-colors"
                >
                    <RefreshCw size={14} className={statsLoading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-green-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-green-500">Last Backup</p>
                    <p className="text-base font-semibold text-green-600 mt-1">
                        {lastBackup ? formatBackupDate(lastBackup.created_at) : "No backups yet"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {lastBackup?.status_label === "Success" ? "completed successfully" : lastBackup?.status_label || "—"}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-blue-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-blue-400">Next Backup</p>
                    <p className="text-base font-semibold text-blue-700 mt-1">
                        {enabled && nextScheduled ? formatBackupDate(nextScheduled) : "Auto backup is off"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{enabled ? "scheduled" : "enable auto backup to schedule"}</p>
                </div>
                <div className="bg-white rounded-xl border border-purple-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-purple-400">Total Backups</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats?.total_backups ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">stored backups</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Auto Backup Settings</h3>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Enable Auto Backup</span>
                    <Toggle enabled={enabled} onToggle={() => setEnabled(!enabled)} disabled={saving} />
                </div>
                {enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Frequency</label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Time</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Retention</label>
                            <select
                                value={retention}
                                onChange={(e) => setRetention(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                <option value="7">7 days</option>
                                <option value="30">30 days</option>
                                <option value="90">90 days</option>
                                <option value="365">1 year</option>
                            </select>
                        </div>
                    </div>
                )}
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Backup History</span>
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                        {history.length} records
                    </span>
                </div>
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Backup ID", "Type", "Size", "Status", "Duration", "Created At", "Actions"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No backups yet. Use Backup to Computer or Backup to Drive.</td>
                            </tr>
                        ) : (
                            history.map((row) => (
                                <tr key={row.backup_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.display_id}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.type_label}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.file_size_label}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(row.status)}`}>{row.status_label}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{row.duration_label}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{formatBackupDate(row.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            {row.can_download && row.storage_location === "GOOGLE_DRIVE" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(row.backup_id)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                                    aria-label="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(row.backup_id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                aria-label="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-600">
                    Auto backup scheduler runs on the server when enabled. Settings are saved immediately; scheduled jobs will use your retention and frequency preferences.
                </p>
            </div>
        </div>
    );
}
