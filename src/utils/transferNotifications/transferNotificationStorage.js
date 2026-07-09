const STORAGE_PREFIX = "transfer_notif_seen_";

export const getSeenKeysStorageKey = (userId) => `${STORAGE_PREFIX}${userId}`;

export const loadSeenAlertKeys = (userId) => {
    if (!userId) return [];
    try {
        const raw = localStorage.getItem(getSeenKeysStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : [];
    } catch {
        return [];
    }
};

export const saveSeenAlertKeys = (userId, keys) => {
    if (!userId) return;
    try {
        localStorage.setItem(getSeenKeysStorageKey(userId), JSON.stringify(keys));
    } catch {
        // ignore quota / private mode errors
    }
};
