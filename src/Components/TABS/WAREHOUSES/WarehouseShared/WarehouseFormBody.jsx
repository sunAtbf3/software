// TABS/WAREHOUSES/WarehouseShared/WarehouseFormBody.jsx
//
// Pure presentational component.
// Renders all warehouse fields from the backend schema.
// Both AddForm and EditForm import this and pass their own formData + handlers.

import React from "react";

export default function WarehouseFormBody({ formData, onChange, formErrors }) {
    const field = (name) => ({
        value: formData[name] ?? "",
        onChange: (e) => onChange({ [name]: e.target.value }),
    });

    const inputCls = (name) =>
        `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors?.[name] ? "border-red-400" : "border-gray-300"
        }`;

    const errorMsg = (name) =>
        formErrors?.[name] ? (
            <p className="text-xs text-red-500 mt-1">{formErrors[name]}</p>
        ) : null;

    return (
        <div className="grid grid-cols-2 gap-4 text-gray-700">

            {/* Warehouse Code */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Warehouse Code <span className="text-red-500">*</span>
                </label>
                <input
                    {...field("warehouse_code")}
                    placeholder="e.g. WH-DEL-001"
                    className={inputCls("warehouse_code")}
                    style={{ textTransform: "uppercase" }}
                />
                {errorMsg("warehouse_code")}
            </div>

            {/* Warehouse Name */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Warehouse Name <span className="text-red-500">*</span>
                </label>
                <input
                    {...field("warehouse_name")}
                    placeholder="e.g. Delhi Main Warehouse"
                    className={inputCls("warehouse_name")}
                />
                {errorMsg("warehouse_name")}
            </div>

            {/* City */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    City <span className="text-red-500">*</span>
                </label>
                <input
                    {...field("city")}
                    placeholder="e.g. Delhi"
                    className={inputCls("city")}
                />
                {errorMsg("city")}
            </div>

            {/* Manager Name */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Manager Name
                </label>
                <input
                    {...field("manager_name")}
                    placeholder="e.g. Rahul Sharma"
                    className={inputCls("manager_name")}
                />
                {errorMsg("manager_name")}
            </div>

            {/* Address — full width */}
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address <span className="text-red-500">*</span>
                </label>
                <input
                    {...field("address")}
                    placeholder="e.g. Plot 12, Industrial Area, Phase 2"
                    className={inputCls("address")}
                />
                {errorMsg("address")}
            </div>

            <div className="col-span-2 border-t border-gray-100 pt-4 mt-1">
                <p className="text-xs font-semibold text-gray-700 mb-1">Warehouse GST (legacy / optional)</p>
                <p className="text-[11px] text-gray-500 mb-3">
                    Stock transfer bill legal name and GSTIN come from Settings → Company Details
                    (Super Admin). These warehouse fields are optional and not used on transfer bills.
                </p>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
                <input
                    {...field("gstin")}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className={inputCls("gstin")}
                    style={{ textTransform: "uppercase" }}
                />
                {errorMsg("gstin")}
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State code</label>
                <input
                    {...field("state_code")}
                    placeholder="22"
                    maxLength={2}
                    className={inputCls("state_code")}
                />
                {errorMsg("state_code")}
            </div>

            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Legal name (for GST bill)</label>
                <input
                    {...field("legal_name")}
                    placeholder="Registered business name on GSTIN"
                    className={inputCls("legal_name")}
                />
                {errorMsg("legal_name")}
            </div>

            {/* Remarks — full width */}
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                    Remarks
                </label>
                <textarea
                    {...field("remarks")}
                    placeholder="Optional notes about this warehouse"
                    rows={2}
                    className={`${inputCls("remarks")} resize-none`}
                />
                {errorMsg("remarks")}
            </div>

            {/* is_active toggle — only shown in edit; AddForm always creates active */}
            {formData.hasOwnProperty("is_active") && typeof formData.is_active === "boolean" && (
                <div className="col-span-2 flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-600">Status</label>
                    <button
                        type="button"
                        onClick={() => onChange({ is_active: !formData.is_active })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.is_active ? "bg-green-500" : "bg-gray-300"
                            }`}
                    >
                        <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formData.is_active ? "translate-x-4" : "translate-x-1"
                                }`}
                        />
                    </button>
                    <span className={`text-xs font-medium ${formData.is_active ? "text-green-600" : "text-gray-400"}`}>
                        {formData.is_active ? "Active" : "Inactive"}
                    </span>
                </div>
            )}

        </div>
    );
}