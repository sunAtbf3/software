import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
    Search,
    RefreshCw,
    Plus,
    X,
    CheckCircle,
    XCircle,
    Truck,
    PackageCheck,
    Ban,
    Eye,
    FileText,
    Download,
} from "lucide-react";
import { toast } from "../../shared/ToastConfig";
import { getApiErrorMessage } from "../../../utils/apiErrorMessage";
import { downloadBlobFile } from "../../../utils/downloadBlob";
import { ROLES } from "../../roles";
import {
    useGetShopWarehouseReturnsQuery,
    useLazyPreviewReturnSourceQuery,
    useCreateShopWarehouseReturnMutation,
    useApproveShopWarehouseReturnMutation,
    useRejectShopWarehouseReturnMutation,
    useDispatchShopWarehouseReturnMutation,
    useReceiveShopWarehouseReturnMutation,
    useCancelShopWarehouseReturnMutation,
    useLazyGetShopWarehouseReturnBillQuery,
    useLazyDownloadShopWarehouseReturnBillPdfQuery,
    generateReturnIdempotencyKey,
} from "../../../REDUX_FEATURES/REDUX_SLICES/ShopWarehouseReturn_api/shopWarehouseReturnApi";

/** Same badge language as Bulk Transfer Requests. */
const STATUS_BADGE = {
    REQUESTED: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
    REJECTED: "bg-red-50 text-red-600 border border-red-200",
    DISPATCHED: "bg-purple-50 text-purple-700 border border-purple-200",
    COMPLETED: "bg-green-50 text-green-700 border border-green-200",
    CANCELLED: "bg-gray-100 text-gray-500 border border-gray-200",
};

const fmtMoney = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** Never allow typing above max remaining (e.g. received 5 → max 5). */
const clampReturnQty = (raw, maxAllowed) => {
    const max = Math.max(0, Math.floor(Number(maxAllowed) || 0));
    if (raw === "" || raw == null) return "";
    const digits = String(raw).replace(/[^\d]/g, "");
    if (digits === "") return "";
    let n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 0) return "";
    if (n > max) n = max;
    return String(n);
};

