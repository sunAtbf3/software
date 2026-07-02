/**
 * User-safe API error text — never show Prisma paths, SQL, or stack traces in toasts.
 */
const TECHNICAL_PATTERNS = [
    /Invalid `prisma\./i,
    /prisma\.\w+\.(create|update|delete|findMany|findFirst|findUnique)/i,
    /invocation in\s+/i,
    /\\src\\services\\|\bsrc\/services\//i,
    /does not exist in the current database/i,
    /column `.+` does not exist/i,
    /table `.+` does not exist/i,
    /^Database error:/i,
    /Foreign key constraint failed/i,
    /ECONNREFUSED|ENOTFOUND/i,
];

const FRIENDLY_BY_CODE = {
    DB_SCHEMA_OUT_OF_DATE: "This feature is not fully set up yet. Please contact your administrator.",
    DATABASE_ERROR: "Unable to complete the request. Please try again.",
    DATABASE_VALIDATION_ERROR: "Some data was invalid. Please check the form and try again.",
    INTERNAL_ERROR: "Something went wrong. Please try again.",
};

const isTechnicalMessage = (message) =>
    typeof message === "string" && TECHNICAL_PATTERNS.some((re) => re.test(message));

/**
 * @param {unknown} err - RTK unwrap error or axios error shape
 * @param {string} fallback
 */
export function getApiErrorMessage(err, fallback = "Request failed") {
    const data = err?.data ?? err?.response?.data;
    const code = data?.code;
    if (code && FRIENDLY_BY_CODE[code]) {
        return FRIENDLY_BY_CODE[code];
    }

    const raw = data?.message ?? err?.message;
    if (!raw || typeof raw !== "string") {
        return fallback;
    }

    const trimmed = raw.trim();
    if (!trimmed || isTechnicalMessage(trimmed)) {
        return fallback;
    }

    return trimmed.length > 200 ? `${trimmed.slice(0, 197)}…` : trimmed;
}
