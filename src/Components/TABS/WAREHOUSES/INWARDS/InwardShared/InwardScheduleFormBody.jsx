// TABS/WAREHOUSES/INWARDS/InwardShared/InwardScheduleFormBody.jsx
//
// Used by InwardAddForm only (schedule creation).
// Warehouse logic:
//   - SUPER_ADMIN → dropdown fetching GET /warehouses
//   - WH_MANAGER / WH_STOCK_LISTER → auto pre-filled from auth, read-only
// Vendor → always a dropdown fetching GET /vendors

import React from "react";
import { useSelector } from "react-redux";
import { useGetVendorsQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Vendor_api/vendorApi";
import { useGetWarehousesQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";

const WH_ROLES = ["WH_MANAGER", "WH_STOCK_LISTER"];  //  WE HAVE TO REPLACE THIS IN FUTURE 


export default function InwardScheduleFormBody({ formData, onChange, formErrors }) {
    // ── Auth state — role + warehouse_id ──────────────────────────────────────
    const { user } = useSelector((state) => state.auth);
    const userRole = user?.role || "";
    // const userWarehouseId = user?.warehouse_id || "";

    const userWarehouseName = user?.warehouse?.warehouse_name || "";
    const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "ORG_MANAGER";
    const isWHRole = WH_ROLES.includes(userRole);

    // ── Vendor list ───────────────────────────────────────────────────────────
    const {
        data: vendorData,
        isLoading: vendorsLoading,
    } = useGetVendorsQuery({ page: 1, limit: 100 });
    const vendors = vendorData?.vendors || [];

    // ── Warehouse list (only for SUPER_ADMIN) ─────────────────────────────────
    const {
        data: warehouseData,
        isLoading: warehousesLoading,
    } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }   // skip the call entirely for WH roles
    );
    const warehouses = warehouseData?.warehouses || [];

    const inputCls = (name) =>
        `w-full px-3 py-2 border rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors?.[name] ? "border-red-400" : "border-gray-300"
        }`;

    const errorMsg = (name) =>
        formErrors?.[name] ? (
            <p className="text-xs text-red-500 mt-1">{formErrors[name]}</p>
        ) : null;

    return (
        <div className="grid grid-cols-2 gap-4">

            {/* Vendor Dropdown */}
            <div className="col-span-2 text-gray-700">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Vendor <span className="text-red-500">*</span>
                </label>
                {vendorsLoading ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
                        Loading vendors…
                    </div>
                ) : (
                    <select
                        value={formData.vendor_id}
                        onChange={(e) => onChange({ vendor_id: e.target.value })}
                        className={inputCls("vendor_id")}
                    >
                        <option value="">— Select Vendor —</option>
                        {vendors.map((v) => (
                            <option key={v.vendor_id} value={v.vendor_id}>
                                {v.company_name}
                                {v.city ? ` — ${v.city}` : ""}
                            </option>
                        ))}
                    </select>
                )}
                {errorMsg("vendor_id")}
            </div>

            {/* Warehouse — dropdown for SUPER_ADMIN, read-only badge for WH roles */}
            <div className="col-span-2 text-gray-700">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Warehouse <span className="text-red-500">*</span>
                </label>

                {isWHRole ? (
                    // WH role: pre-filled from auth, not editable
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-500">{userWarehouseName}</span>
                        <span className="text-xs text-indigo-600 font-medium">Auto-assigned from your role</span>
                    </div>
                ) : warehousesLoading ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">
                        Loading warehouses…
                    </div>
                ) : (
                    <select
                        value={formData.warehouse_id}
                        onChange={(e) => onChange({ warehouse_id: e.target.value })}
                        className={inputCls("warehouse_id")}
                    >
                        <option value="">— Select Warehouse —</option>
                        {warehouses.map((w) => (
                            <option key={w.warehouse_id} value={w.warehouse_id}>
                                {w.warehouse_name} — {w.city}
                            </option>
                        ))}
                    </select>
                )}
                {errorMsg("warehouse_id")}
            </div>

            {/* Expected Date */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Expected Arrival Date
                </label>
                <input
                    type="datetime-local"
                    value={formData.expected_date}
                    onChange={(e) => onChange({ expected_date: e.target.value })}
                    className={inputCls("expected_date")}
                />
                {errorMsg("expected_date")}
            </div>

            {/* Remarks */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                <input
                    value={formData.remarks}
                    onChange={(e) => onChange({ remarks: e.target.value })}
                    placeholder="Optional notes"
                    className={inputCls("remarks")}
                />
                {errorMsg("remarks")}
            </div>

        </div>
    );
}
