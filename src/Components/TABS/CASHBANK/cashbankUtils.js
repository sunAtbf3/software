export const fmtCurrency = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const PAYMENT_METHOD_LABELS = {
    CASH: "Cash",
    UPI: "UPI",
    CARD: "Card",
    BANK_TRANSFER: "Bank Transfer",
    CREDIT_ON_ACCOUNT: "Credit on Account",
    CREDIT_NOTE_REDEMPTION: "Credit Note",
    UNSPECIFIED: "Unspecified",
};

export const PAYMENT_METHOD_BADGE = {
    CASH: "bg-green-50 text-green-700 border border-green-200",
    UPI: "bg-purple-50 text-purple-700 border border-purple-200",
    CARD: "bg-blue-50 text-blue-700 border border-blue-200",
    BANK_TRANSFER: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    CREDIT_ON_ACCOUNT: "bg-amber-50 text-amber-700 border border-amber-200",
    CREDIT_NOTE_REDEMPTION: "bg-teal-50 text-teal-700 border border-teal-200",
};

export const AGING_BADGE = {
    "0-30": "bg-green-50 text-green-700 border border-green-200",
    "31-60": "bg-yellow-50 text-yellow-700 border border-yellow-200",
    "60+": "bg-red-50 text-red-700 border border-red-200",
};

/** Shop id for API params; omit when empty — backend resolves SHOP_OWNER owned shop. */
export const resolveShopId = (user) => user?.shop_id || user?.shop?.shop_id || "";

export const shouldSkipShopCashbank = (user) => {
    if (!user) return true;
    if ((user.role === "SUPER_ADMIN" || user.role === "ORG_MANAGER") && !resolveShopId(user)) return true;
    return false;
};
