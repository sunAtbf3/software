// src/Components/ContentDashboard/ContentDashboardTab.jsx
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CURRENT_USER, isAdmin } from "../roles";
import { useGetProductStocksQuery } from "../../REDUX_FEATURES/REDUX_SLICES/Stock_api/stockApi";
import { useGetShopStocksQuery } from "../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi";
import { useGetShopsQuery } from "../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { useGetWarehousesQuery } from "../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { useGetMonthlyOverviewQuery } from "../../REDUX_FEATURES/REDUX_SLICES/Dashboard_api/dashboardApi";
import NetworkStockPanel from "../shared/NetworkStockPanel";

const SHOP_ROLES = new Set(["SHOP_OWNER", "SHOP_MANAGER", "BILLING_STAFF"]);
const WH_ROLES = new Set(["WH_MANAGER", "WH_STOCK_LISTER"]);

const StatCard = ({ label, value, sub, color = "text-app-text" }) => (
    <div className="app-stat-card">
        <p className="app-stat-label">{label}</p>
        <p className={`app-stat-value ${color}`}>{value}</p>
        {sub && <p className="app-stat-hint">{sub}</p>}
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload || {};
    return (
        <div className="app-card app-card-body text-sm">
            <p className="font-semibold text-app-text mb-2">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="text-app-text-secondary">
                    {p.name}: <span className="font-semibold text-app-text ml-1">₹{p.value?.toLocaleString()}</span>
                </p>
            ))}
            {row.Expenses != null && (
                <p className="text-app-text-secondary mt-1">
                    Expenses: <span className="font-semibold text-app-text ml-1">₹{row.Expenses?.toLocaleString()}</span>
                </p>
            )}
        </div>
    );
};

const mapWarehouseStock = (stocks) =>
    (stocks || []).map((s) => ({
        id: `wh-${s.stock_id}`,
        name: s.variant?.product?.name || "Unknown Product",
        stock: s.quantity || 0,
        lowStockAlert: s.low_stock_threshold || 10,
        mrp: s.variant?.mrp || 0,
    }));

const mapShopStock = (stocks) =>
    (stocks || []).map((s) => ({
        id: `shop-${s.shop_stock_id}`,
        name: s.variant?.product?.name || "Unknown Product",
        stock: s.quantity_available || 0,
        lowStockAlert: s.low_stock_threshold || 10,
        mrp: s.variant?.mrp || 0,
    }));

