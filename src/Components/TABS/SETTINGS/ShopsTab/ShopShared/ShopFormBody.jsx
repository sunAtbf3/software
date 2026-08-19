// TABS/SETTINGS/ShopShared/ShopFormBody.jsx
//
// Reusable shop form body used by both AddForm and EditForm
// Contains all backend fields: shop_code, shop_name, address, city, phone, email, owner_user_id, sales_channels, remarks

import React from "react";
import { useGetUsersQuery } from "../../../../../REDUX_FEATURES/REDUX_SLICES/User_Api/userApi";
import { SALES_CHANNELS } from "../../../../../REDUX_FEATURES/REDUX_SLICES/Shop_api/shopSlice";
import {
    SHOP_CODE_PLACEHOLDER,
    SHOP_CODE_FORMAT_HINT,
    normalizeShopCode,
} from "../../../../../constants/shop.constants";
import IndianStatePicker from "../../../../shared/IndianStatePicker";
import { useSelector } from "react-redux";
import { displayShopTypeLabel, isSuperAdminRole } from "../../../../roles";

const CHANNEL_LABELS = {
    WALK_IN: "Walk-in Store",
    ONLINE: "Online Store",
    WHOLESALE: "Wholesale",
    MHM: "MHM",
    OWB: "OWB (Online Wholesale)",
    OTHER: "Other",
};

