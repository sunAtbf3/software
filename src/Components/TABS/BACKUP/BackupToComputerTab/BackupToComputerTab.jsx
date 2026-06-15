// TABS/BACKUP/BackupToComputerTab/BackupToComputerTab.jsx

import React, { useState } from "react";
import { HardDrive, Download } from "lucide-react";
import {
    useGetBackupStatsQuery,
    useGetBackupHistoryQuery,
    downloadBackupToComputerAndSave,
    formatBackupDate,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Backup_api/backupApi";

export default function BackupToComputerTab() {
    const { data: stats } = useGetBackupStatsQuery();
    const { data: historyData, refetch } = useGetBackupHistoryQuery({
        page: 1,
        limit: 10,
        backup_type: "MANUAL_COMPUTER",
    });

    const [isBackingUp, setIsBackingUp] = useState(false);
    const history = historyData?.items || [];
    const lastBackup = stats?.last_backup;

    const handleDownload = async () => {
        setIsBackingUp(true);
        try {
            await downloadBackupToComputerAndSave();
            refetch();
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                (err?.response?.data instanceof Blob
                    ? "Backup failed"
                    : err?.message) ||
                "Backup failed";
            alert(message);
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <HardDrive size={20} className="text-gray-400" />
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Backup To Computer</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Download a backup ZIP of your scoped data to your local machine</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-blue-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-blue-400">Total Backups</p>
                    <p className="text-3xl font-bold text-blue-700 mt-1">{stats?.total_backups ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">all backup types</p>
                </div>
                <div className="bg-white rounded-xl border border-green-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-green-500">Last Backup</p>
                    <p className="text-base font-semibold text-green-600 mt-1">
                        {lastBackup ? formatBackupDate(lastBackup.created_at) : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{lastBackup?.file_size_label || "no backup yet"}</p>
                </div>
                <div className="bg-white rounded-xl border border-purple-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-purple-400">Computer Downloads</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats?.total_computer_backups ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">logged in history</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Create Backup</h3>
                <p className="text-xs text-gray-400 mb-4">
                    Your backup includes data for your role (shop, warehouse, or full system for Super Admin). The ZIP is generated on the server and saved to your browser&apos;s Downloads folder — check the download icon in your browser toolbar when it finishes.
                </p>
                <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handleDownload}
                    className={`w-full bg-blue-600 text-white text-sm font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 ${isBackingUp ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                    <Download size={16} />
                    {isBackingUp ? "Preparing backup..." : "Download Backup to Computer"}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Backup ID", "File Name", "Size", "Status", "Date"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No computer backups logged yet.</td>
                            </tr>
                        ) : (
                            history.map((row) => (
                                <tr key={row.backup_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.display_id}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.filename}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.file_size_label}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.status_label}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{formatBackupDate(row.created_at)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
                <p className="text-xs text-yellow-700">
                    Keep your backup file in a safe location. Anyone with this file can restore your business data. Do not share it publicly.
                </p>
            </div>
        </div>
    );
}
