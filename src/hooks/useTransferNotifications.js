import { useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetBulkTransferRequestsQuery } from "../REDUX_FEATURES/REDUX_SLICES/BulkTransfer_api/bulkTransferApi";
import { useGetTransferRequestsQuery } from "../REDUX_FEATURES/REDUX_SLICES/TransferRequest_api/transferRequestApi";
import { useGetMyShopQuery } from "../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import {
    deriveTransferAlerts,
    resolveNotificationUserContext,
} from "../utils/transferNotifications/deriveTransferAlerts";
import {
    hydrateSeenKeysForUser,
    markAlertSeen,
    markAllAlertsSeen,
    selectHydratedUserId,
    selectSeenAlertKeys,
} from "../REDUX_FEATURES/REDUX_SLICES/TransferNotification_api/transferNotificationSlice";

// const POLL_INTERVAL_MS = 45000;
const LIST_LIMIT = 50;

export function useTransferNotifications() {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const seenKeys = useSelector(selectSeenAlertKeys);
    const hydratedUserId = useSelector(selectHydratedUserId);

    const userId = user?.user_id || "";
    const isShopOwner = user?.role === "SHOP_OWNER" && !user?.shop_id;
    const { data: myShop } = useGetMyShopQuery(undefined, { skip: !isShopOwner });
    const ownerShopId = myShop?.shop_id || null;

    const skipPoll = !userId;

    const { data: bulkData, isFetching: bulkFetching } = useGetBulkTransferRequestsQuery(
        { page: 1, limit: LIST_LIMIT },
        { skip: skipPoll}
    );

    const { data: singleData, isFetching: singleFetching } = useGetTransferRequestsQuery(
        { page: 1, limit: LIST_LIMIT },
        { skip: skipPoll}
    );

    useEffect(() => {
        if (userId && hydratedUserId !== userId) {
            dispatch(hydrateSeenKeysForUser(userId));
        }
    }, [dispatch, userId, hydratedUserId]);

    const context = useMemo(
        () => resolveNotificationUserContext(user, ownerShopId),
        [user, ownerShopId]
    );

    const alerts = useMemo(() => {
        const derived = deriveTransferAlerts(
            context,
            bulkData?.requests || [],
            singleData?.requests || []
        );
        return derived.map((alert) => ({
            ...alert,
            unread: !seenKeys.includes(alert.key),
        }));
    }, [context, bulkData?.requests, singleData?.requests, seenKeys]);

    const unreadCount = useMemo(() => alerts.filter((a) => a.unread).length, [alerts]);

    const handleMarkSeen = useCallback(
        (key) => {
            if (!key) return;
            dispatch(markAlertSeen({ key, userId }));
        },
        [dispatch, userId]
    );

    const handleMarkAllSeen = useCallback(() => {
        const keys = alerts.filter((a) => a.unread).map((a) => a.key);
        if (keys.length === 0) return;
        dispatch(markAllAlertsSeen({ keys, userId }));
    }, [dispatch, alerts, userId]);

    return {
        alerts,
        unreadCount,
        isLoading: bulkFetching || singleFetching,
        markSeen: handleMarkSeen,
        markAllSeen: handleMarkAllSeen,
    };
}
