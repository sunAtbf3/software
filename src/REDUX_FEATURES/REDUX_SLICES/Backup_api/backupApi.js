import { createApi } from "@reduxjs/toolkit/query/react";
import AxiosInstance from "../../../SERVICES/AxiosInstance";

const axiosBaseQuery =
  () =>
  async ({ url, method = "GET", data, params, headers, responseType }) => {
    try {
      const result = await AxiosInstance({
        url,
        method,
        data,
        params,
        headers,
        responseType,
      });
      return { data: result.data };
    } catch (axiosError) {
      return {
        error: {
          status: axiosError.response?.status || 500,
          data: axiosError.response?.data || {
            message: axiosError.message || "Request failed",
          },
        },
      };
    }
  };

const unwrap = (response) => response?.data ?? response;

export const backupApi = createApi({
  reducerPath: "backupApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["BackupStats", "BackupHistory", "BackupSettings", "GoogleDrive", "RestoreHistory"],
  endpoints: (builder) => ({
    getBackupSettings: builder.query({
      query: () => ({ url: "/backups/settings", method: "GET" }),
      transformResponse: unwrap,
      providesTags: ["BackupSettings"],
    }),

    updateBackupSettings: builder.mutation({
      query: (body) => ({
        url: "/backups/settings",
        method: "PUT",
        data: body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ["BackupSettings", "BackupStats"],
    }),

    getBackupStats: builder.query({
      query: () => ({ url: "/backups/stats", method: "GET" }),
      transformResponse: unwrap,
      providesTags: ["BackupStats"],
    }),

    getBackupHistory: builder.query({
      query: ({ page = 1, limit = 20, backup_type } = {}) => ({
        url: "/backups/history",
        method: "GET",
        params: { page, limit, backup_type },
      }),
      transformResponse: (response) => ({
        items: response?.data ?? [],
        meta: response?.meta ?? {},
      }),
      providesTags: ["BackupHistory"],
    }),

    getRestoreHistory: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => ({
        url: "/backups/restore-history",
        method: "GET",
        params: { page, limit },
      }),
      transformResponse: (response) => ({
        items: response?.data ?? [],
        meta: response?.meta ?? {},
      }),
      providesTags: ["RestoreHistory"],
    }),

    createBackupToDrive: builder.mutation({
      query: () => ({
        url: "/backups/create",
        method: "POST",
        data: { destination: "drive" },
      }),
      transformResponse: unwrap,
      invalidatesTags: ["BackupStats", "BackupHistory"],
    }),

    deleteBackup: builder.mutation({
      query: (backupId) => ({
        url: `/backups/${backupId}`,
        method: "DELETE",
      }),
      transformResponse: unwrap,
      invalidatesTags: ["BackupStats", "BackupHistory"],
    }),

    getGoogleDriveStatus: builder.query({
      query: () => ({ url: "/backups/google/status", method: "GET" }),
      transformResponse: unwrap,
      providesTags: ["GoogleDrive"],
    }),

    getGoogleConnectUrl: builder.query({
      query: () => ({ url: "/backups/google/connect-url", method: "GET" }),
      transformResponse: unwrap,
    }),

    disconnectGoogleDrive: builder.mutation({
      query: () => ({
        url: "/backups/google/disconnect",
        method: "POST",
      }),
      transformResponse: unwrap,
      invalidatesTags: ["GoogleDrive"],
    }),

    restoreFromDrive: builder.mutation({
      query: ({ backup_id, mode = "MERGE" }) => ({
        url: "/backups/restore/drive",
        method: "POST",
        data: { backup_id, mode },
      }),
      transformResponse: unwrap,
      invalidatesTags: ["RestoreHistory", "BackupStats"],
    }),
  }),
});

export const {
  useGetBackupSettingsQuery,
  useUpdateBackupSettingsMutation,
  useGetBackupStatsQuery,
  useGetBackupHistoryQuery,
  useGetRestoreHistoryQuery,
  useCreateBackupToDriveMutation,
  useDeleteBackupMutation,
  useGetGoogleDriveStatusQuery,
  useLazyGetGoogleConnectUrlQuery,
  useDisconnectGoogleDriveMutation,
  useRestoreFromDriveMutation,
} = backupApi;

const INDIAN_TZ = "Asia/Kolkata";

/** Date/time parts in Indian timezone with 12-hour AM/PM — keep in sync with backend buildBackupFilename. */
const getIndianDateTimeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const pick = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour").padStart(2, "0"),
    minute: pick("minute"),
    second: pick("second"),
    ampm: pick("dayPeriod").toUpperCase(),
  };
};

/** Matches backend buildBackupFilename — used when response headers are unavailable. */
export function buildBackupDownloadFilename(date = new Date()) {
  const { year, month, day, hour, minute, second, ampm } = getIndianDateTimeParts(date);
  return `BizCentroBackup_${year}-${month}-${day}_${hour}.${minute}.${second}${ampm}.zip`;
}

const parseBackupFilenameFromResponse = (response) => {
  const fromCustom = response.headers["x-backup-filename"];
  if (fromCustom) return fromCustom;

  const disposition = response.headers["content-disposition"] || "";
  const quoted = disposition.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];

  const unquoted = disposition.match(/filename=([^;]+)/i);
  if (unquoted?.[1]) return unquoted[1].trim().replace(/^"|"$/g, "");

  return buildBackupDownloadFilename();
};

/** Download backup ZIP to user's computer (not RTK — binary response). */
export async function downloadBackupToComputer() {
  try {
    const response = await AxiosInstance.post(
      "/backups/create",
      { destination: "computer" },
      { responseType: "blob" }
    );
    const filename = parseBackupFilenameFromResponse(response);
    return { blob: response.data, filename };
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        const json = JSON.parse(text);
        err.response.data = json;
      } catch {
        err.response.data = { message: text || "Backup failed" };
      }
    }
    throw err;
  }
}

export async function downloadBackupById(backupId) {
  const response = await AxiosInstance.get(`/backups/${backupId}/download`, {
    responseType: "blob",
  });
  const filename = parseBackupFilenameFromResponse(response);
  return { blob: response.data, filename };
}

export async function uploadAndRestoreBackup(file, mode = "MERGE") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  const response = await AxiosInstance.post("/backups/restore/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.data ?? response.data;
}

export function triggerBrowserDownload(blob, filename) {
  const zipBlob =
    blob instanceof Blob
      ? blob
      : new Blob([blob], { type: "application/zip" });

  const file =
    zipBlob instanceof File
      ? zipBlob
      : new File([zipBlob], filename, { type: "application/zip" });

  const url = window.URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke too early can cancel the download before Chrome registers it in the Downloads bar.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
}

/** Generate backup on server, then save via normal browser download (shows in Downloads icon). */
export async function downloadBackupToComputerAndSave() {
  const { blob, filename } = await downloadBackupToComputer();
  triggerBrowserDownload(blob, filename);
  return { filename };
}

export function formatBackupDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
