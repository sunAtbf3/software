// TABS/SETTINGS/UserShared/UserEditForm.jsx

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Eye, EyeOff } from "lucide-react";
import {
    useUpdateUserMutation,
    usePatchUserStatusMutation,
    useResetUserPasswordMutation,
    useUpdateTeamMemberMutation,
    usePatchTeamMemberStatusMutation,
    useResetTeamMemberPasswordMutation,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/User_Api/userApi";
import {
    closeEditForm,
    updateFormData,
    setFormErrors,
    clearFormErrors,
    setSubmitting,
} from "../../../../../REDUX_FEATURES/REDUX_SLICES/User_Api/userSlice";
import UserFormBody from "./UserFormBody";

const WH_ROLES = ["WH_MANAGER", "WH_STOCK_LISTER"];
const SHOP_ROLES = ["SHOP_OWNER", "BILLING_STAFF", "SHOP_MANAGER"];
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#^])[A-Za-z\d@$!%*?&_#^]{8,}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export default function UserEditForm({
    formData,
    formErrors,
    selectedUser,
    onSave,
    teamMode = false,
    teamContext = null,
    readOnly = false,
}) {
    const dispatch = useDispatch();

    const [updateUser, { isLoading: isUpdatingAdmin }] = useUpdateUserMutation();
    const [patchStatus, { isLoading: isPatchingAdmin }] = usePatchUserStatusMutation();
    const [resetPassword, { isLoading: isResettingAdmin }] = useResetUserPasswordMutation();

    const [updateTeamMember, { isLoading: isUpdatingTeam }] = useUpdateTeamMemberMutation();
    const [patchTeamStatus, { isLoading: isPatchingTeam }] = usePatchTeamMemberStatusMutation();
    const [resetTeamPassword, { isLoading: isResettingTeam }] = useResetTeamMemberPasswordMutation();

    const isUpdating = teamMode ? isUpdatingTeam : isUpdatingAdmin;
    const isPatching = teamMode ? isPatchingTeam : isPatchingAdmin;
    const isResetting = teamMode ? isResettingTeam : isResettingAdmin;

    const [resetPass, setResetPass] = useState("");
    const [resetPassErr, setResetPassErr] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false);
    const [showResetPass, setShowResetPass] = useState(false);

    const validate = () => {
        const errors = {};
        const role = formData.role;

        if (!formData.name?.trim()) errors.name = "Name is required";

        if (!formData.phone?.trim()) {
            errors.phone = "Phone is required";
        } else if (!PHONE_REGEX.test(formData.phone.trim())) {
            errors.phone = "Enter a valid 10-digit Indian mobile number";
        }

        if (!teamMode && formData.password) {
            errors.password = "Use the Reset Password section below to change password";
        }

        if (!teamMode) {
            if (!role) errors.role = "Role is required";
            if (WH_ROLES.includes(role) && !formData.warehouse_id?.trim()) {
                errors.warehouse_id = "Warehouse is required for this role";
            }
            if (SHOP_ROLES.includes(role) && !formData.shop_id?.trim()) {
                errors.shop_id = "Shop is required for this role";
            }
        }

        return errors;
    };

    const handleUpdate = async () => {
        if (readOnly) return;

        dispatch(clearFormErrors());
        const errors = validate();
        if (Object.keys(errors).length > 0) {
            dispatch(setFormErrors(errors));
            return;
        }

        dispatch(setSubmitting(true));
        try {
            if (teamMode) {
                await updateTeamMember({
                    userId: selectedUser.user_id,
                    name: formData.name.trim(),
                    phone: formData.phone.trim(),
                    remarks: formData.remarks?.trim() || undefined,
                }).unwrap();
            } else {
                const role = formData.role;
                const payload = {
                    userId: selectedUser.user_id,
                    name: formData.name.trim(),
                    phone: formData.phone.trim(),
                    role,
                    remarks: formData.remarks?.trim() || undefined,
                };
                if (formData.password) payload.password = formData.password;
                if (WH_ROLES.includes(role)) payload.warehouse_id = formData.warehouse_id.trim();
                if (SHOP_ROLES.includes(role)) payload.shop_id = formData.shop_id.trim();
                await updateUser(payload).unwrap();
            }
            onSave();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const backendErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    backendErrors[field] = message;
                });
                dispatch(setFormErrors(backendErrors));
            } else {
                dispatch(setFormErrors({ general: err?.data?.message || "Failed to update user" }));
            }
        } finally {
            dispatch(setSubmitting(false));
        }
    };

    const handleStatusToggle = async () => {
        if (readOnly) return;
        const newStatus = !selectedUser.is_active;
        const label = newStatus ? "activate" : "deactivate";
        if (!window.confirm(`Are you sure you want to ${label} this user?`)) return;

        try {
            if (teamMode) {
                await patchTeamStatus({ userId: selectedUser.user_id, is_active: newStatus }).unwrap();
            } else {
                await patchStatus({ userId: selectedUser.user_id, is_active: newStatus }).unwrap();
            }
            onSave();
        } catch (err) {
            alert(err?.data?.message || `Failed to ${label} user`);
        }
    };

    const handleResetPassword = async () => {
        if (readOnly) return;
        setResetPassErr("");
        setResetSuccess(false);

        if (!resetPass) {
            setResetPassErr("New password is required");
            return;
        }
        if (!PASSWORD_REGEX.test(resetPass)) {
            setResetPassErr("Min 8 chars with uppercase, lowercase, digit, and special character");
            return;
        }

        try {
            if (teamMode) {
                await resetTeamPassword({ userId: selectedUser.user_id, new_password: resetPass }).unwrap();
            } else {
                await resetPassword({ userId: selectedUser.user_id, new_password: resetPass }).unwrap();
            }
            setResetPass("");
            setResetSuccess(true);
        } catch (err) {
            setResetPassErr(err?.data?.message || "Failed to reset password");
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">
                                {readOnly ? "View Team Member" : teamMode ? "Edit Team Member" : "Edit User"}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {selectedUser?.name} — {selectedUser?.role}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => dispatch(closeEditForm())}
                            className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    {formErrors?.general && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            <p className="text-sm text-red-600">{formErrors.general}</p>
                        </div>
                    )}

                    {readOnly && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
                            <p className="text-sm text-amber-700">
                                This account is view-only. You cannot edit managers or owners from Team Members.
                            </p>
                        </div>
                    )}

                    <UserFormBody
                        formData={formData}
                        onChange={(data) => dispatch(updateFormData(data))}
                        formErrors={formErrors}
                        isEdit
                        teamMode={teamMode}
                        teamContext={teamContext}
                        readOnly={readOnly}
                        lockRole={teamMode}
                    />

                    {!readOnly && (
                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => dispatch(closeEditForm())}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                            >
                                {isUpdating ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    )}

                    {!readOnly && (
                        <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Account Status</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Current:{" "}
                                        <span className={selectedUser?.is_active ? "text-green-600 font-medium" : "text-gray-400 font-medium"}>
                                            {selectedUser?.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleStatusToggle}
                                    disabled={isPatching}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-60 ${selectedUser?.is_active
                                        ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                                        : "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                                        }`}
                                >
                                    {isPatching
                                        ? "Updating…"
                                        : selectedUser?.is_active
                                            ? "Deactivate User"
                                            : "Activate User"}
                                </button>
                            </div>
                        </div>
                    )}

                    {!readOnly && (
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700">Reset Password</p>
                            {resetSuccess && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                                    <p className="text-sm text-green-600">Password reset successfully.</p>
                                </div>
                            )}
                            <div className="flex gap-3 items-start text-gray-700">
                                <div className="flex-1">
                                    <div className="relative">
                                        <input
                                            type={showResetPass ? "text" : "password"}
                                            value={resetPass}
                                            onChange={(e) => { setResetPass(e.target.value); setResetPassErr(""); setResetSuccess(false); }}
                                            placeholder="New password for this user"
                                            autoComplete="new-password"
                                            className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${resetPassErr ? "border-red-400" : "border-gray-300"
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPass((prev) => !prev)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label={showResetPass ? "Hide password" : "Show password"}
                                            tabIndex={-1}
                                        >
                                            {showResetPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {resetPassErr && <p className="text-xs text-red-500 mt-1">{resetPassErr}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    disabled={isResetting}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                                >
                                    {isResetting ? "Resetting…" : "Reset Password"}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">
                                This also revokes all active sessions for this user.
                            </p>
                        </div>
                    )}

                    {readOnly && (
                        <div className="flex justify-end pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => dispatch(closeEditForm())}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
