export const TRANSFER_BILL_READY_STATUSES = new Set([
    "APPROVED",
    "DISPATCHED",
    "IN_TRANSIT",
    "PARTIALLY_RECEIVED",
    "RECEIVED",
    "COMPLETED",
]);

export const canViewTransferBill = (request) =>
    Boolean(request?.transfer_bill_number) &&
    TRANSFER_BILL_READY_STATUSES.has(request?.status);

export const openTransferBillWhatsApp = (request) => {
    const phone = request?.to_shop?.phone || "";
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 10) {
        return { ok: false, reason: "missing_phone" };
    }

    const token = request?.public_transfer_bill_token;
    if (!token) {
        return { ok: false, reason: "missing_token" };
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://api.bizcentro.cloud/api/v1";
    const shareUrl = `${apiBaseUrl}/bulk-transfer-requests/public/${token}`;
    const billNum = request.transfer_bill_number || request.bulk_request_number || "—";
    const shopName = request.to_shop?.shop_name || "";
    const amount = Number(request.franchise_bill_totals?.final_amount || 0).toFixed(2);
    const billTypeLabel =
        request.transfer_bill_type === "GST_INVOICE" ? "GST Invoice" : "Non-GST Invoice";
    const date = new Date(request.transfer_bill_generated_at || request.approved_at || Date.now()).toLocaleDateString("en-IN");

    const msg = [
        `Hello${shopName ? ` ${shopName}` : ""}!`,
        "",
        `Your franchise stock transfer bill has been approved.`,
        "",
        `Bill No: ${billNum}`,
        `Type: ${billTypeLabel}`,
        `Amount: ₹${amount}`,
        `Date: ${date}`,
        "",
        `View/Download Bill: ${shareUrl}`,
        "",
        "Thank you!",
    ].join("\n");

    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(
        `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener,noreferrer"
    );
    return { ok: true };
};