export default function ContentDashboardTab() {
    const { user } = useSelector((state) => state.auth);
    const [locationFilter, setLocationFilter] = useState("all");

    const { data: shopsData } = useGetShopsQuery({ page: 1, limit: 100, is_active: "true" });
    const { data: warehousesData } = useGetWarehousesQuery({ page: 1, limit: 100, is_active: "true" });

    const shops = shopsData?.shops || [];
    const warehouses = warehousesData?.warehouses || [];

    const effectiveScope = useMemo(() => {
        if (isAdmin()) {
            if (locationFilter === "all") return { mode: "all" };
            if (locationFilter.startsWith("shop:")) {
                return { mode: "shop", id: locationFilter.slice(5) };
            }
            if (locationFilter.startsWith("warehouse:")) {
                return { mode: "warehouse", id: locationFilter.slice(10) };
            }
            return { mode: "all" };
        }
        if (SHOP_ROLES.has(user?.role)) {
            return { mode: "shop", id: user?.shop_id || "" };
        }
        if (WH_ROLES.has(user?.role)) {
            return { mode: "warehouse", id: user?.warehouse_id || "" };
        }
        return { mode: "all" };
    }, [locationFilter, user?.role, user?.shop_id, user?.warehouse_id]);

    const fetchWarehouseStocks = effectiveScope.mode === "warehouse" || effectiveScope.mode === "all";
    const fetchShopStocks = effectiveScope.mode === "shop" || effectiveScope.mode === "all";

    const { data: stocksData } = useGetProductStocksQuery(
        {
            page: 1,
            limit: 100,
            warehouse_id: effectiveScope.mode === "warehouse" ? effectiveScope.id : "",
        },
        { skip: !fetchWarehouseStocks }
    );

    const { data: shopStocksData } = useGetShopStocksQuery(
        {
            page: 1,
            limit: 100,
            shop_id: effectiveScope.mode === "shop" ? effectiveScope.id : "",
        },
        { skip: !fetchShopStocks }
    );

    const overviewShopId = isAdmin() && effectiveScope.mode === "shop" ? effectiveScope.id : "";
    const overviewWarehouseId = isAdmin() && effectiveScope.mode === "warehouse" ? effectiveScope.id : "";

    const { data: overview, isLoading: overviewLoading, isFetching: overviewFetching } = useGetMonthlyOverviewQuery({
        months: 6,
        shop_id: overviewShopId,
        warehouse_id: overviewWarehouseId,
    });

    const filteredProducts = useMemo(() => {
        if (effectiveScope.mode === "shop") {
            return mapShopStock(shopStocksData?.stocks);
        }
        if (effectiveScope.mode === "warehouse") {
            return mapWarehouseStock(stocksData?.stocks);
        }
        return [
            ...mapWarehouseStock(stocksData?.stocks),
            ...mapShopStock(shopStocksData?.stocks),
        ];
    }, [effectiveScope.mode, stocksData, shopStocksData]);

    const lowStock = filteredProducts.filter((p) => p.stock > 0 && p.stock <= (p.lowStockAlert || 10));
    const outOfStock = filteredProducts.filter((p) => p.stock === 0);
    const totalInventoryValue = filteredProducts.reduce((s, p) => s + ((p.stock || 0) * (p.mrp || 0)), 0);

    const chartData = useMemo(
        () => (overview?.series || []).map((row) => ({
            month: row.month,
            Sales: row.sales,
            Purchase: row.purchase,
            Profit: row.profit,
            Expenses: row.expenses,
        })),
        [overview]
    );

    const hasChartData = chartData.some(
        (d) => (d.Sales || 0) > 0 || (d.Purchase || 0) > 0 || (d.Expenses || 0) > 0
    );

    const locationLabel = useMemo(() => {
        if (isAdmin()) {
            if (effectiveScope.mode === "all") return "All Locations";
            if (effectiveScope.mode === "shop") {
                const name = shops.find((s) => s.shop_id === effectiveScope.id)?.shop_name;
                return `Shop: ${name || effectiveScope.id}`;
            }
            if (effectiveScope.mode === "warehouse") {
                const name = warehouses.find((w) => w.warehouse_id === effectiveScope.id)?.warehouse_name;
                return `Warehouse: ${name || effectiveScope.id}`;
            }
        }
        if (SHOP_ROLES.has(user?.role)) {
            return `Shop: ${CURRENT_USER.locationName || user?.shop_id || "—"}`;
        }
        if (WH_ROLES.has(user?.role)) {
            return `Warehouse: ${CURRENT_USER.locationName || user?.warehouse_id || "—"}`;
        }
        return "All Locations";
    }, [effectiveScope, shops, warehouses, user?.role, user?.shop_id, user?.warehouse_id]);

    const chartLoading = overviewLoading || overviewFetching;
    const totalLocations = shops.length + warehouses.length;

    return (
        <div className="app-page">

            <div className="app-page-header">
                <div>
                    <h1 className="app-page-title">Home</h1>
                    <p className="app-page-subtitle">
                        Overview for <span className="text-app-accent font-medium">{locationLabel}</span>
                    </p>
                </div>

                {isAdmin() && (shops.length > 0 || warehouses.length > 0) && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-app-text-muted">Location:</span>
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="app-select w-auto min-w-[200px]"
                        >
                            <option value="all">All Locations</option>
                            {shops.length > 0 && (
                                <optgroup label="Shops">
                                    {shops.map((s) => (
                                        <option key={s.shop_id} value={`shop:${s.shop_id}`}>
                                            {s.shop_name} (Shop)
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {warehouses.length > 0 && (
                                <optgroup label="Warehouses">
                                    {warehouses.map((w) => (
                                        <option key={w.warehouse_id} value={`warehouse:${w.warehouse_id}`}>
                                            {w.warehouse_name} (Warehouse)
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total SKUs" value={filteredProducts.length} sub="active stock entries" />
                <StatCard label="Total Units" value={filteredProducts.reduce((s, p) => s + p.stock, 0).toLocaleString()} sub="across all products" />
                <StatCard label="Inventory Value" value={`₹${(totalInventoryValue / 100000).toFixed(1)}L`} sub="at MRP" />
                <StatCard
                    label="Low Stock Alerts"
                    value={lowStock.length}
                    sub={`${outOfStock.length} out of stock`}
                    color={lowStock.length > 0 ? "text-app-danger" : "text-app-success"}
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    label="Products in Scope"
                    value={filteredProducts.length}
                    sub={
                        isAdmin()
                            ? effectiveScope.mode === "all"
                                ? `across ${totalLocations} locations`
                                : `at selected ${effectiveScope.mode}`
                            : `at your ${CURRENT_USER.locationName || "location"}`
                    }
                />
                <StatCard label="Active Products" value={filteredProducts.filter((p) => p.stock > 0).length} sub="with positive stock" />
                <StatCard
                    label="Low Stock Items"
                    value={lowStock.length}
                    sub={outOfStock.length > 0 ? `${outOfStock.length} completely out` : "all good"}
                    color={lowStock.length > 0 ? "text-app-warning" : "text-app-text"}
                />
                <StatCard
                    label={isAdmin() ? "Total Locations" : "Your Location"}
                    value={isAdmin() ? totalLocations : "1"}
                    sub={
                        isAdmin()
                            ? `${shops.length} shops · ${warehouses.length} warehouses`
                            : CURRENT_USER.locationName || CURRENT_USER.locationId
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 app-card">
                    <div className="app-card-header">
                        <div>
                            <h3 className="text-sm font-semibold text-app-text">Monthly Sales vs Purchase vs Profit</h3>
                            {isAdmin() && effectiveScope.mode === "shop" && (
                                <p className="text-xs text-app-text-muted mt-0.5">
                                    Sales & shop expenses for selected shop; purchases & warehouse expenses are org-wide
                                </p>
                            )}
                            {isAdmin() && effectiveScope.mode === "warehouse" && (
                                <p className="text-xs text-app-text-muted mt-0.5">
                                    Purchases & warehouse expenses for selected warehouse; sales are shop-level
                                </p>
                            )}
                        </div>
                        <span className="text-xs text-app-text-muted shrink-0">Last 6 months</span>
                    </div>
                    <div className="app-card-body">
                        {chartLoading && (
                            <p className="text-center text-sm text-app-text-muted py-16">Loading chart data…</p>
                        )}
                        {!chartLoading && chartData.length > 0 && (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />
                                    <Bar dataKey="Sales" fill="#1d4ed8" maxBarSize={28} />
                                    <Bar dataKey="Purchase" fill="#15803d" maxBarSize={28} />
                                    <Bar dataKey="Profit" fill="#4b5563" maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                        {!chartLoading && !hasChartData && (
                            <p className="text-center text-xs text-app-text-muted py-8">
                                No sales, purchases, or expenses recorded in the last 6 months yet.
                            </p>
                        )}
                        {!chartLoading && hasChartData && overview?.summary && (
                            <p className="text-center text-xs text-app-text-muted mt-2">
                                6-month totals — Sales: ₹{overview.summary.total_sales?.toLocaleString()}
                                {" · "}Purchase: ₹{overview.summary.total_purchase?.toLocaleString()}
                                {" · "}Expenses: ₹{overview.summary.total_expenses?.toLocaleString()}
                                {" · "}Profit: ₹{overview.summary.total_profit?.toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="app-card overflow-hidden">
                    <div className="app-card-header">
                        <h3 className="text-sm font-semibold text-app-text">Network Stock</h3>
                        <span className="app-badge-gray">All locations</span>
                    </div>
                    <div className="app-card-body overflow-y-auto max-h-80 p-0">
                        <NetworkStockPanel />
                    </div>
                </div>
            </div>

            {lowStock.length > 0 && (
                <div className="app-alert-warning">
                    <p className="font-medium mb-2">Low Stock Alerts ({lowStock.length} items)</p>
                    <div className="flex flex-wrap gap-1.5">
                        {lowStock.slice(0, 10).map((p) => (
                            <span key={p.id} className={p.stock === 0 ? "app-badge-red" : "app-badge-amber"}>
                                {p.name} — {p.stock === 0 ? "OUT" : `${p.stock} left`}
                            </span>
                        ))}
                        {lowStock.length > 10 && <span className="text-xs text-app-text-muted">+{lowStock.length - 10} more</span>}
                    </div>
                </div>
            )}

            {outOfStock.length > 0 && (
                <div className="app-alert-danger">
                    {outOfStock.length} product(s) completely out of stock
                </div>
            )}

            <div className="app-alert-info text-center text-xs">
                Stock levels are live from inventory. Chart uses bills (sales), purchase bills, and petty cash expenses.
            </div>
        </div>
    );
}
