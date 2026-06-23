// TABS/SALES/OfflineSyncTab.jsx
//
// Phase 2.1 — Offline bill history and pending sync queue for shop staff.

import React, { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
    RefreshCw,
    CloudOff,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Eye,
    RotateCcw,
    X,
    Receipt,
    User,
    Printer,
    Download,
    Wrench,
    Smartphone,
    Package,
    Wallet,
} from "lucide-react";
import { toast } from "../../shared/ToastConfig";
import { useLazyGetBillPdfQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
import { useBillDocumentActions } from "../../../offline/hooks/useBillDocumentActions";
import { getUserShopId, OUTBOX_STATUS } from "../../../offline/constants";
import { useOfflineBillsPanel } from "../../../offline/hooks/useOfflineBillsPanel";
import { useManualSync, useOfflineStatus } from "../../../offline/hooks/useOfflineStatus";
import { outboxRepository } from "../../../offline/db/repositories/outboxRepository";
import { syncEngine } from "../../../offline/sync/syncEngine";
import { mapSyncedLocalBillToUi } from "../../../offline/billing/offlineBilling.service";
import SyncIssueModal from "../../../offline/components/SyncIssueModal";
import UpiQrDisplayModal from "../../Billing/UpiQrDisplayModal";
import { getSyncIssuePresentation } from "../../../offline/sync/syncErrorCatalog";
import { canShowBillUpiQr } from "../../../utils/upiQr";

const fmtDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const fmtMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FILTERS = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "synced", label: "Synced" },
    { id: "failed", label: "Failed" },
];

const resolveRowStatus = ({ bill, outbox }) => {
    if (outbox?.status === OUTBOX_STATUS.ERROR) return "error";
    if (outbox?.status === OUTBOX_STATUS.CONFLICT) return "conflict";
    if (outbox?.status === OUTBOX_STATUS.SYNCING) return "syncing";
    if (bill.sync_status === "synced" || outbox?.status === OUTBOX_STATUS.SYNCED) return "synced";
    return "pending";
};

const StatusBadge = ({ status }) => {
    const config = {
        pending: { cls: "bg-amber-100 text-amber-800", label: "Pending sync", icon: Clock },
        syncing: { cls: "bg-blue-100 text-blue-800", label: "Syncing", icon: RefreshCw },
        synced: { cls: "bg-green-100 text-green-800", label: "Synced", icon: CheckCircle2 },
        error: { cls: "bg-red-100 text-red-800", label: "Sync failed", icon: AlertTriangle },
        conflict: { cls: "bg-orange-100 text-orange-800", label: "Conflict", icon: AlertTriangle },
    }[status] || { cls: "bg-gray-100 text-gray-700", label: status, icon: Clock };

    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
            <Icon size={12} className={status === "syncing" ? "animate-spin" : ""} />
            {config.label}
        </span>
    );
};