export default function ShopFormBody({ formData, onChange, formErrors, isEdit = false }) {
    const actorRole = useSelector((state) => state.auth?.user?.role);
    const canSetFranchise = isSuperAdminRole(actorRole);
    const { data: ownersData, isLoading: ownersLoading } = useGetUsersQuery({
        page: 1,
        limit: 100,
        role: "SHOP_OWNER",
        is_active: "true",
    });
    const shopOwners = ownersData?.users || [];

    const inputCls = (name) =>
        `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors[name] ? "border-red-400" : "border-gray-300"
        }`;

    const errorMsg = (name) =>
        formErrors[name] ? (
            <p className="text-xs text-red-500 mt-1">{formErrors[name]}</p>
        ) : null;

    const toggleSalesChannel = (channel) => {
        const current = formData.sales_channels || [];
        if (current.includes(channel)) {
            onChange({ sales_channels: current.filter(c => c !== channel) });
        } else {
            onChange({ sales_channels: [...current, channel] });
        }
    };

    return (
        <div className="grid grid-cols-2 gap-4">

            {/* Shop Code */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shop Code <span className="text-red-500">*</span>
                </label>
                <input
                    value={formData.shop_code || ""}
                    onChange={(e) => onChange({ shop_code: normalizeShopCode(e.target.value) })}
                    placeholder={SHOP_CODE_PLACEHOLDER}
                    className={inputCls("shop_code")}
                    disabled={isEdit}
                />
                {errorMsg("shop_code")}
                {!isEdit && (
                    <p className="text-xs text-gray-400 mt-1">{SHOP_CODE_FORMAT_HINT}</p>
                )}
                {isEdit && (
                    <p className="text-xs text-gray-400 mt-1">Shop code cannot be changed after creation</p>
                )}
            </div>

            {/* Shop Name */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                    value={formData.shop_name || ""}
                    onChange={(e) => onChange({ shop_name: e.target.value })}
                    placeholder="e.g., Delhi Central Store"
                    className={inputCls("shop_name")}
                />
                {errorMsg("shop_name")}
            </div>

            {/* Address */}
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <textarea
                    value={formData.address || ""}
                    onChange={(e) => onChange({ address: e.target.value })}
                    rows={2}
                    placeholder="Full address of the shop"
                    className={`${inputCls("address")} resize-none`}
                />
                {errorMsg("address")}
            </div>

            {/* City */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                </label>
                <input
                    value={formData.city || ""}
                    onChange={(e) => onChange({ city: e.target.value })}
                    placeholder="e.g., Delhi, Mumbai, Bangalore"
                    className={inputCls("city")}
                />
                {errorMsg("city")}
            </div>

            {/* State — used for Place of Dispatch on bills */}
            <div>
                <IndianStatePicker
                    label="State"
                    value={formData.state_code || ""}
                    onChange={(code) => onChange({ state_code: code })}
                    error={formErrors.state_code}
                    required
                    placeholder="Type state name e.g. Delhi"
                />
                <p className="text-xs text-gray-400 mt-1">
                    Printed as Place of Dispatch on GST and non-GST invoices
                </p>
            </div>

            {/* Pincode */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                <input
                    value={formData.pincode || ""}
                    onChange={(e) => onChange({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="6-digit pincode"
                    maxLength={6}
                    className={inputCls("pincode")}
                />
                {errorMsg("pincode")}
            </div>

            {/* Phone */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                    value={formData.phone || ""}
                    onChange={(e) => onChange({ phone: e.target.value })}
                    placeholder="Contact number"
                    className={inputCls("phone")}
                />
                {errorMsg("phone")}
            </div>

            {/* Email */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => onChange({ email: e.target.value })}
                    placeholder="shop@mail.com"
                    className={inputCls("email")}
                />
                {errorMsg("email")}
            </div>

            {/* GSTIN — required for GST tax invoices */}
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shop GSTIN
                </label>
                <input
                    value={formData.gst_number || ""}
                    onChange={(e) => onChange({ gst_number: e.target.value.toUpperCase() })}
                    placeholder="e.g., 07AABCU9603R1ZX"
                    maxLength={15}
                    className={`${inputCls("gst_number")} font-mono uppercase`}
                />
                {errorMsg("gst_number")}
                <p className="text-xs text-gray-400 mt-1">
                    Required to generate GST tax invoices for this shop
                </p>
            </div>

            {/* Shop Owner */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Shop Owner</label>
                {ownersLoading ? (
                    <div className={`${inputCls("owner_user_id")} text-gray-400`}>
                        Loading shop owners…
                    </div>
                ) : (
                    <select
                        value={formData.owner_user_id || ""}
                        onChange={(e) => onChange({ owner_user_id: e.target.value })}
                        className={inputCls("owner_user_id")}
                    >
                        <option value="">— Select Shop Owner —</option>
                        {shopOwners.map((u) => (
                            <option key={u.user_id} value={u.user_id}>
                                {u.name} — {u.phone}
                            </option>
                        ))}
                    </select>
                )}
                {errorMsg("owner_user_id")}
                <p className="text-xs text-gray-400 mt-1">User must have SHOP_OWNER role</p>
            </div>

            {/* Shop Type */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Shop Type <span className="text-red-500">*</span>
                </label>
                <select
                    value={formData.shop_type || "OWNER"}
                    onChange={(e) => onChange({ shop_type: e.target.value })}
                    className={inputCls("shop_type")}
                >
                    <option value="OWNER">{displayShopTypeLabel("OWNER")}</option>
                    {canSetFranchise && (
                        <option value="FRANCHISE">{displayShopTypeLabel("FRANCHISE")}</option>
                    )}
                </select>
                {errorMsg("shop_type")}
                <p className="text-xs text-gray-400 mt-1">
                    Franchise shops cannot create non-listed bills
                </p>
            </div>

            {/* Sales Channels */}
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-2">Sales Channels</label>
                <div className="flex flex-wrap gap-3">
                    {SALES_CHANNELS.map(channel => (
                        <label key={channel} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={(formData.sales_channels || []).includes(channel)}
                                onChange={() => toggleSalesChannel(channel)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{CHANNEL_LABELS[channel]}</span>
                        </label>
                    ))}
                </div>
                {errorMsg("sales_channels")}
            </div>

            {/* Remarks */}
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                    value={formData.remarks || ""}
                    onChange={(e) => onChange({ remarks: e.target.value })}
                    rows={2}
                    placeholder="Optional notes about the shop"
                    className={`${inputCls("remarks")} resize-none`}
                />
                {errorMsg("remarks")}
            </div>

            {/* Status (Edit mode only) */}
            {isEdit && (
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={formData.is_active ? "active" : "inactive"}
                        onChange={(e) => onChange({ is_active: e.target.value === "active" })}
                        className={inputCls("is_active")}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    {errorMsg("is_active")}
                </div>
            )}

        </div>
    );
}
