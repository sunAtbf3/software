// TABS/BACKUP/BackupToDriveTab/BackupToDriveTab.jsx

import React, { useEffect } from "react";
import { Cloud, Link, Upload } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
    useGetGoogleDriveStatusQuery,
    useLazyGetGoogleConnectUrlQuery,
    useDisconnectGoogleDriveMutation,
    useCreateBackupToDriveMutation,
    useGetBackupHistoryQuery,
    formatBackupDate,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Backup_api/backupApi";

const statusClass = (status) => {
    if (status === "SUCCESS") return "bg-green-50 text-green-700 border border-green-200";
    if (status === "FAILED") return "bg-red-50 text-red-600 border border-red-200";
    return "bg-yellow-50 text-yellow-700 border border-yellow-200";
};

export default function BackupToDriveTab() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: driveStatus, refetch: refetchDrive } = useGetGoogleDriveStatusQuery();
    const [fetchConnectUrl] = useLazyGetGoogleConnectUrlQuery();
    const [disconnectDrive, { isLoading: disconnecting }] = useDisconnectGoogleDriveMutation();
    const [backupToDrive, { isLoading: uploading }] = useCreateBackupToDriveMutation();
    const { data: historyData, refetch: refetchHistory } = useGetBackupHistoryQuery({
        page: 1,
        limit: 10,
        backup_type: "MANUAL_DRIVE",
    });

    const connected = Boolean(driveStatus?.connected);
    const configured = driveStatus?.configured !== false;
    const history = historyData?.items || [];

    useEffect(() => {
        const driveResult = searchParams.get("drive");
        if (driveResult === "connected") {
            refetchDrive();
            alert("Google Drive connected successfully");
            setSearchParams({ tab: "backup", ctab: "backuptodrive" }, { replace: true });
        }
        if (driveResult === "error") {
            alert("Google Drive connection failed. Please try again.");
            setSearchParams({ tab: "backup", ctab: "backuptodrive" }, { replace: true });
        }
    }, [setSearchParams, refetchDrive]);

    const handleConnect = async () => {
        try {
            const result = await fetchConnectUrl().unwrap();
            if (result?.url) {
                window.location.href = result.url;
            }
        } catch (err) {
            alert(err?.data?.message || "Google Drive is not configured on the server");
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnectDrive().unwrap();
        } catch (err) {
            alert(err?.data?.message || "Failed to disconnect");
        }
    };

    const handleSyncNow = async () => {
        try {
            await backupToDrive().unwrap();
            alert("Backup uploaded to Google Drive successfully");
            refetchHistory();
        } catch (err) {
            alert(err?.data?.message || "Backup to Drive failed");
        }
    };

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <Cloud size={20} className="text-gray-400" />
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Backup To Drive</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Upload manual backups to your Google Drive account</p>
                    </div>
                    <Link size={16} className="text-gray-300 ml-auto hidden sm:block" />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
                {!configured ? (
                    <div className="text-center py-6 text-sm text-amber-600">
                        Google Drive is not configured on the server. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to backend .env.
                    </div>
                ) : !connected ? (
                    <div className="flex flex-col items-center text-center py-6 gap-3">
                        <Cloud size={40} className="text-gray-300" />
                        <p className="text-base font-semibold text-gray-500">Not Connected</p>
                        <p className="text-sm text-gray-400">Connect your Google Drive to enable cloud backups</p>
                        <button
                            type="button"
                            onClick={handleConnect}
                            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 mt-2"
                        >
                            Connect Google Drive
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-semibold text-green-700">Connected to Google Drive</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="bg-white border border-red-200 text-red-500 text-sm px-4 py-2 rounded-lg hover:bg-red-50 inline-flex items-center gap-2 transition-colors"
                            >
                                {disconnecting ? "Disconnecting..." : "Disconnect"}
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">{driveStatus?.email || "Google account connected"}</p>
                        <button
                            type="button"
                            onClick={handleSyncNow}
                            disabled={uploading}
                            className="bg-white border border-green-200 text-green-600 text-sm px-4 py-2 rounded-lg hover:bg-green-50 inline-flex items-center gap-2 transition-colors disabled:opacity-60"
                        >
                            <Upload size={14} />
                            {uploading ? "Uploading backup..." : "Backup to Drive Now"}
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Backup ID", "File Name", "Size", "Status", "Synced At"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No Drive backups yet.</td>
                            </tr>
                        ) : (
                            history.map((row) => (
                                <tr key={row.backup_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.display_id}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.filename}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.file_size_label}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(row.status)}`}>
                                            {row.status_label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{formatBackupDate(row.created_at)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-600">
                    Cloud backups are stored in a folder named BizCentro_Backups in your Google Drive. Storage used counts against your Google account quota.
                </p>
            </div>
        </div>
    );
}