const BillDetailModal = ({ row, onClose, onPrint, onDownloadPdf, onShowUpiQr, isPrinting, isPdfLoading }) => {
    if (!row) return null;
    const { bill, outbox } = row;
    const displayBill = bill.sync_status === "synced" ? mapSyncedLocalBillToUi(bill) : bill;
    const totalQty = bill.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-start">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Offline Bill Details</h3>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{displayBill.bill_number}</p>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <StatusBadge status={resolveRowStatus(row)} />
                            {displayBill.offline_bill_number && displayBill.offline_bill_number !== displayBill.bill_number && (
                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    Offline: {displayBill.offline_bill_number}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-500">Created</p>
                                <p className="font-medium">{fmtDateTime(bill.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Customer</p>
                                <p className="font-medium">{bill.customer_name || "Walk-in Customer"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Amount</p>
                                <p className="font-medium">{fmtMoney(bill.total_amount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Payment</p>
                                <p className="font-medium">{bill.payment_method || "—"} · {bill.payment_status || "—"}</p>
                            </div>
                            {bill.staff_code_value && (
                                <div>
                                    <p className="text-xs text-gray-500">Staff</p>
                                    <p className="font-medium">{bill.staff_code_value} — {bill.staff_name_snapshot}</p>
                                </div>
                            )}
                            {displayBill.server_bill_number && (
                                <div>
                                    <p className="text-xs text-gray-500">Server invoice</p>
                                    <p className="font-medium font-mono text-sm">{displayBill.server_bill_number}</p>
                                </div>
                            )}
                        </div>

                        {outbox?.last_error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                <p className="font-medium mb-1">Last sync error</p>
                                <p className="text-xs">{outbox.last_error}</p>
                            </div>
                        )}

                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Items ({totalQty})</p>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(bill.items || []).map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2">
                                                    <p className="font-medium">
                                                        {item.variant?.product?.name ||
                                                         item.product?.name ||
                                                         item.manual_item_name ||
                                                         item.item_name ||
                                                         item.product_name ||
                                                         "Item"}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{item.variant?.sku || "—"}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right font-medium">{fmtMoney(item.line_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex flex-wrap justify-end gap-2">
                        {canShowBillUpiQr(displayBill) && (
                            <button
                                type="button"
                                onClick={() => onShowUpiQr?.(displayBill)}
                                disabled={isPrinting || isPdfLoading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-60"
                            >
                                <Smartphone size={14} /> UPI QR
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onPrint?.(displayBill)}
                            disabled={isPrinting || isPdfLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
                        >
                            <Printer size={14} /> {isPrinting ? "Printing…" : "Print"}
                        </button>
                        <button
                            type="button"
                            onClick={() => onDownloadPdf?.(displayBill)}
                            disabled={isPrinting || isPdfLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                        >
                            <Download size={14} /> {isPdfLoading ? "Loading…" : "Download PDF"}
                        </button>
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const outboxEntityIcon = (entityType) => {
    if (entityType === "customer") return User;
    if (entityType === "stock_adjustment") return Package;
    if (entityType === "shop_expense") return Wallet;
    return Receipt;
};

const outboxEntityLabel = (row) => {
    const type = row.entity_type;
    if (type === "customer") {
        return row.payload?.name || row.payload?.mobile || "Customer";
    }
    if (type === "stock_adjustment") {
        const ref = row.payload?.offline_reference;
        const op = row.payload?.operation;
        const qty = row.payload?.quantity;
        const name = row.payload?.product_name;
        return [ref, name, op && qty != null ? `${op} ${qty}` : null].filter(Boolean).join(" · ");
    }
    if (type === "shop_expense") {
        return row.payload?.offline_expense_number
            ? `${row.payload.offline_expense_number} — ${row.payload.description || "Expense"}`
            : row.payload?.description || "Shop expense";
    }
    return type.replace(/_/g, " ");
};

const outboxEntityTitle = (entityType) => {
    if (entityType === "stock_adjustment") return "Stock adjustment";
    if (entityType === "shop_expense") return "Shop expense";
    if (entityType === "customer") return "Customer";
    return entityType.replace(/_/g, " ");
};

export default function OfflineSyncTab() {
    const { user } = useSelector((state) => state.auth);
    const [searchParams] = useSearchParams();
    const { isOnline, isSyncing, lastSyncError } = useOfflineStatus();
    const shopId = getUserShopId(user);
    const [triggerPdf] = useLazyGetBillPdfQuery();
    const { printBill, downloadPdf, isPrinting, isPdfLoading } = useBillDocumentActions({
        triggerServerPdf: triggerPdf,
        isOnline,
    });
    const { billRows, nonBillOutbox, summary, loading, refresh } = useOfflineBillsPanel(shopId);
    const { triggerSync, isRunning } = useManualSync();

    const [filter, setFilter] = useState("all");
    const [selectedRow, setSelectedRow] = useState(null);
    const [issueTarget, setIssueTarget] = useState(null);
    const [retryingId, setRetryingId] = useState(null);
    const [upiQrBill, setUpiQrBill] = useState(null);

    useEffect(() => {
        const urlFilter = searchParams.get("syncFilter");
        if (urlFilter === "failed") {
            setFilter("failed");
        }
    }, [searchParams]);

    const busy = isSyncing || isRunning;

    const filteredRows = useMemo(() => {
        return billRows.filter((row) => {
            const status = resolveRowStatus(row);
            if (filter === "all") return true;
            if (filter === "pending") return status === "pending" || status === "syncing";
            if (filter === "synced") return status === "synced";
            if (filter === "failed") return status === "error" || status === "conflict";
            return true;
        });
    }, [billRows, filter]);

    const handleOpenIssue = (row) => {
        if (!row?.outbox) return;
        setIssueTarget({
            bill: row.bill,
            outbox: row.outbox,
            entityType: row.outbox.entity_type,
        });
    };

    const handleOpenOutboxIssue = (outboxRow) => {
        setIssueTarget({
            outbox: outboxRow,
            entityType: outboxRow.entity_type,
        });
    };

    const handleSyncNow = async () => {
        if (!isOnline) {
            toast.error("Connect to the internet to sync");
            return;
        }
        try {
            await triggerSync();
            await refresh();
            toast.success("Sync completed");
        } catch (err) {
            toast.error(err?.message || "Sync failed");
        }
    };

    const handleRetryOne = async (clientId) => {
        if (!isOnline) {
            toast.error("Connect to the internet to retry sync");
            return;
        }
        setRetryingId(clientId);
        try {
            await outboxRepository.resetForRetry(clientId);
            await syncEngine.runPushOnly(user);
            await refresh();
            toast.success("Retry submitted");
        } catch (err) {
            toast.error(err?.message || "Retry failed");
        } finally {
            setRetryingId(null);
        }
    };

    const handleRetryAllFailed = async () => {
        if (!isOnline) {
            toast.error("Connect to the internet to retry sync");
            return;
        }
        if (!summary.failedItems) {
            toast.info("No failed items to retry");
            return;
        }
        try {
            await outboxRepository.resetAllRetryable(shopId);
            await syncEngine.runPushOnly(user);
            await refresh();
            toast.success("Retrying failed items");
        } catch (err) {
            toast.error(err?.message || "Retry failed");
        }
    };

    if (!shopId) {
        return (
            <div className="app-card p-8 text-center text-gray-500">
                <CloudOff className="mx-auto mb-3 text-gray-400" size={32} />
                <p>Offline sync is available for shop users only.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Offline Bills & Sync</h2>
                    <p className="text-sm text-gray-500">
                        Bills created while offline and their sync status to the server.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {summary.failedItems > 0 && (
                        <button
                            type="button"
                            onClick={handleRetryAllFailed}
                            disabled={busy || !isOnline}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-orange-300 text-orange-700 text-sm font-medium hover:bg-orange-50 disabled:opacity-50"
                        >
                            <RotateCcw size={14} />
                            Retry failed ({summary.failedItems})
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={busy || !isOnline}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                        {busy ? "Syncing…" : "Sync now"}
                    </button>
                </div>
            </div>

            {!isOnline && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <CloudOff size={16} />
                    You are offline. Pending bills will sync automatically when connection returns.
                </div>
            )}

            {lastSyncError && isOnline && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    Last sync error: {lastSyncError}
                </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total offline bills", value: summary.totalBills, tone: "text-gray-800" },
                    { label: "Pending sync", value: summary.pendingBills, tone: "text-amber-700" },
                    { label: "Synced", value: summary.syncedBills, tone: "text-green-700" },
                    { label: "Failed / conflict", value: summary.failedItems, tone: "text-red-700" },
                ].map((card) => (
                    <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-xs text-gray-500">{card.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${card.tone}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setFilter(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            filter === item.id
                                ? "bg-gray-900 text-white"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Bills table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bill #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Server invoice</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Created</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                                        <RefreshCw size={20} className="inline animate-spin mr-2" />
                                        Loading offline bills…
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                                        <Receipt className="mx-auto mb-2 opacity-40" size={28} />
                                        No offline bills in this view
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row) => {
                                    const { bill, outbox } = row;
                                    const status = resolveRowStatus(row);
                                    const clientId = bill.client_bill_id || bill.bill_id;
                                    const canRetry = (status === "error" || status === "conflict") && isOnline;
                                    const docBusy = isPrinting || isPdfLoading;

                                    return (
                                        <tr key={clientId} className="text-gray-700 hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                                    {bill.offline_bill_number || bill.bill_number}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                                {bill.server_bill_number || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {bill.customer_name || "Walk-in"}
                                                {bill.customer_mobile && (
                                                    <p className="text-xs text-gray-400">{bill.customer_mobile}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">{fmtDateTime(bill.created_at)}</td>
                                            <td className="px-4 py-3 text-right font-semibold">{fmtMoney(bill.total_amount)}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={status} />
                                                {(status === "error" || status === "conflict") && outbox && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenIssue(row)}
                                                        className="text-xs text-orange-700 hover:underline mt-1 block text-left max-w-[200px] truncate"
                                                        title={outbox.last_error || "View issue"}
                                                    >
                                                        {getSyncIssuePresentation({
                                                            errorCode: outbox.error_code,
                                                            lastError: outbox.last_error,
                                                            entityType: outbox.entity_type,
                                                        }).title}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => printBill(bill)}
                                                        disabled={docBusy}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                                        title="Print bill"
                                                    >
                                                        <Printer size={12} />
                                                    </button>
                                                    {canShowBillUpiQr(bill) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUpiQrBill(bill)}
                                                            disabled={docBusy}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                                            title="Show UPI QR"
                                                        >
                                                            <Smartphone size={12} />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadPdf(bill.sync_status === "synced" ? mapSyncedLocalBillToUi(bill) : bill)}
                                                        disabled={docBusy}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                                        title="Download PDF"
                                                    >
                                                        <Download size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRow(row)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-purple-700 hover:bg-purple-50"
                                                    >
                                                        <Eye size={12} /> View
                                                    </button>
                                                    {canRetry && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenIssue(row)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-orange-800 bg-orange-50 hover:bg-orange-100"
                                                                title="Fix sync issue"
                                                            >
                                                                <Wrench size={12} /> Fix
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRetryOne(clientId)}
                                                                disabled={retryingId === clientId}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                                                            >
                                                                <RotateCcw size={12} className={retryingId === clientId ? "animate-spin" : ""} />
                                                                Retry
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Other pending sync items (customers, etc.) */}
            {nonBillOutbox.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">Other pending sync items</h3>
                        <p className="text-xs text-gray-500">Customers, stock adjustments, expenses waiting to upload</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {nonBillOutbox.map((row) => {
                            const Icon = outboxEntityIcon(row.entity_type);
                            return (
                            <div key={row.client_id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Icon size={16} className={
                                        row.entity_type === "customer" ? "text-blue-500"
                                            : row.entity_type === "stock_adjustment" ? "text-emerald-600"
                                                : row.entity_type === "shop_expense" ? "text-amber-600"
                                                    : "text-gray-400"
                                    } />
                                    <div>
                                        <p className="text-sm font-medium">{outboxEntityTitle(row.entity_type)}</p>
                                        <p className="text-xs text-gray-500">{outboxEntityLabel(row)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={
                                        row.status === OUTBOX_STATUS.SYNCED ? "synced"
                                            : row.status === OUTBOX_STATUS.ERROR ? "error"
                                                : row.status === OUTBOX_STATUS.CONFLICT ? "conflict"
                                                    : "pending"
                                    } />
                                    {(row.status === OUTBOX_STATUS.ERROR || row.status === OUTBOX_STATUS.CONFLICT) && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenOutboxIssue(row)}
                                                className="text-xs text-orange-800 font-medium hover:underline"
                                            >
                                                Fix
                                            </button>
                                            {isOnline && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRetryOne(row.client_id)}
                                                    className="text-xs text-orange-700 hover:underline"
                                                >
                                                    Retry
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedRow && (
                <BillDetailModal
                    row={selectedRow}
                    onPrint={printBill}
                    onDownloadPdf={downloadPdf}
                    onShowUpiQr={setUpiQrBill}
                    isPrinting={isPrinting}
                    isPdfLoading={isPdfLoading}
                    onClose={() => setSelectedRow(null)}
                />
            )}

            <UpiQrDisplayModal
                open={Boolean(upiQrBill)}
                bill={upiQrBill}
                onClose={() => setUpiQrBill(null)}
            />

            {issueTarget && (
                <SyncIssueModal
                    key={issueTarget.outbox?.client_id || issueTarget.bill?.client_bill_id}
                    issue={issueTarget}
                    shopId={shopId}
                    user={user}
                    isOnline={isOnline}
                    onClose={() => setIssueTarget(null)}
                    onResolved={refresh}
                />
            )}
        </div>
    );
}
