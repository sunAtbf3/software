// TABS/SALES/ShopReportTab/ShopReportTab.jsx
//
// Shop Reports — Overview (sales + purchase + transfers), Daily Summary, GST HSN

import React, { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
    Calendar,
    Download,
    TrendingUp,
    Wallet,
    FileText,
    IndianRupee,
    Receipt,
    Building2,
    Loader2,
    RefreshCw,
    Package,
    Truck,
    ArrowDownToLine,
    LayoutDashboard,
} from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import DateRangePresetBar from "../../../shared/DateRangePresetBar";
import {
    useGetDailySummaryQuery,
    useGetGSTReportQuery,
    useGetShopOverviewQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
import {
    useGetTransferBillsQuery,
    useGetTransferBillSummaryQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferBill_api/transferBillApi";
import { useGetTransferHistoryQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Transfer_api/transferApi";
import { getBillTypeLabel } from "../../../../constants/billingBillTypes";
import {
    resolveDateRangePreset,
    isValidDateRange,
    formatDateRangeLabel,
    todayIsoLocal,
} from "../../../../utils/dateRangePresets";

const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount || 0);

const formatDate = (date) => {
    if (!date) return "";
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const fmtShortDate = (iso) => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "—";
    }
};

const defaultRange = resolveDateRangePreset("today");

function StatCard({ label, value, hint, icon: Icon, tone = "slate" }) {
    const tones = {
        slate: "border-slate-200 bg-white text-slate-800",
        emerald: "border-emerald-100 bg-emerald-50/40 text-emerald-800",
        sky: "border-sky-100 bg-sky-50/50 text-sky-800",
        amber: "border-amber-100 bg-amber-50/50 text-amber-900",
        teal: "border-teal-100 bg-teal-50/40 text-teal-900",
    };
    const iconTone = {
        slate: "text-slate-400",
        emerald: "text-emerald-500",
        sky: "text-sky-500",
        amber: "text-amber-500",
        teal: "text-teal-600",
    };
    return (
        <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
                {Icon ? <Icon size={18} className={iconTone[tone] || iconTone.slate} /> : null}
            </div>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums leading-tight">{value}</p>
            {hint ? <p className="text-[11px] mt-1 opacity-60">{hint}</p> : null}
        </div>
    );
}

export default function ShopReportTab() {
    const { user } = useSelector((state) => state.auth);
    const userRole = user?.role || "";
    const isSuperAdmin = userRole === "SUPER_ADMIN";
    const isShopOwner = userRole === "SHOP_OWNER";
    const shopId = user?.shop_id || user?.shop?.shop_id || "";

    const [reportType, setReportType] = useState("overview"); // overview | daily | gst
    const [datePreset, setDatePreset] = useState("today");
    const [fromDate, setFromDate] = useState(defaultRange.from);
    const [toDate, setToDate] = useState(defaultRange.to);
    const [dailyDate, setDailyDate] = useState(todayIsoLocal());
    const [gstFrom, setGstFrom] = useState(todayIsoLocal());
    const [gstTo, setGstTo] = useState(todayIsoLocal());

    const rangeOk = isValidDateRange(fromDate, toDate);
    const canQueryShop = isShopOwner || Boolean(shopId);
    const overviewReady = reportType === "overview" && rangeOk && canQueryShop && Boolean(fromDate) && Boolean(toDate);

    const {
        data: overviewData,
        isLoading: overviewLoading,
        isError: overviewError,
        error: overviewErr,
        refetch: refetchOverview,
    } = useGetShopOverviewQuery(
        { shop_id: shopId || undefined, from_date: fromDate, to_date: toDate },
        { skip: !overviewReady }
    );

    const {
        data: purchaseData,
        isLoading: purchaseLoading,
        isError: purchaseError,
        refetch: refetchPurchase,
    } = useGetTransferBillsQuery(
        { page: 1, limit: 50, from_date: fromDate, to_date: toDate },
        { skip: !overviewReady }
    );

    const { data: purchaseSummary = [], refetch: refetchPurchaseSummary } = useGetTransferBillSummaryQuery(
        { from_date: fromDate, to_date: toDate },
        { skip: !overviewReady }
    );

    const {
        data: transferHistoryData,
        isLoading: transferLoading,
        refetch: refetchTransfers,
    } = useGetTransferHistoryQuery(
        { page: 1, limit: 8, from_date: fromDate, to_date: toDate },
        { skip: !overviewReady }
    );

    const {
        data: dailyData,
        isLoading: dailyLoading,
        isError: dailyError,
        refetch: refetchDaily,
    } = useGetDailySummaryQuery(
        { shop_id: shopId, date: dailyDate },
        { skip: !shopId || reportType !== "daily" }
    );

    const {
        data: gstData,
        isLoading: gstLoading,
        isError: gstError,
        refetch: refetchGST,
    } = useGetGSTReportQuery(
        { shop_id: shopId, from_date: gstFrom, to_date: gstTo },
        { skip: !shopId || reportType !== "gst" }
    );

    const purchaseBills = purchaseData?.bills || [];
    const purchaseMeta = purchaseData?.meta || { total: 0 };
    const purchaseAmount = useMemo(
        () =>
            purchaseBills.reduce(
                (sum, b) => sum + Number(b.franchise_bill_totals?.final_amount || 0),
                0
            ),
        [purchaseBills]
    );
    const purchaseQty = useMemo(
        () => purchaseBills.reduce((sum, b) => sum + (Number(b.total_quantity) || 0), 0),
        [purchaseBills]
    );
    const transfers = transferHistoryData?.transfers || [];
    const transferTotal = transferHistoryData?.meta?.total ?? transfers.length;

    const sales = overviewData?.sales || {};
    const paymentEntries = Object.entries(sales.payment_methods || {});

    const handlePresetChange = useCallback((presetId) => {
        setDatePreset(presetId);
        if (presetId === "all") {
            // Overview needs a bounded range — fall back to last 90 days for "all"
            const range = resolveDateRangePreset("last_90_days");
            setFromDate(range.from);
            setToDate(range.to);
            setDatePreset("last_90_days");
            toast.info("Overview uses up to last 90 days. Use Sale/Purchase History for all-time lists.");
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
    };

    const handleRefresh = () => {
        if (reportType === "overview") {
            refetchOverview();
            refetchPurchase();
            refetchPurchaseSummary();
            refetchTransfers();
        } else if (reportType === "daily") {
            refetchDaily();
        } else {
            refetchGST();
        }
        toast.success("Report refreshed");
    };

    const handleDownloadOverview = () => {
        if (!overviewData) {
            toast.error("Nothing to export yet");
            return;
        }
        const rows = [
            ["Shop", overviewData.shop_name || ""],
            ["Shop Code", overviewData.shop_code || ""],
            ["From", overviewData.from_date || ""],
            ["To", overviewData.to_date || ""],
            [],
            ["Sales Bill Count", sales.bill_count || 0],
            ["Sales Amount", sales.total_amount || 0],
            ["Sales GST", sales.total_gst || 0],
            ["Collected", sales.total_collected || 0],
            ["Outstanding Balance", sales.total_balance || 0],
            [],
            ["Purchase Bills", purchaseMeta.total || 0],
            ["Purchase Amount (page)", purchaseAmount],
            ["Purchase Qty (page)", purchaseQty],
            ["Transfers", transferTotal],
            [],
            ["Payment Method", "Count", "Amount"],
            ...paymentEntries.map(([method, row]) => [
                method,
                row?.count ?? "",
                row?.amount ?? row ?? "",
            ]),
        ];
        const csv = rows.map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `shop-overview-${fromDate}-to-${toDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded");
    };

    const handleDownload = () => {
        if (reportType === "overview") {
            handleDownloadOverview();
            return;
        }
        if (reportType === "daily") {
            const data = dailyData;
            const csvContent = [
                ["Shop ID", data?.shop_id || ""],
                ["Date", data?.date || ""],
                ["Bill Count", data?.bill_count || 0],
                ["Total Amount", data?.total_amount || 0],
                ["Total GST", data?.total_gst || 0],
                ["Total Collected", data?.total_collected || 0],
                ["", ""],
                ["Payment Methods", ""],
                ...Object.entries(data?.payment_methods || {}).map(([key, value]) => [key, value]),
                ["", ""],
                ["GST Breakdown", ""],
                ["CGST", data?.gst?.cgst || 0],
                ["SGST", data?.gst?.sgst || 0],
                ["IGST", data?.gst?.igst || 0],
            ];
            const csv = csvContent.map((row) => row.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `daily-summary-${dailyDate}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("CSV downloaded");
            return;
        }
        const data = gstData;
        const csvRows = [
            ["Shop ID", data?.shop_id || ""],
            ["Shop Name", data?.shop_name || ""],
            ["From Date", data?.from_date || ""],
            ["To Date", data?.to_date || ""],
            [],
            ["HSN", "GST %", "Taxable", "Tax", "CGST", "SGST", "IGST"],
            ...(data?.hsn_summary || []).map((row) => [
                row.hsn_code,
                row.gst_percent,
                row.taxable_value,
                row.tax_amount,
                row.cgst,
                row.sgst,
                row.igst,
            ]),
        ];
        const csv = csvRows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gst-report-${gstFrom}-${gstTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded");
    };

    const isLoading =
        reportType === "overview"
            ? overviewLoading || purchaseLoading || transferLoading
            : reportType === "daily"
              ? dailyLoading
              : gstLoading;

    const overviewErrMsg =
        overviewErr?.data?.message || overviewErr?.error || "Failed to load shop overview";

    return (
        <div className="space-y-5 p-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Shop Reports</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        One place for your shop&apos;s sales, warehouse purchases, and transfers
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50"
                    >
                        <Download size={13} /> Export CSV
                    </button>
                </div>
            </div>

            {isSuperAdmin && !shopId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Super Admin: assign / open a shop context to view shop reports, or use Sale History with a shop selected.
                </div>
            )}

            {!isSuperAdmin && !isShopOwner && !shopId && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Your account is not assigned to a shop.
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-1 flex flex-wrap gap-1 w-fit">
                {[
                    { id: "overview", label: "Shop Overview", icon: LayoutDashboard },
                    { id: "daily", label: "Daily Summary", icon: Calendar },
                    { id: "gst", label: "GST (HSN)", icon: FileText },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const active = reportType === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setReportType(tab.id)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                                active ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {reportType === "overview" && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <DateRangePresetBar
                        activePreset={datePreset}
                        fromDate={fromDate}
                        toDate={toDate}
                        onPresetChange={handlePresetChange}
                        onCustomDateChange={handleCustomDateChange}
                        onFromChange={(v) => {
                            setDatePreset("custom");
                            setFromDate(v);
                        }}
                        onToDateChange={(v) => {
                            setDatePreset("custom");
                            setToDate(v || fromDate);
                        }}
                        rangeError={rangeOk ? "" : "From date must be on or before To date"}
                        showAllOption={false}
                    />
                    <p className="text-[11px] text-slate-400">
                        Showing {formatDateRangeLabel(fromDate, toDate)}
                        {overviewData?.shop_name ? ` · ${overviewData.shop_name}` : ""}
                    </p>
                </div>
            )}

            {reportType === "daily" && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                    <label className="text-sm font-medium text-slate-600">Select Date</label>
                    <input
                        type="date"
                        value={dailyDate}
                        onChange={(e) => setDailyDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                </div>
            )}

            {reportType === "gst" && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
                    <label className="text-sm font-medium text-slate-600">From</label>
                    <input
                        type="date"
                        value={gstFrom}
                        onChange={(e) => setGstFrom(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                    <label className="text-sm font-medium text-slate-600">To</label>
                    <input
                        type="date"
                        value={gstTo}
                        onChange={(e) => setGstTo(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                </div>
            )}

            {isLoading && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Loader2 size={36} className="animate-spin text-teal-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Building your report…</p>
                </div>
            )}

            {/* Overview */}
            {!isLoading && reportType === "overview" && overviewError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <p className="text-red-600 text-sm">{overviewErrMsg}</p>
                    <button type="button" onClick={handleRefresh} className="mt-3 text-sm text-red-700 underline">
                        Try again
                    </button>
                </div>
            )}

            {!isLoading && reportType === "overview" && overviewData && (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/40 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                                    Shop snapshot
                                </p>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {overviewData.shop_name || "Your shop"}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {formatDateRangeLabel(overviewData.from_date, overviewData.to_date)}
                                    {overviewData.shop_type ? ` · ${overviewData.shop_type}` : ""}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                            <StatCard
                                label="Sale Bills"
                                value={sales.bill_count || 0}
                                hint="invoices in period"
                                icon={Receipt}
                                tone="sky"
                            />
                            <StatCard
                                label="Sales"
                                value={formatCurrency(sales.total_amount)}
                                hint="bill totals"
                                icon={IndianRupee}
                                tone="emerald"
                            />
                            <StatCard
                                label="Collected"
                                value={formatCurrency(sales.total_collected)}
                                hint="payments received"
                                icon={Wallet}
                                tone="teal"
                            />
                            <StatCard
                                label="Purchase Bills"
                                value={purchaseMeta.total || 0}
                                hint="warehouse inward"
                                icon={Package}
                                tone="amber"
                            />
                            <StatCard
                                label="Purchase Value"
                                value={formatCurrency(purchaseAmount)}
                                hint={
                                    purchaseMeta.total > purchaseBills.length
                                        ? `first ${purchaseBills.length} of ${purchaseMeta.total}`
                                        : "inward amount"
                                }
                                icon={ArrowDownToLine}
                                tone="amber"
                            />
                            <StatCard
                                label="Transfers"
                                value={transferTotal}
                                hint="stock movements"
                                icon={Truck}
                                tone="slate"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <Wallet size={16} className="text-teal-600" />
                                <h3 className="text-sm font-semibold text-slate-800">Sales · payments</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                {paymentEntries.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-6">No sales payments in this period</p>
                                ) : (
                                    paymentEntries.map(([method, row]) => (
                                        <div
                                            key={method}
                                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{method}</p>
                                                <p className="text-[11px] text-slate-400">{row?.count ?? 0} bills</p>
                                            </div>
                                            <p className="text-sm font-bold tabular-nums text-slate-900">
                                                {formatCurrency(row?.amount ?? row)}
                                            </p>
                                        </div>
                                    ))
                                )}
                                <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                                    <span>GST in sales</span>
                                    <span className="font-semibold text-slate-800">
                                        {formatCurrency(sales.total_gst)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Outstanding balance</span>
                                    <span className="font-semibold text-amber-700">
                                        {formatCurrency(sales.total_balance)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <FileText size={16} className="text-sky-600" />
                                <h3 className="text-sm font-semibold text-slate-800">Sales · bill types</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                {(sales.by_bill_type || []).length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-6">No bills in this period</p>
                                ) : (
                                    (sales.by_bill_type || []).map((row) => (
                                        <div
                                            key={row.bill_type}
                                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">
                                                    {getBillTypeLabel(row.bill_type)}
                                                </p>
                                                <p className="text-[11px] text-slate-400">{row.count} bills</p>
                                            </div>
                                            <p className="text-sm font-bold tabular-nums text-slate-900">
                                                {formatCurrency(row.total_amount)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package size={16} className="text-amber-600" />
                                    <h3 className="text-sm font-semibold text-slate-800">Purchase · warehouse bills</h3>
                                </div>
                                {purchaseError ? (
                                    <span className="text-[11px] text-red-500">Could not load</span>
                                ) : null}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white border-b border-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[11px] text-slate-500">Bill</th>
                                            <th className="px-3 py-2 text-left text-[11px] text-slate-500">Date</th>
                                            <th className="px-3 py-2 text-left text-[11px] text-slate-500">From</th>
                                            <th className="px-3 py-2 text-right text-[11px] text-slate-500">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {purchaseBills.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-sm">
                                                    No warehouse purchase bills in this period
                                                </td>
                                            </tr>
                                        ) : (
                                            purchaseBills.slice(0, 8).map((bill) => (
                                                <tr key={`${bill.source}-${bill.id}`}>
                                                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                                                        {bill.transfer_bill_number || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-slate-600">
                                                        {fmtShortDate(bill.transfer_bill_generated_at)}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-slate-600 truncate max-w-[8rem]">
                                                        {bill.from_warehouse?.warehouse_name || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                                                        {formatCurrency(bill.franchise_bill_totals?.final_amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {purchaseSummary.length > 0 && (
                                <div className="px-4 py-3 border-t border-slate-100 bg-amber-50/40 text-xs text-amber-900">
                                    Across warehouses:{" "}
                                    {purchaseSummary
                                        .map(
                                            (w) =>
                                                `${w.warehouse_name || "WH"} (${w.total_bills} · ${formatCurrency(w.total_amount)})`
                                        )
                                        .join(" · ")}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                <Truck size={16} className="text-slate-600" />
                                <h3 className="text-sm font-semibold text-slate-800">Transfers · recent</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white border-b border-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[11px] text-slate-500">Ref</th>
                                            <th className="px-3 py-2 text-left text-[11px] text-slate-500">Type</th>
                                            <th className="px-3 py-2 text-left text-[11px] text-slate-500">Status</th>
                                            <th className="px-3 py-2 text-left text-[11px] text-slate-500">When</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {transfers.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-3 py-8 text-center text-slate-400 text-sm">
                                                    No transfers in this period
                                                </td>
                                            </tr>
                                        ) : (
                                            transfers.map((t) => (
                                                <tr key={`${t.source || "t"}-${t.id || t.request_id || t.bulk_request_id}-${t.activity_at}`}>
                                                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                                                        {t.reference_number ||
                                                            t.bulk_request_number ||
                                                            t.request_number ||
                                                            "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-slate-600">
                                                        {t.request_type || t.type || "—"}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs">
                                                        <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                                            {t.status || "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-slate-500">
                                                        {fmtShortDate(t.activity_at || t.updated_at)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <p className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">
                                {transferTotal} transfer(s) in period · full lists in Purchase History / Transfers
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily (existing) */}
            {!isLoading && reportType === "daily" && dailyError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <p className="text-red-600">Failed to load daily summary</p>
                    <button type="button" onClick={handleRefresh} className="mt-3 text-sm text-red-700 underline">
                        Try Again
                    </button>
                </div>
            )}

            {!isLoading && reportType === "daily" && dailyData && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Bill Count" value={dailyData.bill_count || 0} hint="total bills" icon={Receipt} tone="sky" />
                        <StatCard
                            label="Total Amount"
                            value={formatCurrency(dailyData.total_amount)}
                            hint="net sales"
                            icon={IndianRupee}
                            tone="emerald"
                        />
                        <StatCard
                            label="Total GST"
                            value={formatCurrency(dailyData.total_gst)}
                            hint="tax collected"
                            icon={TrendingUp}
                            tone="teal"
                        />
                        <StatCard
                            label="Total Collected"
                            value={formatCurrency(dailyData.total_collected)}
                            hint="after adjustments"
                            icon={Wallet}
                            tone="amber"
                        />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">Payment Methods</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(dailyData.payment_methods || {}).map(([method, amount]) => (
                                <div key={method} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium text-slate-600">{method}</span>
                                    <span className="text-lg font-bold text-slate-800">{formatCurrency(amount)}</span>
                                </div>
                            ))}
                            {Object.keys(dailyData.payment_methods || {}).length === 0 && (
                                <p className="text-slate-400 text-sm col-span-2 text-center py-4">No payment data available</p>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">GST Breakdown</h3>
                        </div>
                        <div className="p-4 grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-sky-50 rounded-lg">
                                <p className="text-xs text-sky-600">CGST</p>
                                <p className="text-xl font-bold text-sky-800">{formatCurrency(dailyData.gst?.cgst)}</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                <p className="text-xs text-emerald-600">SGST</p>
                                <p className="text-xl font-bold text-emerald-800">{formatCurrency(dailyData.gst?.sgst)}</p>
                            </div>
                            <div className="text-center p-3 bg-teal-50 rounded-lg">
                                <p className="text-xs text-teal-600">IGST</p>
                                <p className="text-xl font-bold text-teal-800">{formatCurrency(dailyData.gst?.igst)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GST */}
            {!isLoading && reportType === "gst" && gstError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <p className="text-red-600">Failed to load GST report</p>
                    <button type="button" onClick={handleRefresh} className="mt-3 text-sm text-red-700 underline">
                        Try Again
                    </button>
                </div>
            )}

            {!isLoading && reportType === "gst" && gstData && (
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                        <Building2 size={24} className="text-slate-400" />
                        <div>
                            <p className="text-sm font-semibold text-slate-800">{gstData.shop_name || "Shop"}</p>
                            <p className="text-xs text-slate-400">
                                Period: {gstData.from_date} to {gstData.to_date}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">HSN-wise GST Summary</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">HSN Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">GST %</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Taxable Value</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Tax Amount</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">CGST</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">SGST</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">IGST</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(gstData.hsn_summary || []).map((row, idx) => (
                                        <tr key={`${row.hsn_code}-${idx}`}>
                                            <td className="px-4 py-3 font-mono text-xs">{row.hsn_code || "—"}</td>
                                            <td className="px-4 py-3">{row.gst_percent}%</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.taxable_value)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.tax_amount)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.cgst)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.sgst)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.igst)}</td>
                                        </tr>
                                    ))}
                                    {(gstData.hsn_summary || []).length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                                                No HSN data for this period
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
