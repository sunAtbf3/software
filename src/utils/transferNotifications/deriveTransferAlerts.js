/**
 * Derive targeted transfer alerts from live API list data (no DB).
 * When status advances, old alert keys no longer match → alerts auto-dismiss.
 */

const WH_ROLES = new Set(["WH_MANAGER", "WH_STOCK_LISTER"]);
const SHOP_ROLES = new Set(["SHOP_OWNER", "SHOP_MANAGER", "BILLING_STAFF"]);

export const resolveNotificationUserContext = (user, ownerShopId = null) => ({
    userId: user?.user_id || "",
    role: user?.role || "",
    shopId: user?.shop_id || ownerShopId || "",
    warehouseId: user?.warehouse_id || "",
    isSuperAdmin: user?.role === "SUPER_ADMIN" || user?.role === "ORG_MANAGER",
    isWarehouseStaff: WH_ROLES.has(user?.role),
    isShopStaff: SHOP_ROLES.has(user?.role),
});

const buildAlertKey = (kind, id, status, audienceType, audienceId) =>
    `${kind}:${id}:${status}:${audienceType}:${audienceId}`;

const isAudienceMatch = (ctx, audienceType, audienceId) => {
    if (!audienceId) return false;
    if (ctx.isSuperAdmin) return true;
    if (audienceType === "wh") {
        return ctx.isWarehouseStaff && ctx.warehouseId === audienceId;
    }
    if (audienceType === "shop") {
        return ctx.isShopStaff && ctx.shopId === audienceId;
    }
    return false;
};

const pushAlert = (alerts, ctx, alert) => {
    if (!isAudienceMatch(ctx, alert.audienceType, alert.audienceId)) return;
    alerts.push(alert);
};

const destShopId = (req) => req.to_shop_id || req.to_shop?.shop_id || null;
const destShopName = (req) => req.to_shop?.shop_name || "destination shop";
const destWhId = (req) => req.to_warehouse_id || req.to_warehouse?.warehouse_id || null;
const destWhName = (req) => req.to_warehouse?.warehouse_name || "destination warehouse";
const sourceWhId = (req) => req.from_warehouse_id || req.from_warehouse?.warehouse_id || null;
const sourceWhName = (req) => req.from_warehouse?.warehouse_name || "warehouse";

const deriveBulkAlerts = (ctx, req) => {
    const alerts = [];
    const id = req.bulk_request_id;
    const num = req.bulk_request_number || id;
    const ts = req.requested_at || req.updated_at;
    const fromWh = sourceWhId(req);
    const toShop = destShopId(req);
    const toWh = destWhId(req);
    const shopLabel = destShopName(req);

    if (req.status === "REQUESTED" && fromWh) {
        pushAlert(alerts, ctx, {
            key: buildAlertKey("bulk", id, "REQUESTED", "wh", fromWh),
            kind: "bulk",
            requestId: id,
            status: "REQUESTED",
            audienceType: "wh",
            audienceId: fromWh,
            navigateTab: "bulk-requests",
            title: "New stock request",
            message: `${num}: stock request from ${shopLabel} — approval needed`,
            timestamp: ts,
        });
    }

    if (req.status === "APPROVED") {
        if (toShop) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("bulk", id, "APPROVED", "shop", toShop),
                kind: "bulk",
                requestId: id,
                status: "APPROVED",
                audienceType: "shop",
                audienceId: toShop,
                navigateTab: "bulk-requests",
                title: "Request approved",
                message: `${num}: your stock request was approved by ${sourceWhName(req)}`,
                timestamp: ts,
            });
        } else if (toWh) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("bulk", id, "APPROVED", "wh", toWh),
                kind: "bulk",
                requestId: id,
                status: "APPROVED",
                audienceType: "wh",
                audienceId: toWh,
                navigateTab: "bulk-requests",
                title: "Bulk transfer approved",
                message: `${num}: approved from ${sourceWhName(req)} — awaiting dispatch`,
                timestamp: ts,
            });
        }
    }

    if (req.status === "REJECTED" && toShop) {
        pushAlert(alerts, ctx, {
            key: buildAlertKey("bulk", id, "REJECTED", "shop", toShop),
            kind: "bulk",
            requestId: id,
            status: "REJECTED",
            audienceType: "shop",
            audienceId: toShop,
            navigateTab: "bulk-requests",
            title: "Request rejected",
            message: `${num}: your stock request was rejected`,
            timestamp: ts,
        });
    }

    if (["DISPATCHED", "PARTIALLY_RECEIVED"].includes(req.status)) {
        if (toShop) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("bulk", id, req.status, "shop", toShop),
                kind: "bulk",
                requestId: id,
                status: req.status,
                audienceType: "shop",
                audienceId: toShop,
                navigateTab: "bulk-requests",
                title: req.status === "DISPATCHED" ? "Stock dispatched" : "Partially received",
                message:
                    req.status === "DISPATCHED"
                        ? `${num}: stock dispatched from ${sourceWhName(req)} — please receive`
                        : `${num}: partial delivery — please receive remaining stock`,
                timestamp: ts,
            });
        } else if (toWh) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("bulk", id, req.status, "wh", toWh),
                kind: "bulk",
                requestId: id,
                status: req.status,
                audienceType: "wh",
                audienceId: toWh,
                navigateTab: "bulk-requests",
                title: req.status === "DISPATCHED" ? "Bulk transfer dispatched" : "Partially received",
                message: `${num}: incoming from ${sourceWhName(req)} — please receive`,
                timestamp: ts,
            });
        }
    }

    if (req.status === "COMPLETED" && fromWh) {
        pushAlert(alerts, ctx, {
            key: buildAlertKey("bulk", id, "COMPLETED", "wh", fromWh),
            kind: "bulk",
            requestId: id,
            status: "COMPLETED",
            audienceType: "wh",
            audienceId: fromWh,
            navigateTab: "bulk-requests",
            title: "Transfer completed",
            message: `${num}: received by ${toShop ? shopLabel : destWhName(req)}`,
            timestamp: ts,
        });
    }

    return alerts;
};

