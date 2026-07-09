import { createSlice } from "@reduxjs/toolkit";
import { clearCredentials } from "../Login_Api/authSlice";
import { loadSeenAlertKeys, saveSeenAlertKeys } from "../../../utils/transferNotifications/transferNotificationStorage";

const initialState = {
    seenAlertKeys: [],
    hydratedUserId: null,
};

const persistSeen = (userId, keys) => {
    if (userId) saveSeenAlertKeys(userId, keys);
};

const transferNotificationSlice = createSlice({
    name: "transferNotification",
    initialState,
    reducers: {
        hydrateSeenKeys: (state, action) => {
            const { userId, keys } = action.payload || {};
            state.seenAlertKeys = Array.isArray(keys) ? keys : [];
            state.hydratedUserId = userId || null;
        },
        markAlertSeen: (state, action) => {
            const { key, userId } = action.payload || {};
            if (!key || state.seenAlertKeys.includes(key)) return;
            state.seenAlertKeys.push(key);
            persistSeen(userId || state.hydratedUserId, state.seenAlertKeys);
        },
        markAllAlertsSeen: (state, action) => {
            const { keys, userId } = action.payload || {};
            if (!Array.isArray(keys) || keys.length === 0) return;
            const merged = new Set([...state.seenAlertKeys, ...keys]);
            state.seenAlertKeys = [...merged];
            persistSeen(userId || state.hydratedUserId, state.seenAlertKeys);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(clearCredentials, (state) => {
            state.seenAlertKeys = [];
            state.hydratedUserId = null;
        });
    },
});

export const { hydrateSeenKeys, markAlertSeen, markAllAlertsSeen } = transferNotificationSlice.actions;

export const selectSeenAlertKeys = (state) => state.transferNotification.seenAlertKeys;
export const selectHydratedUserId = (state) => state.transferNotification.hydratedUserId;

export const hydrateSeenKeysForUser = (userId) => (dispatch) => {
    if (!userId) return;
    const keys = loadSeenAlertKeys(userId);
    dispatch(hydrateSeenKeys({ userId, keys }));
};

export default transferNotificationSlice.reducer;
