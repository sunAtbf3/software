// TABS/SETTINGS/UserShared/UserFormBody.jsx
//
// Pure presentational component.
// Role-aware: shows warehouse_id OR shop_id OR neither based on selected role.
// teamMode: restricted roles + locked assignment for shop/warehouse managers.

import React from "react";
import { useGetWarehousesQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { useGetShopsQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import { USER_ROLES } from "./userRoles";

export { USER_ROLES };

const WH_ROLES = ["WH_MANAGER", "WH_STOCK_LISTER"];
const SHOP_ROLES = ["SHOP_OWNER", "BILLING_STAFF", "SHOP_MANAGER"];

export default function UserFormBody({
    formData,
    onChange,
    formErrors,
    isEdit = false,
    teamMode = false,
    teamContext = null,
    allowedRoles = null,
    readOnly = false,
    lockRole = false,
}) {
    const role = formData.role || "";
    const needsWH = WH_ROLES.includes(role);
    const needsShop = SHOP_ROLES.includes(role);

    const { data: warehouseData, isLoading: warehousesLoading } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: teamMode || !needsWH }
    );
    const { data: shopData, isLoading: shopsLoading } = useGetShopsQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: teamMode || !needsShop }
    );
    const warehouses = warehouseData?.warehouses || [];
    const shops = shopData?.shops || [];
    const roleOptions = allowedRoles?.length
        ? USER_ROLES.filter((r) => allowedRoles.includes(r.value))
        : USER_ROLES;

    const field = (name) => ({
        value: formData[name] ?? "",
        onChange: (e) => onChange({ [name]: e.target.value }),
        disabled: readOnly,
        readOnly,
    });

    const inputCls = (name) =>
        `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors?.[name] ? "border-red-400" : "border-gray-300"
        } ${readOnly ? "bg-gray-50 text-gray-600 cursor-not-allowed" : ""}`;

    const errorMsg = (name) =>
        formErrors?.[name] ? (
            <p className="text-xs text-red-500 mt-1">{formErrors[name]}</p>
        ) : null;

    const assignmentLabel = () => {
        if (teamContext?.scope === "shop" && teamContext.shop) {
            return `${teamContext.shop.shop_name} (${teamContext.shop.shop_code})`;
        }
        if (teamContext?.scope === "warehouse" && teamContext.warehouse) {
            return `${teamContext.warehouse.warehouse_name} (${teamContext.warehouse.warehouse_code})`;
        }
        if (teamContext?.scope === "shop") return teamContext.shop_id || "Your shop";
        if (teamContext?.scope === "warehouse") return teamContext.warehouse_id || "Your warehouse";
        return null;
    };

    return (
        <div className="grid grid-cols-2 gap-4 text-gray-700">

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Full Name <span className="text-red-500">*</span>
                </label>
                <input
                    {...field("name")}
                    placeholder="e.g. Ravi Kumar"
                    className={inputCls("name")}
                />
                {errorMsg("name")}
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone <span className="text-red-500">*</span>
                </label>
                <input
                    {...field("phone")}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className={inputCls("phone")}
                />
                {errorMsg("phone")}
            </div>

            {!teamMode && (
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Password {!isEdit && <span className="text-red-500">*</span>}
                        {isEdit && <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>}
                    </label>
                    <input
                        type="password"
                        {...field("password")}
                        placeholder={isEdit ? "Enter new password to change" : "Min 8 chars, upper+lower+digit+special"}
                        className={inputCls("password")}
                        autoComplete="new-password"
                    />
                    {errorMsg("password")}
                </div>
            )}

            {teamMode && !isEdit && (
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Password <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="password"
                        {...field("password")}
                        placeholder="Min 8 chars, upper+lower+digit+special"
                        className={inputCls("password")}
                        autoComplete="new-password"
                    />
                    {errorMsg("password")}
                </div>
            )}

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Role <span className="text-red-500">*</span>
                </label>
                <select
                    value={formData.role || ""}
                    onChange={(e) => onChange({ role: e.target.value })}
                    className={inputCls("role")}
                    disabled={readOnly || lockRole || (teamMode && isEdit)}
                >
                    {roleOptions.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
                {errorMsg("role")}
            </div>

            {teamMode && teamContext && (
                <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Assigned {teamContext.scope === "shop" ? "Shop" : "Warehouse"}
                    </p>
                    <p className="text-sm text-gray-800 mt-1">{assignmentLabel()}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        Assignment is fixed to your {teamContext.scope} and cannot be changed here.
                    </p>
                </div>
            )}

            {!teamMode && needsWH && (
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Warehouse <span className="text-red-500">*</span>
                    </label>
                    {warehousesLoading ? (
                        <div className={`${inputCls("warehouse_id")} text-gray-400`}>
                            Loading warehouses…
                        </div>
                    ) : (
                        <select
                            value={formData.warehouse_id || ""}
                            onChange={(e) => onChange({ warehouse_id: e.target.value })}
                            className={inputCls("warehouse_id")}
                            disabled={readOnly}
                        >
                            <option value="">— Select Warehouse —</option>
                            {warehouses.map((w) => (
                                <option key={w.warehouse_id} value={w.warehouse_id}>
                                    {w.warehouse_name}{w.city ? ` — ${w.city}` : ""}
                                </option>
                            ))}
                        </select>
                    )}
                    {errorMsg("warehouse_id")}
                </div>
            )}

            {!teamMode && needsShop && (
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Shop {!isEdit && <span className="text-gray-400 font-normal">(optional — assign later if needed)</span>}
                        {isEdit && <span className="text-red-500">*</span>}
                    </label>
                    {shopsLoading ? (
                        <div className={`${inputCls("shop_id")} text-gray-400`}>
                            Loading shops…
                        </div>
                    ) : (
                        <select
                            value={formData.shop_id || ""}
                            onChange={(e) => onChange({ shop_id: e.target.value })}
                            className={inputCls("shop_id")}
                            disabled={readOnly}
                        >
                            <option value="">— Select Shop —</option>
                            {shops.map((s) => (
                                <option key={s.shop_id} value={s.shop_id}>
                                    {s.shop_name}{s.city ? ` — ${s.city}` : ""}
                                </option>
                            ))}
                        </select>
                    )}
                    {errorMsg("shop_id")}
                </div>
            )}

            {!teamMode && role === "SUPER_ADMIN" && (
                <div className="col-span-2 bg-purple-50 border border-purple-100 rounded-lg px-4 py-2">
                    <p className="text-xs text-purple-600">
                        Super Admin has full system access — no warehouse or shop assignment needed.
                    </p>
                </div>
            )}

            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <textarea
                    {...field("remarks")}
                    placeholder="Optional notes about this user"
                    rows={2}
                    className={`${inputCls("remarks")} resize-none`}
                />
                {errorMsg("remarks")}
            </div>

        </div>
    );
}