const deriveSingleAlerts = (ctx, req) => {
    const alerts = [];
    const id = req.request_id;
    const num = req.request_number || id;
    const ts = req.requested_at || req.updated_at;
    const fromWh = sourceWhId(req);
    const toShop = destShopId(req);
    const toWh = destWhId(req);
    const shopLabel = destShopName(req);

    if (req.status === "REQUESTED" && fromWh) {
        pushAlert(alerts, ctx, {
            key: buildAlertKey("single", id, "REQUESTED", "wh", fromWh),
            kind: "single",
            requestId: id,
            status: "REQUESTED",
            audienceType: "wh",
            audienceId: fromWh,
            navigateTab: "transfer-requests",
            title: "New transfer request",
            message: `${num}: request from ${shopLabel} — approval needed`,
            timestamp: ts,
        });
    }

    if (req.status === "APPROVED") {
        if (toShop) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("single", id, "APPROVED", "shop", toShop),
                kind: "single",
                requestId: id,
                status: "APPROVED",
                audienceType: "shop",
                audienceId: toShop,
                navigateTab: "transfer-requests",
                title: "Request approved",
                message: `${num}: your transfer request was approved`,
                timestamp: ts,
            });
        } else if (toWh) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("single", id, "APPROVED", "wh", toWh),
                kind: "single",
                requestId: id,
                status: "APPROVED",
                audienceType: "wh",
                audienceId: toWh,
                navigateTab: "transfer-requests",
                title: "Transfer approved",
                message: `${num}: approved — awaiting dispatch`,
                timestamp: ts,
            });
        }
    }

    if (req.status === "REJECTED" && toShop) {
        pushAlert(alerts, ctx, {
            key: buildAlertKey("single", id, "REJECTED", "shop", toShop),
            kind: "single",
            requestId: id,
            status: "REJECTED",
            audienceType: "shop",
            audienceId: toShop,
            navigateTab: "transfer-requests",
            title: "Request rejected",
            message: `${num}: your transfer request was rejected`,
            timestamp: ts,
        });
    }

    if (["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED"].includes(req.status)) {
        if (toShop) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("single", id, req.status, "shop", toShop),
                kind: "single",
                requestId: id,
                status: req.status,
                audienceType: "shop",
                audienceId: toShop,
                navigateTab: "transfer-requests",
                title: "Stock dispatched",
                message: `${num}: dispatched from ${sourceWhName(req)} — please receive`,
                timestamp: ts,
            });
        } else if (toWh) {
            pushAlert(alerts, ctx, {
                key: buildAlertKey("single", id, req.status, "wh", toWh),
                kind: "single",
                requestId: id,
                status: req.status,
                audienceType: "wh",
                audienceId: toWh,
                navigateTab: "transfer-requests",
                title: "Transfer in transit",
                message: `${num}: incoming — please receive`,
                timestamp: ts,
            });
        }
    }

    if (["COMPLETED", "RECEIVED"].includes(req.status) && fromWh) {
        pushAlert(alerts, ctx, {
            key: buildAlertKey("single", id, req.status, "wh", fromWh),
            kind: "single",
            requestId: id,
            status: req.status,
            audienceType: "wh",
            audienceId: fromWh,
            navigateTab: "transfer-requests",
            title: "Transfer received",
            message: `${num}: received by ${toShop ? shopLabel : destWhName(req)}`,
            timestamp: ts,
        });
    }

    return alerts;
};

export const deriveTransferAlerts = (userContext, bulkRequests = [], singleRequests = []) => {
    if (!userContext?.userId) return [];

    const ctx = userContext;
    const canReceive =
        ctx.isSuperAdmin || ctx.isWarehouseStaff || ctx.isShopStaff;
    if (!canReceive) return [];

    const alerts = [];
    for (const req of bulkRequests) {
        alerts.push(...deriveBulkAlerts(ctx, req));
    }
    for (const req of singleRequests) {
        alerts.push(...deriveSingleAlerts(ctx, req));
    }

    return alerts.sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
    });
};

export const formatAlertTime = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
