// TABS/SALES/SaleHistoryTab/SaleHistoryTab.jsx
//
// Shop-scoped sale (billing) history — table + date presets.
// Backend applyBillListScope enforces shop isolation for SHOP_OWNER / staff.

import React, { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
    RefreshCw,
    Eye,
    Download,
    Receipt,
    X,
    Search,
    Loader2,
} from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import DateRangePresetBar from "../../../shared/DateRangePresetBar";
import {
    useGetBillsQuery,
    useGetBillByIdQuery,
    useLazyGetBillPdfQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
import { useGetShopsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { useBillDocumentActions } from "../../../../offline/hooks/useBillDocumentActions";
import { downloadBlobFile } from "../../../../utils/downloadBlob";
import { getBillTypeLabel } from "../../../../constants/billingBillTypes";
import {
    resolveDateRangePreset,
    isValidDateRange,
    formatDateRangeLabel,
    todayIsoLocal,
} from "../../../../utils/dateRangePresets";

const PAYMENT_BADGE = {
    PAID: "bg-green-50 text-green-700 border border-green-200",
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    PARTIALLY_PAID: "bg-orange-50 text-orange-700 border border-orange-200",
    REFUNDED: "bg-purple-50 text-purple-700 border border-purple-200",
    CANCELLED: "bg-red-50 text-red-600 border border-red-200",
};

const fmtMoney = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDateTime = (iso) => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
};

const defaultRange = resolveDateRangePreset("last_30_days");

function SaleHistoryDetailModal({ billId, onClose, onPrint, onDownloadPdf, isPrinting, isPdfLoading }) {
    const { data: bill, isLoading, isError, error, refetch } = useGetBillByIdQuery(billId, {
        skip: !billId,
    });

    const errMsg =
        error?.data?.message || error?.error || "Failed to load bill details";

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-start z-10">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Bill Details</h3>
                            <p className="text-xs text-gray-400 font-mono">
                                {bill?.bill_number || billId}
                            </p>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {isLoading && (
                            <div className="py-12 text-center text-gray-400">
                                <Loader2 className="animate-spin mx-auto mb-2" size={28} />
                                Loading bill…
                            </div>
                        )}
                        {isError && (
                            <div className="py-8 text-center">
                                <p className="text-sm text-red-600 mb-3">{errMsg}</p>
                                <button
                                    type="button"
                                    onClick={() => refetch()}
                                    className="text-sm text-blue-600 underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                        {!isLoading && !isError && bill && (
                            <>
                                <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-500">Date</p>
                                        <p className="font-medium">{fmtDateTime(bill.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Type</p>
                                        <p className="font-medium">{getBillTypeLabel(bill.bill_type)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Customer</p>
                                        <p className="font-medium">
                                            {bill.customer_name || bill.customer?.name || "Walk-in"}
                                        </p>
                                        {(bill.customer_mobile || bill.customer?.mobile) && (
                                            <p className="text-xs text-gray-500">
                                                {bill.customer_mobile || bill.customer?.mobile}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Payment</p>
                                        <span
                                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                PAYMENT_BADGE[bill.payment_status] || PAYMENT_BADGE.PENDING
                                            }`}
                                        >
                                            {bill.payment_status || "PENDING"}
                                        </span>
                                        {bill.is_cancelled && (
                                            <span className="ml-1 text-xs text-red-600">Cancelled</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Total</p>
                                        <p className="font-semibold text-gray-900">{fmtMoney(bill.total_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Paid / Balance</p>
                                        <p className="font-medium">
                                            {fmtMoney(bill.paid_amount)} / {fmtMoney(bill.balance_amount)}
                                        </p>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-gray-500">Item</th>
                                                <th className="px-3 py-2 text-right text-gray-500">Qty</th>
                                                <th className="px-3 py-2 text-right text-gray-500">Rate</th>
                                                <th className="px-3 py-2 text-right text-gray-500">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(bill.items || []).map((item, idx) => (
                                                <tr key={item.bill_item_id || idx}>
                                                    <td className="px-3 py-2 text-gray-800">
                                                        {item.manual_item_name ||
                                                            item.variant?.product?.name ||
                                                            item.product_name ||
                                                            "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums">
                                                        {fmtMoney(item.unit_price)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                                                        {fmtMoney(item.line_total ?? item.unit_price * item.quantity)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(bill.items || []).length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                                                        No line items
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-wrap justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        disabled={isPrinting}
                                        onClick={() => onPrint?.(bill)}
                                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        {isPrinting ? "Printing…" : "Print"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPdfLoading}
                                        onClick={() => onDownloadPdf?.(bill)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Download size={14} />
                                        {isPdfLoading ? "…" : "PDF"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SaleHistoryTab() {
    const { user } = useSelector((state) => state.auth);
    const userRole = user?.role || "";
    const isSuperAdmin = userRole === "SUPER_ADMIN";
    const isShopOwner = userRole === "SHOP_OWNER";
    const userShopId = user?.shop_id || user?.shop?.shop_id || "";

    const [fromDate, setFromDate] = useState(defaultRange.from);
    const [toDate, setToDate] = useState(defaultRange.to);
    const [datePreset, setDatePreset] = useState("last_30_days");
    const [paymentStatus, setPaymentStatus] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [appliedBillNumber, setAppliedBillNumber] = useState("");
    const [appliedMobile, setAppliedMobile] = useState("");
    const [cancelledFilter, setCancelledFilter] = useState(""); // "" | "false" | "true"
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [adminShopId, setAdminShopId] = useState("");
    const [viewBillId, setViewBillId] = useState(null);

    const rangeOk = isValidDateRange(fromDate, toDate);
    const rangeError = rangeOk ? "" : "From date must be on or before To date";

    // Shop staff: backend scopes by owned/assigned shop. Super admin must pick a shop.
    // Shop owners may omit shop_id — applyBillListScope resolves owned shop.
    const effectiveShopId = isSuperAdmin ? adminShopId : userShopId;
    const canQuery =
        rangeOk &&
        (isSuperAdmin ? Boolean(adminShopId) : isShopOwner || Boolean(userShopId));

    const { data: shopsData } = useGetShopsQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }
    );
    const shops = shopsData?.shops || [];

    const queryArgs = useMemo(
        () => ({
            page,
            limit: pageSize,
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
            payment_status: paymentStatus || undefined,
            shop_id: effectiveShopId || undefined,
            bill_number: appliedBillNumber || undefined,
            customer_mobile: appliedMobile || undefined,
            is_cancelled: cancelledFilter === "" ? undefined : cancelledFilter,
        }),
        [
            page,
            pageSize,
            fromDate,
            toDate,
            paymentStatus,
            effectiveShopId,
            appliedBillNumber,
            appliedMobile,
            cancelledFilter,
        ]
    );

    const { data, isLoading, isFetching, isError, error, refetch } = useGetBillsQuery(queryArgs, {
        skip: !canQuery,
    });

    const bills = data?.bills || [];
    const meta = data?.meta || { total: 0, page: 1, limit: pageSize, totalPages: 1 };

    const pageTotals = useMemo(() => {
        let total = 0;
        let paid = 0;
        let balance = 0;
        for (const b of bills) {
            if (b.is_cancelled) continue;
            total += Number(b.total_amount) || 0;
            paid += Number(b.paid_amount) || 0;
            balance += Number(b.balance_amount) || 0;
        }
        return { total, paid, balance };
    }, [bills]);

    const [triggerPdf] = useLazyGetBillPdfQuery();
    const { printBill, downloadPdf, isPrinting, isPdfLoading } = useBillDocumentActions({
        isOnline: true,
        triggerServerPdf: async (bill, printFormat) => {
            const blob = await triggerPdf({
                billId: bill.bill_id,
                printFormat: printFormat || "A4",
            }).unwrap();
            return blob;
        },
    });

    const handlePresetChange = useCallback((presetId) => {
        setDatePreset(presetId);
        setPage(1);
        if (presetId === "all") {
            setFromDate("");
            setToDate("");
            return;
        }
        if (presetId === "custom") {
            const day = todayIsoLocal();
            setFromDate(day);
            setToDate(day);
            return;
        }
        const range = resolveDateRangePreset(presetId);
        setFromDate(range.from);
        setToDate(range.to);
    }, []);

    const handleCustomDateChange = (value) => {
        setDatePreset("custom");
        setFromDate(value);
        setToDate(value);
        setPage(1);
    };

    const handleFromChange = (value) => {
        setDatePreset("custom");
        setFromDate(value);
        setPage(1);
    };

    const handleToChange = (value) => {
        setDatePreset("custom");
        setToDate(value || fromDate);
        setPage(1);
    };

    const handleSearch = () => {
        const raw = searchInput.trim();
        // Digits-only (allow spaces / + / -) → phone search; otherwise bill number
        const digitsOnly = raw.replace(/[\s+\-()]/g, "");
        const looksLikePhone = digitsOnly.length >= 7 && digitsOnly.length <= 15 && /^\d+$/.test(digitsOnly);

        if (!raw) {
            setAppliedBillNumber("");
            setAppliedMobile("");
        } else if (looksLikePhone) {
            setAppliedMobile(digitsOnly);
            setAppliedBillNumber("");
        } else {
            setAppliedBillNumber(raw);
            setAppliedMobile("");
        }
        setPage(1);
    };

    const handleClear = () => {
        const range = resolveDateRangePreset("last_30_days");
        setDatePreset("last_30_days");
        setFromDate(range.from);
        setToDate(range.to);
        setPaymentStatus("");
        setSearchInput("");
        setAppliedBillNumber("");
        setAppliedMobile("");
        setCancelledFilter("");
        setPage(1);
        setPageSize(20);
    };

    const handleDownloadRowPdf = async (bill) => {
        try {
            const blob = await triggerPdf({ billId: bill.bill_id, printFormat: "A4" }).unwrap();
            downloadBlobFile(blob, `${bill.bill_number || bill.bill_id}.pdf`);
        } catch (err) {
            toast.error(err?.data?.message || err?.message || "PDF download failed");
        }
    };

    const listErrorMsg =
        error?.data?.message || error?.error || "Failed to load sale history";

    return (
        <div className="space-y-4 p-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Sale History</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Bills for your shop only — filter by date, payment status, or bill number
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => canQuery && refetch()}
                    disabled={!canQuery || isFetching}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {isSuperAdmin && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-amber-800">Shop</label>
                    <select
                        value={adminShopId}
                        onChange={(e) => {
                            setAdminShopId(e.target.value);
                            setPage(1);
                        }}
                        className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm min-w-[12rem]"
                    >
                        <option value="">Select shop…</option>
                        {shops.map((s) => (
                            <option key={s.shop_id} value={s.shop_id}>
                                {s.shop_name} ({s.shop_code})
                            </option>
                        ))}
                    </select>
                    {!adminShopId && (
                        <p className="text-xs text-amber-700">Select a shop to view its sale history</p>
                    )}
                </div>
            )}

            {!isSuperAdmin && !isShopOwner && !userShopId && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
                    Your account is not assigned to a shop. Sale history cannot be loaded.
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Bills</p>
                    <p className="text-3xl font-bold text-gray-800">{canQuery ? meta.total : "—"}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Page Sales</p>
                    <p className="text-xl font-bold text-gray-800">{fmtMoney(pageTotals.total)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Page Paid</p>
                    <p className="text-xl font-bold text-emerald-700">{fmtMoney(pageTotals.paid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Date Range</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                        {formatDateRangeLabel(fromDate, toDate)}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <DateRangePresetBar
                    activePreset={datePreset}
                    fromDate={fromDate}
                    toDate={toDate}
                    onPresetChange={handlePresetChange}
                    onCustomDateChange={handleCustomDateChange}
                    onFromChange={handleFromChange}
                    onToDateChange={handleToChange}
                    rangeError={rangeError}
                    disabled={!effectiveShopId && isSuperAdmin}
                />

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 flex gap-2">
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="Bill number or phone…"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                        />
                        <button
                            type="button"
                            onClick={handleSearch}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg"
                        >
                            <Search size={14} /> Search
                        </button>
                    </div>
                    <select
                        value={paymentStatus}
                        onChange={(e) => {
                            setPaymentStatus(e.target.value);
                            setPage(1);
                        }}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">All payments</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="PARTIALLY_PAID">Partially paid</option>
                        <option value="REFUNDED">Refunded</option>
                        <option value="CANCELLED">Cancelled status</option>
                    </select>
                    <select
                        value={cancelledFilter}
                        onChange={(e) => {
                            setCancelledFilter(e.target.value);
                            setPage(1);
                        }}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Active + cancelled</option>
                        <option value="false">Hide cancelled</option>
                        <option value="true">Cancelled only</option>
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value) || 20);
                            setPage(1);
                        }}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                    </select>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="inline-flex items-center justify-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg"
                    >
                        <X size={14} /> Reset
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[880px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bill No</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Payment</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Paid</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Balance</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {!canQuery ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                        {rangeError || "Select filters to load sale history"}
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                        <Loader2 className="animate-spin inline mr-2" size={18} />
                                        Loading sale history…
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <p className="text-red-600 text-sm mb-2">{listErrorMsg}</p>
                                        <button
                                            type="button"
                                            onClick={() => refetch()}
                                            className="text-sm text-blue-600 underline"
                                        >
                                            Try again
                                        </button>
                                    </td>
                                </tr>
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                        <Receipt className="mx-auto mb-2 opacity-40" size={28} />
                                        No bills found for selected filters
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr
                                        key={bill.bill_id}
                                        className={`hover:bg-gray-50 ${bill.is_cancelled ? "opacity-60" : ""}`}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-gray-800">
                                            {bill.bill_number}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                            {fmtDateTime(bill.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-gray-800">
                                                {bill.customer_name || bill.customer?.name || "Walk-in"}
                                            </p>
                                            {(bill.customer_mobile || bill.customer?.mobile) && (
                                                <p className="text-[11px] text-gray-400">
                                                    {bill.customer_mobile || bill.customer?.mobile}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            {getBillTypeLabel(bill.bill_type)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                    PAYMENT_BADGE[bill.payment_status] || PAYMENT_BADGE.PENDING
                                                }`}
                                            >
                                                {bill.payment_status || "PENDING"}
                                            </span>
                                            {bill.is_cancelled && (
                                                <span className="ml-1 text-[10px] text-red-600">Cancelled</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                                            {fmtMoney(bill.total_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                                            {fmtMoney(bill.paid_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                                            {fmtMoney(bill.balance_amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewBillId(bill.bill_id)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadRowPdf(bill)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                                    title="Download PDF"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {canQuery && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                        <p className="text-gray-500">
                            Page {meta.page} of {meta.totalPages} · {meta.total} bills
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={page <= 1 || isFetching}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={page >= meta.totalPages || isFetching}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {viewBillId && (
                <SaleHistoryDetailModal
                    billId={viewBillId}
                    onClose={() => setViewBillId(null)}
                    onPrint={printBill}
                    onDownloadPdf={downloadPdf}
                    isPrinting={isPrinting}
                    isPdfLoading={isPdfLoading}
                />
            )}
        </div>
    );
}