export default function ShopWarehouseReturnTab() {
    const user = useSelector((s) => s.auth?.user);
    const role = user?.role;
    const isShop = [ROLES.SHOP_OWNER, ROLES.SHOP_MANAGER].includes(role);
    const isWh = [ROLES.WH_MANAGER, ROLES.WH_STOCK_LISTER, ROLES.SUPER_ADMIN, ROLES.ORG_MANAGER].includes(role);
    const pageTitle = isShop ? "Return to Warehouse" : "Return Stock";
    const pageSubtitle = isShop
        ? "Return stock against an inbound transfer bill. Stock updates only when warehouse receives."
        : "Incoming shop returns — approve, then receive to update warehouse stock.";

    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [detail, setDetail] = useState(null);
    const [billDoc, setBillDoc] = useState(null);
    const [pdfDownloading, setPdfDownloading] = useState(false);

    const listParams = useMemo(() => {
        const p = { page: 1, limit: 50 };
        if (statusFilter) p.status = statusFilter;
        if (search.trim()) p.search = search.trim();
        return p;
    }, [statusFilter, search]);

    const { data, isFetching, refetch } = useGetShopWarehouseReturnsQuery(listParams);
    const rows = data?.items || [];

    const [previewSource, { isFetching: previewing }] = useLazyPreviewReturnSourceQuery();
    const [createReturn, { isLoading: creating }] = useCreateShopWarehouseReturnMutation();
    const [approveReturn] = useApproveShopWarehouseReturnMutation();
    const [rejectReturn] = useRejectShopWarehouseReturnMutation();
    const [dispatchReturn] = useDispatchShopWarehouseReturnMutation();
    const [receiveReturn] = useReceiveShopWarehouseReturnMutation();
    const [cancelReturn] = useCancelShopWarehouseReturnMutation();
    const [fetchBill] = useLazyGetShopWarehouseReturnBillQuery();
    const [downloadBillPdf] = useLazyDownloadShopWarehouseReturnBillPdfQuery();

    const [billNumber, setBillNumber] = useState("");
    const [returnReason, setReturnReason] = useState("");
    const [preview, setPreview] = useState(null);
    const [qtyMap, setQtyMap] = useState({});

    const resetCreate = () => {
        setBillNumber("");
        setReturnReason("");
        setPreview(null);
        setQtyMap({});
        setShowCreate(false);
    };

    const handlePreview = async () => {
        if (!billNumber.trim()) {
            toast.error("Enter transfer bill / request number");
            return;
        }
        try {
            const dataPreview = await previewSource({ bill_number: billNumber.trim() }).unwrap();
            setPreview(dataPreview);
            const initial = {};
            for (const line of dataPreview.lines || []) {
                initial[line.variant_id] = "";
            }
            setQtyMap(initial);
            if (!(dataPreview.lines || []).length) {
                toast.info("No returnable lines on this bill");
            }
        } catch (err) {
            setPreview(null);
            toast.error(getApiErrorMessage(err, "Bill not found"));
        }
    };

    const setLineQty = (variantId, raw, maxAllowed) => {
        setQtyMap((prev) => ({
            ...prev,
            [variantId]: clampReturnQty(raw, maxAllowed),
        }));
    };

    const handleCreate = async () => {
        if (!returnReason.trim()) {
            toast.error("Return reason is required");
            return;
        }
        const lineById = new Map((preview?.lines || []).map((l) => [l.variant_id, l]));
        const items = [];
        for (const [variant_id, q] of Object.entries(qtyMap)) {
            const qty = parseInt(q, 10);
            if (!Number.isInteger(qty) || qty <= 0) continue;
            const line = lineById.get(variant_id);
            const max = Number(line?.remaining_returnable_qty) || 0;
            if (qty > max) {
                toast.error(
                    `Return qty cannot exceed remaining ${max} for ${line?.variant?.product_code || "item"}`
                );
                return;
            }
            items.push({ variant_id, return_quantity: qty });
        }

        if (!items.length) {
            toast.error("Enter return qty for at least one product");
            return;
        }

        try {
            await createReturn({
                idempotencyKey: generateReturnIdempotencyKey(),
                bill_number: billNumber.trim(),
                return_reason: returnReason.trim(),
                items,
            }).unwrap();
            toast.success("Return request submitted");
            resetCreate();
            refetch();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to create return"));
        }
    };

    const runAction = async (fn, successMsg) => {
        try {
            await fn();
            toast.success(successMsg);
            setDetail(null);
            refetch();
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Action failed"));
        }
    };

    const openBill = async (returnId) => {
        try {
            const doc = await fetchBill(returnId).unwrap();
            setBillDoc(doc);
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Return bill not ready"));
        }
    };

    const handleDownloadBillPdf = async (returnId, billNumber) => {
        if (!returnId) return;
        setPdfDownloading(true);
        try {
            const blob = await downloadBillPdf(returnId).unwrap();
            downloadBlobFile(blob, `${billNumber || "return-bill"}.pdf`);
            toast.success("Return bill PDF downloaded");
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to download return bill PDF"));
        } finally {
            setPdfDownloading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">{pageTitle}</h2>
                    <p className="text-xs text-gray-500">{pageSubtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    {isShop && (
                        <button
                            type="button"
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <Plus size={14} />
                            New Return
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search return / bill no."
                            className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 w-56 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 w-48 focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
                    >
                        <option value="">All statuses</option>
                        {Object.keys(STATUS_BADGE).map((s) => (
                            <option key={s} value={s}>
                                {s.replace(/_/g, " ")}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                        <tr>
                            <th className="px-3 py-2 text-left font-semibold">Return #</th>
                            <th className="px-3 py-2 text-left font-semibold">Source Bill</th>
                            <th className="px-3 py-2 text-left font-semibold">Shop → Warehouse</th>
                            <th className="px-3 py-2 text-left font-semibold">Status</th>
                            <th className="px-3 py-2 text-right font-semibold">F. Total</th>
                            <th className="px-3 py-2 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-8 text-center text-gray-400 text-xs">
                                    No return requests yet
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.return_id} className="hover:bg-gray-50/80">
                                    <td className="px-3 py-2">
                                        <p className="font-semibold text-gray-800 text-xs">{row.return_number}</p>
                                        {row.return_bill_number ? (
                                            <p className="text-[10px] text-blue-600">{row.return_bill_number}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-600">
                                        {row.source_bill_number || row.source_reference_number || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                        <p className="text-gray-800">{row.from_shop?.shop_name}</p>
                                        <p className="text-gray-400">→ {row.to_warehouse?.warehouse_name}</p>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                STATUS_BADGE[row.status] || "bg-gray-100 text-gray-500"
                                            }`}
                                        >
                                            {row.status?.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-medium text-blue-700">
                                        {fmtMoney(row.return_bill_totals?.final_amount)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="inline-flex gap-1">
                                            <button
                                                type="button"
                                                title="View"
                                                onClick={() => setDetail(row)}
                                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            {row.return_bill_number ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        title="Return bill"
                                                        onClick={() => openBill(row.return_id)}
                                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-gray-100 rounded-md transition-colors"
                                                    >
                                                        <FileText size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Download PDF"
                                                        disabled={pdfDownloading}
                                                        onClick={() =>
                                                            handleDownloadBillPdf(
                                                                row.return_id,
                                                                row.return_bill_number
                                                            )
                                                        }
                                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4 py-8">
                        <div className="fixed inset-0 bg-black/40" onClick={resetCreate} />
                        <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-base font-semibold text-gray-800">New return to warehouse</h3>
                                <button
                                    type="button"
                                    onClick={resetCreate}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 text-sm">
                                <div className="flex gap-2">
                                    <input
                                        value={billNumber}
                                        onChange={(e) => setBillNumber(e.target.value)}
                                        placeholder="Transfer bill no. or request no."
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={handlePreview}
                                        disabled={previewing}
                                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {previewing ? "Loading…" : "Load bill"}
                                    </button>
                                </div>

                                {preview && (
                                    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-xs space-y-1 text-gray-700">
                                        <p>
                                            Warehouse:{" "}
                                            <strong>{preview.warehouse?.warehouse_name}</strong>
                                        </p>
                                        <p>
                                            Source:{" "}
                                            {preview.source_bill_number || preview.source_reference_number}
                                        </p>
                                    </div>
                                )}

                                {preview?.lines?.length > 0 && (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-gray-500 font-semibold">Product</th>
                                                    <th className="px-3 py-2 text-right text-gray-500 font-semibold">Received</th>
                                                    <th className="px-3 py-2 text-right text-gray-500 font-semibold">Already out</th>
                                                    <th className="px-3 py-2 text-right text-gray-500 font-semibold">Remaining</th>
                                                    <th className="px-3 py-2 text-right text-gray-500 font-semibold">F.Price</th>
                                                    <th className="px-3 py-2 text-right text-gray-500 font-semibold">Return qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {preview.lines.map((line) => {
                                                    const maxQty = Math.max(
                                                        0,
                                                        Number(line.remaining_returnable_qty) || 0
                                                    );
                                                    return (
                                                        <tr key={line.variant_id}>
                                                            <td className="px-3 py-2">
                                                                <p className="font-medium text-gray-800">
                                                                    {line.variant?.product?.name}
                                                                </p>
                                                                <p className="text-gray-400">
                                                                    {line.variant?.product_code}
                                                                </p>
                                                            </td>
                                                            <td className="px-3 py-2 text-right tabular-nums">
                                                                {line.source_received_qty}
                                                            </td>
                                                            <td className="px-3 py-2 text-right tabular-nums">
                                                                {line.already_returned_qty}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                                                {maxQty}
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-blue-700 tabular-nums">
                                                                {line.unit_franchise_price != null
                                                                    ? fmtMoney(line.unit_franchise_price)
                                                                    : "—"}
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={maxQty}
                                                                    step={1}
                                                                    inputMode="numeric"
                                                                    value={qtyMap[line.variant_id] ?? ""}
                                                                    disabled={maxQty <= 0}
                                                                    onChange={(e) =>
                                                                        setLineQty(
                                                                            line.variant_id,
                                                                            e.target.value,
                                                                            maxQty
                                                                        )
                                                                    }
                                                                    onBlur={(e) =>
                                                                        setLineQty(
                                                                            line.variant_id,
                                                                            e.target.value,
                                                                            maxQty
                                                                        )
                                                                    }
                                                                    className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-40"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-gray-500">Return reason *</label>
                                    <textarea
                                        value={returnReason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        rows={2}
                                        className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        placeholder="Why is this stock being returned?"
                                    />
                                </div>
                            </div>
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={resetCreate}
                                    className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={creating || !preview}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {creating ? "Submitting…" : "Submit return request"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {detail && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4 py-8">
                        <div className="fixed inset-0 bg-black/40" onClick={() => setDetail(null)} />
                        <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800">{detail.return_number}</h3>
                                    <p className="text-xs text-gray-400">
                                        {detail.status?.replace(/_/g, " ")}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetail(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-3 text-sm">
                                <p className="text-xs text-gray-600">
                                    Reason: <strong>{detail.return_reason || "—"}</strong>
                                </p>
                                <p className="text-xs text-gray-600">
                                    Source: {detail.source_bill_number || detail.source_reference_number}
                                </p>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-gray-500">Product</th>
                                                <th className="px-3 py-2 text-right text-gray-500">Qty</th>
                                                <th className="px-3 py-2 text-right text-gray-500">F.Price</th>
                                                <th className="px-3 py-2 text-right text-gray-500">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(detail.items || []).map((item) => {
                                                const qty =
                                                    item.approved_quantity != null
                                                        ? item.approved_quantity
                                                        : item.return_quantity;
                                                return (
                                                    <tr key={item.return_item_id}>
                                                        <td className="px-3 py-2">
                                                            {item.variant?.product?.name}
                                                        </td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums text-blue-700">
                                                            {fmtMoney(item.franchise_unit_price_snapshot)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                                                            {fmtMoney(item.franchise_line_value_snapshot)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-right text-sm font-semibold text-blue-800">
                                    Total: {fmtMoney(detail.return_bill_totals?.final_amount)}
                                </p>
                            </div>
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex flex-wrap justify-end gap-2">
                                {isWh && detail.status === "REQUESTED" && (
                                    <>
                                        <button
                                            type="button"
                                            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-1.5"
                                            onClick={() => {
                                                const reason = window.prompt("Rejection reason?");
                                                if (!reason) return;
                                                runAction(
                                                    () =>
                                                        rejectReturn({
                                                            returnId: detail.return_id,
                                                            idempotencyKey: generateReturnIdempotencyKey(),
                                                            rejection_reason: reason,
                                                        }).unwrap(),
                                                    "Return rejected"
                                                );
                                            }}
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
                                        <button
                                            type="button"
                                            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-1.5"
                                            onClick={() =>
                                                runAction(
                                                    () =>
                                                        approveReturn({
                                                            returnId: detail.return_id,
                                                            idempotencyKey: generateReturnIdempotencyKey(),
                                                            return_bill_type: "NON_GST_INVOICE",
                                                        }).unwrap(),
                                                    "Return approved"
                                                )
                                            }
                                        >
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                    </>
                                )}
                                {isShop && detail.status === "APPROVED" && (
                                    <button
                                        type="button"
                                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1.5"
                                        onClick={() =>
                                            runAction(
                                                () =>
                                                    dispatchReturn({
                                                        returnId: detail.return_id,
                                                        idempotencyKey: generateReturnIdempotencyKey(),
                                                    }).unwrap(),
                                                "Return dispatched (stock unchanged until WH receive)"
                                            )
                                        }
                                    >
                                        <Truck size={14} /> Dispatch
                                    </button>
                                )}
                                {isWh && detail.status === "DISPATCHED" && (
                                    <button
                                        type="button"
                                        className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-1.5"
                                        onClick={() =>
                                            runAction(
                                                () =>
                                                    receiveReturn({
                                                        returnId: detail.return_id,
                                                        idempotencyKey: generateReturnIdempotencyKey(),
                                                    }).unwrap(),
                                                "Received — shop stock reduced, warehouse increased"
                                            )
                                        }
                                    >
                                        <PackageCheck size={14} /> Confirm received
                                    </button>
                                )}
                                {((isShop && ["REQUESTED", "APPROVED"].includes(detail.status)) ||
                                    (isWh &&
                                        !["COMPLETED", "CANCELLED", "REJECTED"].includes(detail.status))) && (
                                    <button
                                        type="button"
                                        className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 inline-flex items-center gap-1.5"
                                        onClick={() => {
                                            const reason = window.prompt("Cancel reason?") || "Cancelled";
                                            runAction(
                                                () =>
                                                    cancelReturn({
                                                        returnId: detail.return_id,
                                                        idempotencyKey: generateReturnIdempotencyKey(),
                                                        cancel_reason: reason,
                                                    }).unwrap(),
                                                "Return cancelled"
                                            );
                                        }}
                                    >
                                        <Ban size={14} /> Cancel
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDetail(null)}
                                    className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {billDoc && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4 py-8">
                        <div className="fixed inset-0 bg-black/40" onClick={() => setBillDoc(null)} />
                        <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                            <div className="flex justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800">Return Bill</h3>
                                    <p className="text-xs text-blue-600">{billDoc.return_bill_number}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setBillDoc(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                                {billDoc.from_shop?.shop_name} → {billDoc.to_warehouse?.warehouse_name}
                            </p>
                            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left">#</th>
                                        <th className="px-2 py-1.5 text-left">Product</th>
                                        <th className="px-2 py-1.5 text-right">Qty</th>
                                        <th className="px-2 py-1.5 text-right">F.Price</th>
                                        <th className="px-2 py-1.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(billDoc.lines || []).map((line) => (
                                        <tr key={line.sno}>
                                            <td className="px-2 py-1.5">{line.sno}</td>
                                            <td className="px-2 py-1.5">{line.product_name}</td>
                                            <td className="px-2 py-1.5 text-right tabular-nums">{line.quantity}</td>
                                            <td className="px-2 py-1.5 text-right tabular-nums text-blue-700">
                                                {fmtMoney(line.unit_charged_price)}
                                            </td>
                                            <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                                                {fmtMoney(line.line_franchise_total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-right mt-3 font-semibold text-blue-800">
                                Final: {fmtMoney(billDoc.totals?.final_amount)}
                            </p>
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={pdfDownloading}
                                    onClick={() =>
                                        handleDownloadBillPdf(
                                            billDoc.return_id,
                                            billDoc.return_bill_number
                                        )
                                    }
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                                >
                                    <Download size={14} />
                                    {pdfDownloading ? "Downloading…" : "Download PDF"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillDoc(null)}
                                    className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
