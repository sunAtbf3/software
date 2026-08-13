import React from "react";

/** Billing product code: bold, matches active Billing Counter tab accent. */
export const PRODUCT_CODE_CLASS = "font-semibold text-app-accent";

export default function ProductCode({
    code,
    className = "text-xs",
    as: Tag = "span",
    prefix = "",
    fallback = null,
}) {
    const value = code || fallback;
    if (value == null || value === "") return null;
    return (
        <Tag className={`${PRODUCT_CODE_CLASS} ${className}`}>
            {prefix}
            {value}
        </Tag>
    );
}
