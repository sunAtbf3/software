import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Eye, Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import DateRangePresetBar from "../../../shared/DateRangePresetBar";
import {
    useGetTransferBillsQuery,
    useGetTransferBillSummaryQuery,
    useLazyDownloadTransferBillPdfQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferBill_api/transferBillApi";
import {
    openDetailModal,
    closeDetailModal,
    setSearch,
    setBillTypeFilter,
    setSourceFilter,
    setFromDate,
    setToDate,
    setCurrentPage,
    resetFilters,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/TransferBill_api/transferBillSlice";
import { getTransferBillTypeShortLabel, TRANSFER_BILL_TYPES } from "../../../../constants/transferBillTypes";
import {
    getTransferBillsPageSubtitle,
    getTransferBillsTabLabel,
    isShopTransferBillViewer,
} from "../../../../constants/transferBillTabLabels";
import { downloadBlobFile } from "../../../../utils/downloadBlob";
import {
    resolveDateRangePreset,
    isValidDateRange,
    formatDateRangeLabel,
    todayIsoLocal,
} from "../../../../utils/dateRangePresets";
import TransferBillDetailModal from "./TransferBillDetailModal";

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StockInwardBillsTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const {
        showDetailModal,
        selectedBill,
        search,
        billTypeFilter,
        sourceFilter,
        fromDate,
        toDate,
        currentPage,
        pageSize,
    } = useSelector((state) => state.transferBill);

    const shopView = isShopTransferBillViewer(user?.role);
    const pageTitle = getTransferBillsTabLabel(user?.role);
    const pageSubtitle = getTransferBillsPageSubtitle(user?.role);

    const [datePreset, setDatePreset] = useState(shopView ? "last_30_days" : "all");

    const didInitRange = useRef(false);
    useEffect(() => {
        if (didInitRange.current) return;
        didInitRange.current = true;
        if (shopView && !fromDate && !toDate) {
            const range = resolveDateRangePreset("last_30_days");
            setDatePreset("last_30_days");
            dispatch(setFromDate(range.from));
            dispatch(setToDate(range.to));
        }
    }, [shopView, fromDate, toDate, dispatch]);

    const rangeOk = isValidDateRange(fromDate, toDate);
    const rangeError = rangeOk ? "" : "From date must be on or before To date";

    const { data, isLoading, isFetching, isError, error, refetch } = useGetTransferBillsQuery(
        {
            page: currentPage,
            limit: pageSize,
            search,
            from_date: fromDate,
            to_date: toDate,
            transfer_bill_type: billTypeFilter,
            source: sourceFilter,
        },
        { skip: !rangeOk }
    );

    const { data: summary = [] } = useGetTransferBillSummaryQuery(
        {
            from_date: fromDate,
            to_date: toDate,
            transfer_bill_type: billTypeFilter,
        },
        { skip: !rangeOk }
    );

    const [downloadPdf, { isFetching: isDownloading }] = useLazyDownloadTransferBillPdfQuery();

    const bills = data?.bills || [];
    const meta = data?.meta || { total: 0, page: 1, limit: pageSize, totalPages: 1 };

    const totalAmount = useMemo(
        () => bills.reduce((sum, b) => sum + Number(b.franchise_bill_totals?.final_amount || 0), 0),
        [bills]
    );

    const handlePresetChange = (presetId) => {
        setDatePreset(presetId);
        if (presetId === "all") {
            dispatch(setFromDate(""));
            dispatch(setToDate(""));
            return;
        }
        if (presetId === "custom") {
            const day = todayIsoLocal();
            dispatch(setFromDate(day));
            dispatch(setToDate(day));
            return;
        }
        const range = resolveDateRangePreset(presetId);
        dispatch(setFromDate(range.from));
        dispatch(setToDate(range.to));
    };

    const handleCustomDateChange = (value) => {
        setDatePreset("custom");
        dispatch(setFromDate(value));
        dispatch(setToDate(value));
    };

    const handleDownload = async (bill) => {
        try {
            const blob = await downloadPdf({ source: bill.source, id: bill.id }).unwrap();
            downloadBlobFile(blob, `${bill.transfer_bill_number || bill.id}.pdf`);
            toast.success("PDF downloaded");
        } catch (err) {
            toast.error(err?.data?.message || err?.message || "PDF download failed");
        }
    };

    const handleClear = () => {
        dispatch(resetFilters());
        if (shopView) {
            const range = resolveDateRangePreset("last_30_days");
            setDatePreset("last_30_days");
            queueMicrotask(() => {
                dispatch(setFromDate(range.from));
                dispatch(setToDate(range.to));
            });
        } else {
            setDatePreset("all");
        }
    };

    const listErrorMsg = error?.data?.message || error?.error || "Failed to load purchase history";

    return (
        <div className="space-y-4 p-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{pageTitle}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{pageSubtitle}</p>
                </div>
                <button
                    type="button"
                    onClick={() => rangeOk && refetch()}
                    disabled={!rangeOk || isFetching}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Total Bills</p>
                    <p className="text-3xl font-bold text-gray-800">{rangeOk ? meta.total : "—"}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">Page Value</p>
                    <p className="text-2xl font-bold text-gray-800">{fmtMoney(totalAmount)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase tracking-wide font-medium text-gray-500">
                        {shopView ? "Warehouses" : "Shops"}
                    </p>
                    <p className="text-3xl font-bold text-gray-800">{summary.length}</p>
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
                    onFromChange={(v) => {
                        setDatePreset("custom");
                        dispatch(setFromDate(v));
                    }}
                    onToDateChange={(v) => {
                        setDatePreset("custom");
                        dispatch(setToDate(v || fromDate));
                    }}
                    rangeError={rangeError}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search bill no, request no, shop or warehouse..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleClear}
                        className="inline-flex items-center justify-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-lg"
                    >
                        <X size={14} /> Clear
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                        value={billTypeFilter}
                        onChange={(e) => dispatch(setBillTypeFilter(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">All Bill Types</option>
                        <option value={TRANSFER_BILL_TYPES.GST}>GST Invoice</option>
                        <option value={TRANSFER_BILL_TYPES.NON_GST}>Non-GST Invoice</option>
                        <option value={TRANSFER_BILL_TYPES.RECEIPT}>Receipt</option>
                    </select>
                    <select
                        value={sourceFilter}
                        onChange={(e) => dispatch(setSourceFilter(e.target.value))}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">Bulk + Single</option>
                        <option value="bulk">Bulk Only</option>
                        <option value="single">Single Only</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bill No</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Source</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                                    {shopView ? "From Warehouse" : "To Shop"}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Qty</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {!rangeOk ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-red-500 text-sm">
                                        {rangeError}
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                        Loading bills...
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <p className="text-sm text-red-600 mb-2">{listErrorMsg}</p>
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
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                        <FileText className="mx-auto mb-2 opacity-40" size={28} />
                                        No transfer bills found for selected filters
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={`${bill.source}-${bill.id}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {bill.transfer_bill_number}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {fmtDate(bill.transfer_bill_generated_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {getTransferBillTypeShortLabel(bill.transfer_bill_type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 capitalize">{bill.source}</td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {shopView
                                                ? bill.from_warehouse?.warehouse_name || "—"
                                                : bill.to_shop?.shop_name || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">{bill.total_quantity}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                            {fmtMoney(bill.franchise_bill_totals?.final_amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => dispatch(openDetailModal(bill))}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="View details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(bill)}
                                                    disabled={isDownloading}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
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

                {rangeOk && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                        <p className="text-gray-500">
                            Page {meta.page} of {meta.totalPages} · {meta.total} bills
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={currentPage <= 1 || isFetching}
                                onClick={() => dispatch(setCurrentPage(currentPage - 1))}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={currentPage >= meta.totalPages || isFetching}
                                onClick={() => dispatch(setCurrentPage(currentPage + 1))}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showDetailModal && selectedBill && (
                <TransferBillDetailModal bill={selectedBill} onClose={() => dispatch(closeDetailModal())} />
            )}
        </div>
    );
}
