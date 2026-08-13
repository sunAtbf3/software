// TABS/TRANSFERS/WarehouseProductsCatalogTab.jsx
//
// Shop-only: browse / download full warehouse product list (incl. 0 stock) as A4 landscape PDF.
// Does not change transfer request picker (stock>0 only).

import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Download, FileText, Loader2, Package, RefreshCw, Search } from "lucide-react";
import { toast } from "../../shared/ToastConfig";
import { useGetWarehousesQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import {
    useGetWarehouseProductsCatalogQuery,
    useLazyDownloadWarehouseProductsCatalogPdfQuery,
} from "../../../REDUX_FEATURES/REDUX_SLICES/ShopWarehouseCatalog_api/shopWarehouseCatalogApi";
import { downloadBlobFile } from "../../../utils/downloadBlob";
import { formatFranchiseRupee } from "../../../utils/comboPricing.utils";

const fmtMoney = (n) => {
    if (n == null || n === "" || !Number.isFinite(Number(n))) return "—";
    return Number(n).toFixed(2);
};

const fmtCombo = (row) => {
    if (row?.combo_unit_price == null || row?.combo_trigger_qty == null) return "—";
    return `${Number(row.combo_unit_price).toFixed(2)}/${row.combo_trigger_qty}`;
};

const displayProductName = (name) => {
    const n = String(name || "").trim();
    if (!n) return "—";
    return n.length > 30 ? `${n.slice(0, 30)}…` : n;
};

/** Bill-style fixed % columns — always sums to 100%, no middle gaps */
const buildCatalogColumns = (showFranchise, showPurchase) => {
    if (showFranchise && showPurchase) {
        return [
            { key: "img", label: "Img", width: "4%", align: "center" },
            { key: "code", label: "Code", width: "6%", align: "left" },
            { key: "product", label: "Product", width: "22%", align: "left" },
            { key: "brand", label: "Brand", width: "8%", align: "left" },
            { key: "warranty", label: "Warranty", width: "6%", align: "left" },
            { key: "mrp", label: "MRP", width: "8%", align: "right" },
            { key: "fprice", label: "F. Price", width: "8%", align: "right", headerClass: "text-indigo-600" },
            { key: "purchase", label: "Purchase", width: "8%", align: "right" },
            { key: "special", label: "Special Price", width: "8%", align: "right", headerClass: "text-emerald-700" },
            { key: "combo", label: "Combo Price/qty", width: "8%", align: "right", headerClass: "text-blue-700" },
            { key: "stock", label: "WH Stock", width: "14%", align: "right", padEnd: true },
        ];
    }
    if (showFranchise || showPurchase) {
        return [
            { key: "img", label: "Img", width: "5%", align: "center" },
            { key: "code", label: "Code", width: "7%", align: "left" },
            { key: "product", label: "Product", width: "24%", align: "left" },
            { key: "brand", label: "Brand", width: "9%", align: "left" },
            { key: "warranty", label: "Warranty", width: "7%", align: "left" },
            { key: "mrp", label: "MRP", width: "9%", align: "right" },
            ...(showFranchise
                ? [{ key: "fprice", label: "F. Price", width: "9%", align: "right", headerClass: "text-indigo-600" }]
                : [{ key: "purchase", label: "Purchase", width: "9%", align: "right" }]),
            { key: "special", label: "Special Price", width: "9%", align: "right", headerClass: "text-emerald-700" },
            { key: "combo", label: "Combo Price/qty", width: "8%", align: "right", headerClass: "text-blue-700" },
            { key: "stock", label: "WH Stock", width: "13%", align: "right", padEnd: true },
        ];
    }
    return [
        { key: "img", label: "Img", width: "5%", align: "center" },
        { key: "code", label: "Code", width: "8%", align: "left" },
        { key: "product", label: "Product", width: "26%", align: "left" },
        { key: "brand", label: "Brand", width: "10%", align: "left" },
        { key: "warranty", label: "Warranty", width: "8%", align: "left" },
        { key: "mrp", label: "MRP", width: "11%", align: "right" },
        { key: "special", label: "Special Price", width: "11%", align: "right", headerClass: "text-emerald-700" },
        { key: "combo", label: "Combo Price/qty", width: "10%", align: "right", headerClass: "text-blue-700" },
        { key: "stock", label: "WH Stock", width: "11%", align: "right", padEnd: true },
    ];
};

const cellAlign = (align) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

export default function WarehouseProductsCatalogTab() {
    const { user } = useSelector((state) => state.auth);
    const shopId = user?.shop_id || user?.shop?.shop_id || "";

    const [warehouseId, setWarehouseId] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    const { data: warehousesData, isLoading: whLoading } = useGetWarehousesQuery({
        page: 1,
        limit: 50,
        is_active: "true",
    });
    const warehouses = warehousesData?.warehouses || [];

    const canQuery = Boolean(shopId && warehouseId);

    const { data, isLoading, isFetching, isError, error, refetch } = useGetWarehouseProductsCatalogQuery(
        {
            shopId,
            warehouse_id: warehouseId,
            search: appliedSearch,
        },
        { skip: !canQuery }
    );

    const [downloadPdf, { isFetching: isDownloading }] =
        useLazyDownloadWarehouseProductsCatalogPdfQuery();

    const rows = data?.rows || [];
    const showFranchise = data?.show_franchise_price === true;
    const showPurchase = data?.show_purchase_price === true;

    const inStockCount = useMemo(
        () => rows.filter((r) => !r.out_of_stock).length,
        [rows]
    );
    const oosCount = rows.length - inStockCount;
    const catalogColumns = useMemo(
        () => buildCatalogColumns(showFranchise, showPurchase),
        [showFranchise, showPurchase]
    );

    const handleSearch = () => {
        setAppliedSearch(searchInput.trim());
    };

    const handleDownload = async () => {
        if (!canQuery) {
            toast.error("Select a warehouse first");
            return;
        }
        try {
            const blob = await downloadPdf({
                shopId,
                warehouse_id: warehouseId,
                search: appliedSearch,
            }).unwrap();

            if (blob && typeof blob === "object" && blob.type && String(blob.type).includes("json")) {
                const text = await blob.text();
                let message = "PDF download failed";
                try {
                    message = JSON.parse(text)?.message || message;
                } catch {
                    /* ignore */
                }
                toast.error(message);
                return;
            }

            const code = data?.warehouse_code || warehouseId.slice(0, 8);
            downloadBlobFile(blob, `warehouse-products-${code}.pdf`);
            toast.success("Catalog PDF downloaded (A4 landscape)");
        } catch (err) {
            let msg = err?.data?.message || err?.error || err?.message || "PDF download failed";
            if (err?.data instanceof Blob) {
                try {
                    const text = await err.data.text();
                    msg = JSON.parse(text)?.message || "PDF download failed";
                } catch {
                    msg = "PDF download failed";
                }
            }
            toast.error(typeof msg === "string" ? msg : "PDF download failed");
        }
    };

    const listError =
        error?.data?.message || error?.error || "Failed to load warehouse products";

    if (!shopId) {
        return (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                Your account is not assigned to a shop. Warehouse products catalog is unavailable.
            </div>
        );
    }

    return (
        <div className="space-y-4 p-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Warehouse Products</h2>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                        Full product list from a warehouse (including out of stock), sorted by product
                        code. Download an A4 landscape PDF for print — separate from transfer requests.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => canQuery && refetch()}
                        disabled={!canQuery || isFetching}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={!canQuery || isDownloading || isLoading}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Download size={14} />
                        )}
                        Download PDF (A4)
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Warehouse
                        </label>
                        <select
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                            disabled={whLoading}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">Select warehouse…</option>
                            {warehouses.map((w) => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.warehouse_name}
                                    {w.city ? ` — ${w.city}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Search
                        </label>
                        <div className="flex gap-2">
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                placeholder="Name, code, brand, SKU…"
                                disabled={!warehouseId}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={handleSearch}
                                disabled={!warehouseId}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg disabled:opacity-50"
                            >
                                <Search size={14} /> Go
                            </button>
                        </div>
                    </div>
                </div>
                {data && (
                    <p className="text-[11px] text-slate-400">
                        {data.warehouse_name} · {rows.length} variants · In stock {inStockCount} · Out
                        of stock {oosCount}
                        {showFranchise ? " · Franchise prices" : ""}
                        {showPurchase ? " · Purchase visible" : " · Purchase hidden"}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-100 p-3">
                    <p className="text-[10px] uppercase text-slate-400 font-semibold">Variants</p>
                    <p className="text-2xl font-bold text-slate-800">{canQuery ? rows.length : "—"}</p>
                </div>
                <div className="bg-white rounded-xl border border-emerald-50 p-3">
                    <p className="text-[10px] uppercase text-emerald-600 font-semibold">In stock</p>
                    <p className="text-2xl font-bold text-emerald-700">{canQuery ? inStockCount : "—"}</p>
                </div>
                <div className="bg-white rounded-xl border border-amber-50 p-3">
                    <p className="text-[10px] uppercase text-amber-600 font-semibold">Out of stock</p>
                    <p className="text-2xl font-bold text-amber-700">{canQuery ? oosCount : "—"}</p>
                </div>
                <div className="bg-white rounded-xl border border-teal-50 p-3">
                    <p className="text-[10px] uppercase text-teal-600 font-semibold">PDF page</p>
                    <p className="text-sm font-semibold text-teal-800 mt-2">A4 Landscape</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[min(68vh,36rem)] overflow-y-auto pl-2 pr-4 pb-1">
                    <table className="w-full table-fixed border-collapse text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                {catalogColumns.map((col) => (
                                    <th
                                        key={col.key}
                                        style={{ width: col.width }}
                                        className={`px-1.5 py-2 text-xs font-semibold text-slate-600 leading-tight break-words whitespace-normal align-top ${cellAlign(col.align)} ${col.headerClass || ""} ${col.key === "img" ? "pl-2" : ""} ${col.padEnd ? "pr-4" : ""} ${col.key === "combo" ? "text-[11px]" : ""}`}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!canQuery ? (
                                <tr>
                                    <td
                                        colSpan={catalogColumns.length}
                                        className="px-4 py-12 text-center text-slate-500 text-sm"
                                    >
                                        <Package className="mx-auto mb-2 opacity-40" size={28} />
                                        Select a warehouse to load products
                                    </td>
                                </tr>
                            ) : isLoading ? (
                                <tr>
                                    <td colSpan={catalogColumns.length} className="px-4 py-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin inline mr-2" size={18} />
                                        Loading products…
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={catalogColumns.length} className="px-4 py-12 text-center">
                                        <p className="text-sm text-red-600 mb-2">{listError}</p>
                                        <button
                                            type="button"
                                            onClick={() => refetch()}
                                            className="text-sm text-blue-600 underline"
                                        >
                                            Try again
                                        </button>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={catalogColumns.length} className="px-4 py-12 text-center text-slate-500">
                                        <FileText className="mx-auto mb-2 opacity-40" size={28} />
                                        No products for this warehouse / search
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr
                                        key={row.variant_id}
                                        className={row.out_of_stock ? "bg-amber-50/30" : "hover:bg-slate-50/80"}
                                    >
                                        {catalogColumns.map((col) => {
                                            const base = `px-1.5 py-1.5 align-middle text-[13px] ${cellAlign(col.align)}${col.padEnd ? " pr-4" : ""}${col.key === "img" ? " pl-2" : ""}`;
                                            if (col.key === "img") {
                                                return (
                                                    <td key={col.key} className={`${base} text-center`}>
                                                        {row.image_url ? (
                                                            <img
                                                                src={row.image_url}
                                                                alt=""
                                                                className="w-10 h-10 mx-auto object-cover rounded border border-slate-200"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.visibility = "hidden";
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 mx-auto rounded border border-dashed border-slate-200 bg-slate-50" />
                                                        )}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "code") {
                                                return (
                                                    <td key={col.key} className={`${base} font-semibold text-blue-600 whitespace-nowrap`}>
                                                        {row.product_code || "—"}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "product") {
                                                return (
                                                    <td
                                                        key={col.key}
                                                        className={`${base} text-slate-800 leading-snug break-words whitespace-normal`}
                                                        title={row.product_name || ""}
                                                    >
                                                        {displayProductName(row.product_name)}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "brand") {
                                                return (
                                                    <td key={col.key} className={`${base} text-slate-600 truncate`} title={row.brand_name || ""}>
                                                        {row.brand_name || "—"}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "warranty") {
                                                return (
                                                    <td key={col.key} className={`${base} text-slate-600 whitespace-nowrap`}>
                                                        {row.warranty || "—"}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "mrp") {
                                                return (
                                                    <td key={col.key} className={`${base} tabular-nums whitespace-nowrap`}>
                                                        {fmtMoney(row.mrp)}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "fprice") {
                                                return (
                                                    <td key={col.key} className={`${base} tabular-nums text-indigo-700 font-medium whitespace-nowrap`}>
                                                        {formatFranchiseRupee(row.franchise_unit_price)}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "purchase") {
                                                return (
                                                    <td key={col.key} className={`${base} tabular-nums whitespace-nowrap`}>
                                                        {fmtMoney(row.purchase_price)}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "special") {
                                                return (
                                                    <td key={col.key} className={`${base} tabular-nums text-emerald-700 whitespace-nowrap`}>
                                                        {fmtMoney(row.special_price)}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "combo") {
                                                return (
                                                    <td key={col.key} className={`${base} tabular-nums text-blue-700 whitespace-nowrap`}>
                                                        {fmtCombo(row)}
                                                    </td>
                                                );
                                            }
                                            if (col.key === "stock") {
                                                return (
                                                    <td key={col.key} className={`${base} tabular-nums whitespace-nowrap`}>
                                                        {row.out_of_stock ? (
                                                            <span className="font-semibold text-amber-700">Out of stock</span>
                                                        ) : (
                                                            row.warehouse_available
                                                        )}
                                                    </td>
                                                );
                                            }
                                            return <td key={col.key} className={base}>—</td>;
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
