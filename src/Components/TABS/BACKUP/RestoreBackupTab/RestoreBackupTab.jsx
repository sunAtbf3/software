// TABS/BACKUP/RestoreBackupTab/RestoreBackupTab.jsx

import React, { useRef, useState } from "react";
import { RotateCcw, Upload, AlertTriangle, FileText, X } from "lucide-react";
import { CURRENT_USER } from "../../../roles";
import {
    useGetBackupHistoryQuery,
    useGetRestoreHistoryQuery,
    useRestoreFromDriveMutation,
    uploadAndRestoreBackup,
    formatBackupDate,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Backup_api/backupApi";

const RESTORE_MODES = [
    { value: "MERGE", label: "Merge (recommended)", description: "Update existing records and add new ones." },
    { value: "MISSING_ONLY", label: "Missing only", description: "Only add records that do not already exist." },
    { value: "REPLACE", label: "Replace (Super Admin only)", description: "Delete scoped data from backup collections then restore." },
];

export default function RestoreBackupTab() {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [restoring, setRestoring] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [mode, setMode] = useState("MERGE");
    const [source, setSource] = useState("computer");
    const [selectedDriveBackupId, setSelectedDriveBackupId] = useState("");

    const { data: driveBackups } = useGetBackupHistoryQuery({
        page: 1,
        limit: 50,
        backup_type: "MANUAL_DRIVE",
    });
    const { data: restoreHistoryData, refetch: refetchRestoreHistory } = useGetRestoreHistoryQuery({ page: 1, limit: 10 });
    const [restoreFromDrive] = useRestoreFromDriveMutation();

    const isSuperAdmin = CURRENT_USER.role === "SUPER_ADMIN";
    const driveItems = (driveBackups?.items || []).filter((b) => b.status === "SUCCESS");
    const restoreHistory = restoreHistoryData?.items || [];

    const availableModes = RESTORE_MODES.filter((m) => m.value !== "REPLACE" || isSuperAdmin);

    const handleFilePick = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".zip")) {
            alert("Please select a .zip backup file");
            return;
        }
        setSelectedFile(file);
        setConfirmed(false);
    };

    const handleRestore = async () => {
        setRestoring(true);
        try {
            let summary;
            if (source === "drive") {
                if (!selectedDriveBackupId) {
                    alert("Select a backup from Google Drive");
                    return;
                }
                summary = await restoreFromDrive({ backup_id: selectedDriveBackupId, mode }).unwrap();
            } else {
                if (!selectedFile) {
                    alert("Select a backup file");
                    return;
                }
                summary = await uploadAndRestoreBackup(selectedFile, mode);
            }
            refetchRestoreHistory();
            alert(
                `Restore completed. Created: ${summary?.total_created ?? 0}, Updated: ${summary?.total_updated ?? 0}, Skipped: ${summary?.total_skipped ?? 0}`
            );
            setSelectedFile(null);
            setConfirmed(false);
            setSelectedDriveBackupId("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            alert(err?.data?.message || err?.response?.data?.message || "Restore failed");
        } finally {
            setRestoring(false);
        }
    };

    const canRestore = source === "drive" ? Boolean(selectedDriveBackupId) && confirmed : Boolean(selectedFile) && confirmed;

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <RotateCcw size={20} className="text-gray-400" />
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Restore Backup</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Restore your data from a backup ZIP or Google Drive</p>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0" size={22} />
                <div>
                    <p className="text-sm font-semibold text-amber-800">Restore changes database records</p>
                    <p className="text-xs text-amber-700 mt-1">
                        Take a fresh backup before restoring. Merge mode is safest. Replace mode deletes scoped data first (Super Admin only).
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Restore Options</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Source</label>
                        <select
                            value={source}
                            onChange={(e) => {
                                setSource(e.target.value);
                                setConfirmed(false);
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="computer">From Computer (upload ZIP)</option>
                            <option value="drive">From Google Drive</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Restore mode</label>
                        <select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                            {availableModes.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <p className="text-xs text-gray-400">
                    {availableModes.find((m) => m.value === mode)?.description}
                </p>

                {source === "computer" ? (
                    <>
                        <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFilePick} />
                        {!selectedFile ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-3 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                                <Upload size={32} className="text-gray-300" />
                                <p className="text-sm text-gray-400">Drop your backup .zip file here</p>
                                <p className="text-xs text-gray-400">or click to browse</p>
                            </button>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FileText className="text-green-500" size={20} />
                                    <div>
                                        <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                                        <p className="text-xs text-green-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setConfirmed(false);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="text-green-600 hover:text-green-800"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Select Drive backup</label>
                        <select
                            value={selectedDriveBackupId}
                            onChange={(e) => {
                                setSelectedDriveBackupId(e.target.value);
                                setConfirmed(false);
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Choose a backup...</option>
                            {driveItems.map((b) => (
                                <option key={b.backup_id} value={b.backup_id}>
                                    {b.display_id} — {b.filename} ({b.file_size_label})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {(selectedFile || selectedDriveBackupId) && (
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={() => setConfirmed(!confirmed)}
                            className="mt-1 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">
                            I understand this will modify database records using {mode.toLowerCase().replace("_", " ")} mode
                        </span>
                    </label>
                )}

                {canRestore && (
                    <button
                        type="button"
                        disabled={restoring}
                        onClick={handleRestore}
                        className={`w-full bg-red-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-red-700 transition-colors ${restoring ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                        {restoring ? "Restoring... Please wait" : "Restore Backup Now"}
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["File Used", "Mode", "Date", "Status"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {restoreHistory.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No restore history yet.</td>
                            </tr>
                        ) : (
                            restoreHistory.map((row) => (
                                <tr key={row.restore_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.source_filename}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.restore_mode}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400">{formatBackupDate(row.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "SUCCESS" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                            {row.status_label}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
