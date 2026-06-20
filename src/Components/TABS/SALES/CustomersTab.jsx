// TABS/SALES/CustomersTab.jsx
//
// Customer Management Tab - Full CRUD operations
// Separate from billing - for managing customer database
// FIXED: Added missing close modal imports

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, RefreshCw, Eye, Edit2, Trash2, X, User, Phone, Mail, MapPin, Building, CloudOff } from "lucide-react";
import { toast } from "../../shared/ToastConfig";
import {
    useDeleteCustomerMutation,
    useUpdateCustomerMutation,
    useCreateCustomerMutation,
} from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
import {
    setSearch,
    setLoyaltyFilter,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openViewModal,
    closeViewModal,
    updateAddForm,
    updateEditForm,
    setFormErrors,
    clearFormErrors,
} from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerSlice";
import IndianStatePicker from "../../shared/IndianStatePicker";
import { formatStateWithCode } from "../../../constants/indianStateCodes";
import { stateCodeFromGstin } from "../../../utils/billingPlaceOfSupply";
import {
    validateCustomerForm,
    buildCustomerSubmitPayload,
    hasCustomerFormErrors,
} from "../../../utils/customerForm.utils";
import { useOfflineCustomersPanel } from "../../../offline/hooks/useOfflineCustomersPanel";
import { createOfflineCustomer } from "../../../offline/billing/offlineCustomer.service";
import { getUserShopId } from "../../../offline/constants";
import { CUSTOMER_TYPES, getCustomerTypeLabel } from "../../../constants/customerTypes";

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const getLoyaltyBadge = (tier) => {
    switch (tier) {
        case "BRONZE":
            return "bg-amber-100 text-amber-700";
        case "SILVER":
            return "bg-gray-200 text-gray-700";
        case "GOLD":
            return "bg-yellow-100 text-yellow-700";
        default:
            return null;
    }
};

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function CustomersTab() {
    const dispatch = useDispatch();
    const { 
        search, 
        loyaltyFilter, 
        currentPage, 
        pageSize, 
        showAddModal, 
        showEditModal, 
        showViewModal, 
        selectedCustomer,
        addForm,
        editForm,
        formErrors,
    } = useSelector((state) => state.customer);
    const { user } = useSelector((state) => state.auth);
    const isOnline = useSelector((state) => state.offline.isOnline);
    const shopId = getUserShopId(user);
    
    const [deleteCustomer] = useDeleteCustomerMutation();
    const [updateCustomer] = useUpdateCustomerMutation();
    const [createCustomer, { isLoading: isOnlineCreating }] = useCreateCustomerMutation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        customers,
        meta,
        isLoading,
        isFetching,
        usingOfflineCache,
        refetch,
    } = useOfflineCustomersPanel(shopId, {
        currentPage,
        pageSize,
        search,
        loyaltyFilter,
    });

    const customersForTable = isOnline
        ? customers.filter((c) => {
            if (!search) return true;
            const term = search.toLowerCase();
            return c.name?.toLowerCase().includes(term) || c.mobile?.includes(term);
        })
        : customers;

    const filteredCustomers = customersForTable;

    const handleDelete = async (customer) => {
        if (customer.is_offline_pending) {
            toast.error("Cannot delete a customer that is still pending sync");
            return;
        }
        if (!isOnline) {
            toast.error("Connect to the internet to delete customers");
            return;
        }
        if (window.confirm(`Delete customer ${customer.name}? This will also delete all their bills.`)) {
            try {
                await deleteCustomer(customer.customer_id).unwrap();
                toast.success("Customer deleted successfully");
                refetch();
            } catch (err) {
                toast.error(err?.data?.message || "Failed to delete customer");
            }
        }
    };

    const handleCreateCustomer = async () => {
        const fieldErrors = validateCustomerForm(addForm);
        if (hasCustomerFormErrors(fieldErrors)) {
            dispatch(setFormErrors(fieldErrors));
            toast.error("Please fill all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = buildCustomerSubmitPayload(addForm);
            if (!isOnline) {
                await createOfflineCustomer({
                    user,
                    shopId,
                    data: payload,
                });
                toast.success("Customer saved offline — will sync when online");
            } else {
                await createCustomer(payload).unwrap();
                toast.success("Customer created successfully");
            }
            dispatch(closeAddModal());
            await refetch();
        } catch (err) {
            if (isOnline && err?.data?.errors?.length) {
                const fieldErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                dispatch(setFormErrors(fieldErrors));
                toast.error("Please fix the errors");
            } else {
                toast.error(err?.data?.message || err?.message || "Failed to create customer");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateCustomer = async () => {
        if (selectedCustomer?.is_offline_pending) {
            toast.error("Edit is not available until this customer syncs to the server");
            return;
        }
        if (!isOnline) {
            toast.error("Connect to the internet to update customers");
            return;
        }
        const fieldErrors = validateCustomerForm(editForm, { requireMobile: false });
        if (hasCustomerFormErrors(fieldErrors)) {
            dispatch(setFormErrors(fieldErrors));
            toast.error("Please fill all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const cleanedEdit = buildCustomerSubmitPayload(editForm, { isUpdate: true });
            await updateCustomer({
                customerId: selectedCustomer.customer_id,
                ...cleanedEdit,
            }).unwrap();
            toast.success("Customer updated successfully");
            dispatch(closeEditModal());
            refetch();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const fieldErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                dispatch(setFormErrors(fieldErrors));
                toast.error("Please fix the errors");
            } else {
                toast.error(err?.data?.message || "Failed to update customer");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefresh = () => {
        refetch();
        dispatch(resetFilters());
    };

    const isSaving = isSubmitting || (isOnline && isOnlineCreating);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Customers</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Manage customer database — view, edit, and track purchase history
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => dispatch(openAddModal())}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                    >
                        <Plus size={15} /> Add Customer
                    </button>
                    <button onClick={handleRefresh} className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 bg-white">
                        <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {!isOnline && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <CloudOff size={18} className="text-slate-500 shrink-0" />
                    <p className="text-sm text-slate-700">
                        Offline mode — showing cached customers. New customers save locally and sync when online. Edit and delete require internet.
                    </p>
                </div>
            )}

            {isOnline && usingOfflineCache && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <CloudOff size={16} className="text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                        Using offline customer catalog — server list unavailable. Cached customers are shown.
                    </p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Total Customers</p>
                    <p className="text-3xl font-bold text-gray-900">{meta.total}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Active</p>
                    <p className="text-3xl font-bold text-gray-900">{filteredCustomers.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Loyalty Gold</p>
                    <p className="text-3xl font-bold text-gray-900">{filteredCustomers.filter(c => c.loyalty_tier === "GOLD").length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-700">
                <div className="flex gap-3">
                    <input
                        value={search}
                        onChange={(e) => dispatch(setSearch(e.target.value))}
                        placeholder="Search by name or mobile..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                    <select
                        value={loyaltyFilter}
                        onChange={(e) => dispatch(setLoyaltyFilter(e.target.value))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">All Tiers</option>
                        <option value="BRONZE">Bronze</option>
                        <option value="SILVER">Silver</option>
                        <option value="GOLD">Gold</option>
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm ml-auto bg-white"
                    >
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Customers</p>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredCustomers.length} records</span>
                </div>
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Spent</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Purchase</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading && (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        )}
                        {!isLoading && filteredCustomers.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">No customers found</td>
                            </tr>
                        )}
                        {!isLoading && filteredCustomers.map((customer) => (
                            <tr key={customer.customer_id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                                            {customer.name?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 flex items-center gap-1.5 flex-wrap">
                                                {customer.name}
                                                {customer.is_offline_pending && (
                                                    <span className="text-[10px] uppercase font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                                        Pending sync
                                                    </span>
                                                )}
                                            </p>
                                            {customer.email && <p className="text-xs text-gray-400">{customer.email}</p>}
                                        </div>
                                    </div>
                                 </td>
                                <td className="px-5 py-3.5">
                                    <p className="text-sm text-gray-700">{customer.mobile}</p>
                                    {customer.city && <p className="text-xs text-gray-400">{customer.city}</p>}
                                 </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getLoyaltyBadge(customer.loyalty_tier)}`}>
                                        {customer.loyalty_tier}
                                    </span>
                                 </td>
                                <td className="px-5 py-3.5 text-right font-semibold text-gray-800">
                                    ₹{toNumber(customer.total_spent).toFixed(0)}
                                 </td>
                                <td className="px-5 py-3.5 text-center text-gray-600">
                                    {customer.total_orders || 0}
                                 </td>
                                <td className="px-5 py-3.5 text-xs text-gray-400">
                                    {fmtDate(customer.last_purchase)}
                                 </td>
                                <td className="px-5 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => dispatch(openViewModal(customer))}
                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            onClick={() => dispatch(openEditModal(customer))}
                                            disabled={customer.is_offline_pending || !isOnline}
                                            className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={customer.is_offline_pending ? "Sync pending" : "Edit"}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(customer)}
                                            disabled={customer.is_offline_pending || !isOnline}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={customer.is_offline_pending ? "Sync pending" : "Delete"}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                 </td>
                             </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-5 py-3">
                    <p className="text-sm text-gray-400">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}</p>
                    <div className="flex gap-2">
                        <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
                        <span className="px-3 py-1.5 text-sm text-gray-500">{currentPage} / {meta.totalPages}</span>
                        <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
                    </div>
                </div>
            )}

            {/* ============================================================
                ADD CUSTOMER MODAL
            ============================================================ */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">Add New Customer</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Create customer account</p>
                            </div>
                            <button onClick={() => dispatch(closeAddModal())} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 text-gray-700">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Customer Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => dispatch(updateAddForm({ customer_type: CUSTOMER_TYPES.GST }))}
                                        className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                                            addForm.customer_type === CUSTOMER_TYPES.GST
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-600 border-gray-200"
                                        }`}
                                    >
                                        GST Customer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => dispatch(updateAddForm({ customer_type: CUSTOMER_TYPES.WALK_IN }))}
                                        className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                                            addForm.customer_type === CUSTOMER_TYPES.WALK_IN
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-600 border-gray-200"
                                        }`}
                                    >
                                        Walk-in Customer
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Mobile Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={addForm.mobile}
                                    onChange={(e) => dispatch(updateAddForm({ mobile: e.target.value }))}
                                    placeholder="10-digit mobile number"
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                        formErrors.mobile ? "border-red-400" : "border-gray-200"
                                    }`}
                                />
                                {formErrors.mobile && <p className="text-xs text-red-500 mt-1">{formErrors.mobile}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={(e) => dispatch(updateAddForm({ name: e.target.value }))}
                                    placeholder="Full name"
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                        formErrors.name ? "border-red-400" : "border-gray-200"
                                    }`}
                                />
                                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={addForm.email}
                                    onChange={(e) => dispatch(updateAddForm({ email: e.target.value }))}
                                    placeholder="customer@example.com"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>
                            {addForm.customer_type === CUSTOMER_TYPES.GST && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Company Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={addForm.company_name}
                                            onChange={(e) => dispatch(updateAddForm({ company_name: e.target.value }))}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                formErrors.company_name ? "border-red-400" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.company_name && <p className="text-xs text-red-500 mt-1">{formErrors.company_name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            GST Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={addForm.gst_number}
                                            onChange={(e) => {
                                                const gst_number = e.target.value.toUpperCase();
                                                const patch = { gst_number };
                                                const fromGst = stateCodeFromGstin(gst_number);
                                                if (fromGst) patch.state_code = fromGst;
                                                dispatch(updateAddForm(patch));
                                            }}
                                            placeholder="22AAAAA0000A1Z"
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                formErrors.gst_number ? "border-red-400" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.gst_number && (
                                            <p className="text-xs text-red-500 mt-1">{formErrors.gst_number}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={addForm.address}
                                            onChange={(e) => dispatch(updateAddForm({ address: e.target.value }))}
                                            placeholder="Street address"
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                formErrors.address ? "border-red-400" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            City <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={addForm.city}
                                            onChange={(e) => dispatch(updateAddForm({ city: e.target.value }))}
                                            placeholder="City"
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                formErrors.city ? "border-red-400" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.city && <p className="text-xs text-red-500 mt-1">{formErrors.city}</p>}
                                    </div>
                                    <IndianStatePicker
                                        label="State"
                                        required
                                        value={addForm.state_code}
                                        onChange={(code) => dispatch(updateAddForm({ state_code: code }))}
                                        error={formErrors.state_code}
                                    />
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Pincode <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={addForm.pincode}
                                            onChange={(e) => dispatch(updateAddForm({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                                            placeholder="6-digit pincode"
                                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                formErrors.pincode ? "border-red-400" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.pincode && <p className="text-xs text-red-500 mt-1">{formErrors.pincode}</p>}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => dispatch(closeAddModal())} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                            <button
                                onClick={handleCreateCustomer}
                                disabled={isSaving}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                            >
                                {isSaving ? "Saving…" : isOnline ? "Create Customer" : "Save Offline"}
                            </button>
                        </div>
                    </div>
    </div>
</div>
            )}

            {/* ============================================================
                EDIT CUSTOMER MODAL
            ============================================================ */}
            {showEditModal && selectedCustomer && (
                <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">Edit Customer</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Update customer information</p>
                            </div>
                            <button onClick={() => dispatch(closeEditModal())} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Mobile Number
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.mobile}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400"
                                />
                                <p className="text-xs text-gray-400 mt-1">Mobile number cannot be changed</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => dispatch(updateEditForm({ name: e.target.value }))}
                                    placeholder="Full name"
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                        formErrors.name ? "border-red-400" : "border-gray-200"
                                    }`}
                                />
                                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => dispatch(updateEditForm({ email: e.target.value }))}
                                    placeholder="customer@example.com"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                                <input
                                    type="text"
                                    value={editForm.gst_number}
                                    onChange={(e) => {
                                        const gst_number = e.target.value;
                                        const patch = { gst_number };
                                        const fromGst = stateCodeFromGstin(gst_number);
                                        if (fromGst) patch.state_code = fromGst;
                                        dispatch(updateEditForm(patch));
                                    }}
                                    placeholder="22AAAAA0000A1Z"
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                        formErrors.gst_number ? "border-red-400" : "border-gray-200"
                                    }`}
                                />
                                {formErrors.gst_number && (
                                    <p className="text-xs text-red-500 mt-1">{formErrors.gst_number}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.address}
                                    onChange={(e) => dispatch(updateEditForm({ address: e.target.value }))}
                                    placeholder="Street address"
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                        formErrors.address ? "border-red-400" : "border-gray-200"
                                    }`}
                                />
                                {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    City <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.city}
                                    onChange={(e) => dispatch(updateEditForm({ city: e.target.value }))}
                                    placeholder="City"
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                        formErrors.city ? "border-red-400" : "border-gray-200"
                                    }`}
                                />
                                {formErrors.city && <p className="text-xs text-red-500 mt-1">{formErrors.city}</p>}
                            </div>
                            <IndianStatePicker
                                label="State"
                                required
                                value={editForm.state_code}
                                onChange={(code) => dispatch(updateEditForm({ state_code: code }))}
                                error={formErrors.state_code}
                            />
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Pincode <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={editForm.pincode}
                                    onChange={(e) => dispatch(updateEditForm({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                                    placeholder="6-digit pincode"
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                                        formErrors.pincode ? "border-red-400" : "border-gray-200"
                                    }`}
                                />
                                {formErrors.pincode && <p className="text-xs text-red-500 mt-1">{formErrors.pincode}</p>}
                            </div>
                        </div>
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                            <button onClick={() => dispatch(closeEditModal())} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                            <button
                                onClick={handleUpdateCustomer}
                                disabled={isSubmitting}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                            >
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
    </div>
</div>
            )}

            {/* View Customer Modal */}
            {showViewModal && selectedCustomer && (
                <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">Customer Details</h3>
                                <p className="text-xs text-gray-400">View customer information</p>
                            </div>
                            <button onClick={() => dispatch(closeViewModal())} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                                    {selectedCustomer.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">{selectedCustomer.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                            {getCustomerTypeLabel(selectedCustomer.customer_type)}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getLoyaltyBadge(selectedCustomer.loyalty_tier)}`}>
                                            {selectedCustomer.loyalty_tier}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone size={14} className="text-gray-400" />
                                    <span className="text-gray-700">{selectedCustomer.mobile}</span>
                                </div>
                                {selectedCustomer.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail size={14} className="text-gray-400" />
                                        <span className="text-gray-700">{selectedCustomer.email}</span>
                                    </div>
                                )}
                                {selectedCustomer.gst_number && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Building size={14} className="text-gray-400" />
                                        <span className="text-gray-700">GST: {selectedCustomer.gst_number}</span>
                                    </div>
                                )}
                                {(selectedCustomer.address || selectedCustomer.city) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="text-gray-700">
                                            {[selectedCustomer.address, selectedCustomer.city].filter(Boolean).join(", ")}
                                        </span>
                                    </div>
                                )}
                                {selectedCustomer.state_code && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="text-gray-700">
                                            State: {formatStateWithCode(selectedCustomer.state_code)}
                                            {selectedCustomer.pincode ? ` · Pincode: ${selectedCustomer.pincode}` : ""}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 mt-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total Spend:</span>
                                    <span className="font-bold">₹{toNumber(selectedCustomer.total_spent).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-500">Total Orders:</span>
                                    <span className="font-bold">{selectedCustomer.total_orders || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-500">Last Purchase:</span>
                                    <span className="text-gray-700">{fmtDate(selectedCustomer.last_purchase)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
                            <button onClick={() => dispatch(closeViewModal())} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Close</button>
                        </div>
                    </div>
    </div>
</div>
            )}
        </div>
    );
}

// down code is working but upper code have updated ui 
// // TABS/SALES/CustomersTab.jsx
// //
// // Customer Management Tab - Full CRUD operations
// // Separate from billing - for managing customer database
// // FIXED: Added missing close modal imports

// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { Plus, RefreshCw, Eye, Edit2, Trash2, X, User, Phone, Mail, MapPin, Building } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//     useGetCustomersQuery,
//     useDeleteCustomerMutation,
//     useUpdateCustomerMutation,
//     useCreateCustomerMutation,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
// import {
//     setSearch,
//     setLoyaltyFilter,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openAddModal,
//     closeAddModal,
//     openEditModal,
//     closeEditModal,
//     openViewModal,
//     closeViewModal,
//     updateAddForm,
//     updateEditForm,
//     setFormErrors,
//     clearFormErrors,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerSlice";

// const toNumber = (value, defaultValue = 0) => {
//     const num = Number(value);
//     return isNaN(num) ? defaultValue : num;
// };

// const getLoyaltyBadge = (tier) => {
//     switch (tier) {
//         case "BRONZE":
//             return "bg-amber-100 text-amber-700";
//         case "SILVER":
//             return "bg-gray-200 text-gray-700";
//         case "GOLD":
//             return "bg-yellow-100 text-yellow-700";
//         default:
//             return null;
//     }
// };

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// export default function CustomersTab() {
//     const dispatch = useDispatch();
//     const { 
//         search, 
//         loyaltyFilter, 
//         currentPage, 
//         pageSize, 
//         showAddModal, 
//         showEditModal, 
//         showViewModal, 
//         selectedCustomer,
//         addForm,
//         editForm,
//         formErrors,
//     } = useSelector((state) => state.customer);
    
//     const [deleteCustomer] = useDeleteCustomerMutation();
//     const [updateCustomer] = useUpdateCustomerMutation();
//     const [createCustomer] = useCreateCustomerMutation();
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const { data, isLoading, refetch } = useGetCustomersQuery({
//         page: currentPage,
//         limit: pageSize,
//         loyalty_tier: loyaltyFilter,
//     });

//     const customers = data?.customers || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

//     // Filter customers client-side by search
//     const filteredCustomers = customers.filter(c => {
//         if (!search) return true;
//         const term = search.toLowerCase();
//         return c.name?.toLowerCase().includes(term) || c.mobile?.includes(term);
//     });

//     const handleDelete = async (customer) => {
//         if (window.confirm(`Delete customer ${customer.name}? This will also delete all their bills.`)) {
//             try {
//                 await deleteCustomer(customer.customer_id).unwrap();
//                 toast.success("Customer deleted successfully");
//                 refetch();
//             } catch (err) {
//                 toast.error(err?.data?.message || "Failed to delete customer");
//             }
//         }
//     };

//     const handleCreateCustomer = async () => {
//         if (!addForm.mobile) {
//             dispatch(setFormErrors({ mobile: "Mobile number is required" }));
//             toast.error("Mobile number is required");
//             return;
//         }
//         if (addForm.mobile.length !== 10) {
//             dispatch(setFormErrors({ mobile: "Mobile number must be 10 digits" }));
//             toast.error("Mobile number must be 10 digits");
//             return;
//         }
//         if (!addForm.name) {
//             dispatch(setFormErrors({ name: "Customer name is required" }));
//             toast.error("Customer name is required");
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             await createCustomer(addForm).unwrap();
//             toast.success("Customer created successfully");
//             dispatch(closeAddModal());
//             refetch();
//         } catch (err) {
//             if (err?.data?.errors?.length) {
//                 const fieldErrors = {};
//                 err.data.errors.forEach(({ field, message }) => {
//                     fieldErrors[field] = message;
//                 });
//                 dispatch(setFormErrors(fieldErrors));
//                 toast.error("Please fix the errors");
//             } else {
//                 toast.error(err?.data?.message || "Failed to create customer");
//             }
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleUpdateCustomer = async () => {
//         if (!editForm.name) {
//             dispatch(setFormErrors({ name: "Customer name is required" }));
//             toast.error("Customer name is required");
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             await updateCustomer({
//                 customerId: selectedCustomer.customer_id,
//                 ...editForm,
//             }).unwrap();
//             toast.success("Customer updated successfully");
//             dispatch(closeEditModal());
//             refetch();
//         } catch (err) {
//             if (err?.data?.errors?.length) {
//                 const fieldErrors = {};
//                 err.data.errors.forEach(({ field, message }) => {
//                     fieldErrors[field] = message;
//                 });
//                 dispatch(setFormErrors(fieldErrors));
//                 toast.error("Please fix the errors");
//             } else {
//                 toast.error(err?.data?.message || "Failed to update customer");
//             }
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleRefresh = () => {
//         refetch();
//         dispatch(resetFilters());
//     };

//     return (
//         <div className="space-y-5">
//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//                 <div>
//                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Customers</h2>
//                     <p className="text-sm text-gray-500 mt-1">
//                         Manage customer database — view, edit, and track purchase history
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2.5">
//                     <button
//                         onClick={() => dispatch(openAddModal())}
//                         className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
//                     >
//                         <Plus size={16} /> Add Customer
//                     </button>
//                     <button onClick={handleRefresh} className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-1">
//                         <RefreshCw size={14} /> Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Stats */}
//             <div className="grid grid-cols-3 gap-4">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Total Customers</p>
//                     <p className="text-3xl font-bold">{meta.total}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Active</p>
//                     <p className="text-3xl font-bold">{customers.length}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Loyalty Gold</p>
//                     <p className="text-3xl font-bold">{customers.filter(c => c.loyalty_tier === "GOLD").length}</p>
//                 </div>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-gray-700">
//                 <div className="flex gap-3">
//                     <input
//                         value={search}
//                         onChange={(e) => dispatch(setSearch(e.target.value))}
//                         placeholder="Search by name or mobile..."
//                         className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
//                     />
//                     <select
//                         value={loyaltyFilter}
//                         onChange={(e) => dispatch(setLoyaltyFilter(e.target.value))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                     >
//                         <option value="">All Tiers</option>
//                         <option value="BRONZE">Bronze</option>
//                         <option value="SILVER">Silver</option>
//                         <option value="GOLD">Gold</option>
//                     </select>
//                     <select
//                         value={pageSize}
//                         onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm ml-auto"
//                     >
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Customers Table */}
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Contact</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Tier</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total Spent</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Orders</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Last Purchase</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {isLoading && (
//                             <tr>
//                                 <td colSpan={7} className="px-4 py-10 text-center">
//                                     <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && filteredCustomers.length === 0 && (
//                             <tr>
//                                 <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No customers found</td>
//                             </tr>
//                         )}
//                         {!isLoading && filteredCustomers.map((customer) => (
//                             <tr key={customer.customer_id} className="hover:bg-gray-50">
//                                 <td className="px-4 py-3">
//                                     <div className="flex items-center gap-2">
//                                         <User size={16} className="text-gray-400" />
//                                         <div>
//                                             <p className="font-medium text-gray-800">{customer.name}</p>
//                                             {customer.email && <p className="text-xs text-gray-400">{customer.email}</p>}
//                                         </div>
//                                     </div>
//                                  </td>
//                                 <td className="px-4 py-3">
//                                     <p className="text-sm text-gray-700">{customer.mobile}</p>
//                                     {customer.city && <p className="text-xs text-gray-400">{customer.city}</p>}
//                                  </td>
//                                 <td className="px-4 py-3 text-center">
//                                     <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLoyaltyBadge(customer.loyalty_tier)}`}>
//                                         {customer.loyalty_tier}
//                                     </span>
//                                  </td>
//                                 <td className="px-4 py-3 text-right font-semibold text-gray-800">
//                                     ₹{toNumber(customer.total_spent).toFixed(0)}
//                                  </td>
//                                 <td className="px-4 py-3 text-center text-gray-600">
//                                     {customer.total_orders || 0}
//                                  </td>
//                                 <td className="px-4 py-3 text-xs text-gray-400">
//                                     {fmtDate(customer.last_purchase)}
//                                  </td>
//                                 <td className="px-4 py-3 text-center">
//                                     <div className="flex items-center justify-center gap-1">
//                                         <button
//                                             onClick={() => dispatch(openViewModal(customer))}
//                                             className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
//                                             title="View Details"
//                                         >
//                                             <Eye size={14} />
//                                         </button>
//                                         <button
//                                             onClick={() => dispatch(openEditModal(customer))}
//                                             className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"
//                                             title="Edit"
//                                         >
//                                             <Edit2 size={14} />
//                                         </button>
//                                         <button
//                                             onClick={() => handleDelete(customer)}
//                                             className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
//                                             title="Delete"
//                                         >
//                                             <Trash2 size={14} />
//                                         </button>
//                                     </div>
//                                  </td>
//                              </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Pagination */}
//             {meta.totalPages > 1 && (
//                 <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//                     <p className="text-sm text-gray-500">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}</p>
//                     <div className="flex gap-2">
//                         <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
//                         <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
//                         <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
//                     </div>
//                 </div>
//             )}

//             {/* ============================================================
//                 ADD CUSTOMER MODAL
//             ============================================================ */}
//             {showAddModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
//                         <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
//                             <div>
//                                 <h3 className="text-base font-semibold text-gray-800">Add New Customer</h3>
//                                 <p className="text-xs text-gray-400 mt-0.5">Create customer account</p>
//                             </div>
//                             <button onClick={() => dispatch(closeAddModal())} className="text-gray-400 hover:text-gray-600">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="p-6 space-y-4">
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">
//                                     Mobile Number <span className="text-red-500">*</span>
//                                 </label>
//                                 <input
//                                     type="tel"
//                                     value={addForm.mobile}
//                                     onChange={(e) => dispatch(updateAddForm({ mobile: e.target.value }))}
//                                     placeholder="10-digit mobile number"
//                                     className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//                                         formErrors.mobile ? "border-red-400" : "border-gray-300"
//                                     }`}
//                                 />
//                                 {formErrors.mobile && <p className="text-xs text-red-500 mt-1">{formErrors.mobile}</p>}
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">
//                                     Customer Name <span className="text-red-500">*</span>
//                                 </label>
//                                 <input
//                                     type="text"
//                                     value={addForm.name}
//                                     onChange={(e) => dispatch(updateAddForm({ name: e.target.value }))}
//                                     placeholder="Full name"
//                                     className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//                                         formErrors.name ? "border-red-400" : "border-gray-300"
//                                     }`}
//                                 />
//                                 {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
//                                 <input
//                                     type="email"
//                                     value={addForm.email}
//                                     onChange={(e) => dispatch(updateAddForm({ email: e.target.value }))}
//                                     placeholder="customer@example.com"
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">GST Number (Optional)</label>
//                                 <input
//                                     type="text"
//                                     value={addForm.gst_number}
//                                     onChange={(e) => dispatch(updateAddForm({ gst_number: e.target.value }))}
//                                     placeholder="22AAAAA0000A1Z"
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                 />
//                             </div>
//                             <div className="grid grid-cols-2 gap-3">
//                                 <div>
//                                     <label className="block text-xs font-medium text-gray-700 mb-1">Address (Optional)</label>
//                                     <input
//                                         type="text"
//                                         value={addForm.address}
//                                         onChange={(e) => dispatch(updateAddForm({ address: e.target.value }))}
//                                         placeholder="Street address"
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="block text-xs font-medium text-gray-700 mb-1">City (Optional)</label>
//                                     <input
//                                         type="text"
//                                         value={addForm.city}
//                                         onChange={(e) => dispatch(updateAddForm({ city: e.target.value }))}
//                                         placeholder="City"
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                     />
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
//                             <button onClick={() => dispatch(closeAddModal())} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
//                             <button
//                                 onClick={handleCreateCustomer}
//                                 disabled={isSubmitting}
//                                 className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
//                             >
//                                 {isSubmitting ? "Creating..." : "Create Customer"}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* ============================================================
//                 EDIT CUSTOMER MODAL
//             ============================================================ */}
//             {showEditModal && selectedCustomer && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-gray-700">
//                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
//                         <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
//                             <div>
//                                 <h3 className="text-base font-semibold text-gray-800">Edit Customer</h3>
//                                 <p className="text-xs text-gray-400 mt-0.5">Update customer information</p>
//                             </div>
//                             <button onClick={() => dispatch(closeEditModal())} className="text-gray-400 hover:text-gray-600">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="p-6 space-y-4">
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">
//                                     Mobile Number
//                                 </label>
//                                 <input
//                                     type="tel"
//                                     value={editForm.mobile}
//                                     disabled
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
//                                 />
//                                 <p className="text-xs text-gray-400 mt-1">Mobile number cannot be changed</p>
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">
//                                     Customer Name <span className="text-red-500">*</span>
//                                 </label>
//                                 <input
//                                     type="text"
//                                     value={editForm.name}
//                                     onChange={(e) => dispatch(updateEditForm({ name: e.target.value }))}
//                                     placeholder="Full name"
//                                     className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//                                         formErrors.name ? "border-red-400" : "border-gray-300"
//                                     }`}
//                                 />
//                                 {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
//                                 <input
//                                     type="email"
//                                     value={editForm.email}
//                                     onChange={(e) => dispatch(updateEditForm({ email: e.target.value }))}
//                                     placeholder="customer@example.com"
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-medium text-gray-700 mb-1">GST Number (Optional)</label>
//                                 <input
//                                     type="text"
//                                     value={editForm.gst_number}
//                                     onChange={(e) => dispatch(updateEditForm({ gst_number: e.target.value }))}
//                                     placeholder="22AAAAA0000A1Z"
//                                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                 />
//                             </div>
//                             <div className="grid grid-cols-2 gap-3">
//                                 <div>
//                                     <label className="block text-xs font-medium text-gray-700 mb-1">Address (Optional)</label>
//                                     <input
//                                         type="text"
//                                         value={editForm.address}
//                                         onChange={(e) => dispatch(updateEditForm({ address: e.target.value }))}
//                                         placeholder="Street address"
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="block text-xs font-medium text-gray-700 mb-1">City (Optional)</label>
//                                     <input
//                                         type="text"
//                                         value={editForm.city}
//                                         onChange={(e) => dispatch(updateEditForm({ city: e.target.value }))}
//                                         placeholder="City"
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                     />
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
//                             <button onClick={() => dispatch(closeEditModal())} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
//                             <button
//                                 onClick={handleUpdateCustomer}
//                                 disabled={isSubmitting}
//                                 className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
//                             >
//                                 {isSubmitting ? "Saving..." : "Save Changes"}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* View Customer Modal */}
//             {showViewModal && selectedCustomer && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-gray-700">
//                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
//                         <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
//                             <div>
//                                 <h3 className="text-base font-semibold text-gray-800">Customer Details</h3>
//                                 <p className="text-xs text-gray-400">View customer information</p>
//                             </div>
//                             <button onClick={() => dispatch(closeViewModal())} className="text-gray-400 hover:text-gray-600">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="p-6 space-y-4">
//                             <div className="flex items-center gap-3 pb-3 border-b">
//                                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
//                                     {selectedCustomer.name?.charAt(0) || "U"}
//                                 </div>
//                                 <div>
//                                     <p className="font-bold text-gray-800">{selectedCustomer.name}</p>
//                                     <span className={`text-xs px-2 py-0.5 rounded-full ${getLoyaltyBadge(selectedCustomer.loyalty_tier)}`}>
//                                         {selectedCustomer.loyalty_tier}
//                                     </span>
//                                 </div>
//                             </div>
//                             <div className="space-y-2">
//                                 <div className="flex items-center gap-2 text-sm">
//                                     <Phone size={14} className="text-gray-400" />
//                                     <span className="text-gray-700">{selectedCustomer.mobile}</span>
//                                 </div>
//                                 {selectedCustomer.email && (
//                                     <div className="flex items-center gap-2 text-sm">
//                                         <Mail size={14} className="text-gray-400" />
//                                         <span className="text-gray-700">{selectedCustomer.email}</span>
//                                     </div>
//                                 )}
//                                 {selectedCustomer.gst_number && (
//                                     <div className="flex items-center gap-2 text-sm">
//                                         <Building size={14} className="text-gray-400" />
//                                         <span className="text-gray-700">GST: {selectedCustomer.gst_number}</span>
//                                     </div>
//                                 )}
//                                 {(selectedCustomer.address || selectedCustomer.city) && (
//                                     <div className="flex items-center gap-2 text-sm">
//                                         <MapPin size={14} className="text-gray-400" />
//                                         <span className="text-gray-700">{selectedCustomer.address}, {selectedCustomer.city}</span>
//                                     </div>
//                                 )}
//                             </div>
//                             <div className="bg-gray-50 rounded-lg p-3 mt-2">
//                                 <div className="flex justify-between text-sm">
//                                     <span className="text-gray-500">Total Spend:</span>
//                                     <span className="font-bold">₹{toNumber(selectedCustomer.total_spent).toFixed(2)}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm mt-1">
//                                     <span className="text-gray-500">Total Orders:</span>
//                                     <span className="font-bold">{selectedCustomer.total_orders || 0}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm mt-1">
//                                     <span className="text-gray-500">Last Purchase:</span>
//                                     <span className="text-gray-700">{fmtDate(selectedCustomer.last_purchase)}</span>
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
//                             <button onClick={() => dispatch(closeViewModal())} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Close</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// // TABS/SALES/CustomersTab.jsx
// //
// // Customer Management Tab - Full CRUD operations
// // Separate from billing - for managing customer database

// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { Plus, RefreshCw, Eye, Edit2, Trash2, X, User, Phone, Mail, MapPin, Building } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//     useGetCustomersQuery,
//     useDeleteCustomerMutation,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
// import {
//     setSearch,
//     setLoyaltyFilter,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openAddModal,
//     openEditModal,
//     openViewModal,
//     setFormErrors,
//     clearFormErrors,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerSlice";
// import CreateCustomerModal from "./BillingTab_Compo/CreateCustomerModal";

// const toNumber = (value, defaultValue = 0) => {
//     const num = Number(value);
//     return isNaN(num) ? defaultValue : num;
// };

// const getLoyaltyBadge = (tier) => {
//     switch (tier) {
//         case "BRONZE":
//             return "bg-amber-100 text-amber-700";
//         case "SILVER":
//             return "bg-gray-200 text-gray-700";
//         case "GOLD":
//             return "bg-yellow-100 text-yellow-700";
//         default:
//             return "bg-gray-100 text-gray-600";
//     }
// };

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// export default function CustomersTab() {
//     const dispatch = useDispatch();
//     const { search, loyaltyFilter, currentPage, pageSize, showAddModal, showEditModal, showViewModal, selectedCustomer } = useSelector((state) => state.customer);
    
//     const [deleteCustomer] = useDeleteCustomerMutation();

//     const { data, isLoading, refetch } = useGetCustomersQuery({
//         page: currentPage,
//         limit: pageSize,
//         loyalty_tier: loyaltyFilter,
//     });

//     const customers = data?.customers || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

//     // Filter customers client-side by search
//     const filteredCustomers = customers.filter(c => {
//         if (!search) return true;
//         const term = search.toLowerCase();
//         return c.name?.toLowerCase().includes(term) || c.mobile?.includes(term);
//     });

//     const handleDelete = async (customer) => {
//         if (window.confirm(`Delete customer ${customer.name}? This will also delete all their bills.`)) {
//             try {
//                 await deleteCustomer(customer.customer_id).unwrap();
//                 toast.success("Customer deleted successfully");
//                 refetch();
//             } catch (err) {
//                 toast.error(err?.data?.message || "Failed to delete customer");
//             }
//         }
//     };

//     const handleRefresh = () => {
//         refetch();
//         dispatch(resetFilters());
//     };

//     return (
//         <div className="space-y-5">
//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//                 <div>
//                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Customers</h2>
//                     <p className="text-sm text-gray-500 mt-1">
//                         Manage customer database — view, edit, and track purchase history
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2.5">
//                     <button
//                         onClick={() => dispatch(openAddModal())}
//                         className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
//                     >
//                         <Plus size={16} /> Add Customer
//                     </button>
//                     <button onClick={handleRefresh} className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-1">
//                         <RefreshCw size={14} /> Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Stats */}
//             <div className="grid grid-cols-3 gap-4">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Total Customers</p>
//                     <p className="text-3xl font-bold">{meta.total}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Active</p>
//                     <p className="text-3xl font-bold">{customers.length}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Loyalty Gold</p>
//                     <p className="text-3xl font-bold">{customers.filter(c => c.loyalty_tier === "GOLD").length}</p>
//                 </div>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
//                 <div className="flex gap-3">
//                     <input
//                         value={search}
//                         onChange={(e) => dispatch(setSearch(e.target.value))}
//                         placeholder="Search by name or mobile..."
//                         className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
//                     />
//                     <select
//                         value={loyaltyFilter}
//                         onChange={(e) => dispatch(setLoyaltyFilter(e.target.value))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                     >
//                         <option value="">All Tiers</option>
//                         <option value="BRONZE">Bronze</option>
//                         <option value="SILVER">Silver</option>
//                         <option value="GOLD">Gold</option>
//                     </select>
//                     <select
//                         value={pageSize}
//                         onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm ml-auto"
//                     >
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Customers Table */}
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Contact</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Tier</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total Spent</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Orders</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Last Purchase</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {isLoading && (
//                             <tr>
//                                 <td colSpan={7} className="px-4 py-10 text-center">
//                                     <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && filteredCustomers.length === 0 && (
//                             <tr>
//                                 <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No customers found</td>
//                             </tr>
//                         )}
//                         {!isLoading && filteredCustomers.map((customer) => (
//                             <tr key={customer.customer_id} className="hover:bg-gray-50">
//                                 <td className="px-4 py-3">
//                                     <div className="flex items-center gap-2">
//                                         <User size={16} className="text-gray-400" />
//                                         <div>
//                                             <p className="font-medium text-gray-800">{customer.name}</p>
//                                             {customer.email && <p className="text-xs text-gray-400">{customer.email}</p>}
//                                         </div>
//                                     </div>
//                                 </td>
//                                 <td className="px-4 py-3">
//                                     <p className="text-sm text-gray-700">{customer.mobile}</p>
//                                     {customer.city && <p className="text-xs text-gray-400">{customer.city}</p>}
//                                 </td>
//                                 <td className="px-4 py-3 text-center">
//                                     <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLoyaltyBadge(customer.loyalty_tier)}`}>
//                                         {customer.loyalty_tier || "BRONZE"}
//                                     </span>
//                                 </td>
//                                 <td className="px-4 py-3 text-right font-semibold text-gray-800">
//                                     ₹{toNumber(customer.total_spent).toFixed(0)}
//                                 </td>
//                                 <td className="px-4 py-3 text-center text-gray-600">
//                                     {customer.total_orders || 0}
//                                 </td>
//                                 <td className="px-4 py-3 text-xs text-gray-400">
//                                     {fmtDate(customer.last_purchase)}
//                                 </td>
//                                 <td className="px-4 py-3 text-center">
//                                     <div className="flex items-center justify-center gap-1">
//                                         <button
//                                             onClick={() => dispatch(openViewModal(customer))}
//                                             className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
//                                             title="View Details"
//                                         >
//                                             <Eye size={14} />
//                                         </button>
//                                         <button
//                                             onClick={() => dispatch(openEditModal(customer))}
//                                             className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"
//                                             title="Edit"
//                                         >
//                                             <Edit2 size={14} />
//                                         </button>
//                                         <button
//                                             onClick={() => handleDelete(customer)}
//                                             className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
//                                             title="Delete"
//                                         >
//                                             <Trash2 size={14} />
//                                         </button>
//                                     </div>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>

//             {/* Pagination */}
//             {meta.totalPages > 1 && (
//                 <div className="flex justify-between items-center bg-white rounded-xl border border-gray-200 px-4 py-3">
//                     <p className="text-sm text-gray-500">Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}</p>
//                     <div className="flex gap-2">
//                         <button onClick={() => dispatch(setCurrentPage(currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
//                         <span className="px-3 py-1 text-sm text-gray-600">{currentPage} / {meta.totalPages}</span>
//                         <button onClick={() => dispatch(setCurrentPage(currentPage + 1))} disabled={currentPage === meta.totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
//                     </div>
//                 </div>
//             )}

//             {/* Create/Edit Customer Modal (reuse same component) */}
//             {showAddModal && <CreateCustomerModal onSuccess={() => { refetch(); dispatch(closeAddModal()); }} />}
            
//             {/* View Customer Modal */}
//             {showViewModal && selectedCustomer && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
//                         <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
//                             <div>
//                                 <h3 className="text-base font-semibold text-gray-800">Customer Details</h3>
//                                 <p className="text-xs text-gray-400">View customer information</p>
//                             </div>
//                             <button onClick={() => dispatch(closeViewModal())} className="text-gray-400 hover:text-gray-600">
//                                 <X size={20} />
//                             </button>
//                         </div>
//                         <div className="p-6 space-y-4">
//                             <div className="flex items-center gap-3 pb-3 border-b">
//                                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">
//                                     {selectedCustomer.name?.charAt(0) || "U"}
//                                 </div>
//                                 <div>
//                                     <p className="font-bold text-gray-800">{selectedCustomer.name}</p>
//                                     <span className={`text-xs px-2 py-0.5 rounded-full ${getLoyaltyBadge(selectedCustomer.loyalty_tier)}`}>
//                                         {selectedCustomer.loyalty_tier || "BRONZE"}
//                                     </span>
//                                 </div>
//                             </div>
//                             <div className="space-y-2">
//                                 <div className="flex items-center gap-2 text-sm">
//                                     <Phone size={14} className="text-gray-400" />
//                                     <span className="text-gray-700">{selectedCustomer.mobile}</span>
//                                 </div>
//                                 {selectedCustomer.email && (
//                                     <div className="flex items-center gap-2 text-sm">
//                                         <Mail size={14} className="text-gray-400" />
//                                         <span className="text-gray-700">{selectedCustomer.email}</span>
//                                     </div>
//                                 )}
//                                 {selectedCustomer.gst_number && (
//                                     <div className="flex items-center gap-2 text-sm">
//                                         <Building size={14} className="text-gray-400" />
//                                         <span className="text-gray-700">GST: {selectedCustomer.gst_number}</span>
//                                     </div>
//                                 )}
//                                 {(selectedCustomer.address || selectedCustomer.city) && (
//                                     <div className="flex items-center gap-2 text-sm">
//                                         <MapPin size={14} className="text-gray-400" />
//                                         <span className="text-gray-700">{selectedCustomer.address}, {selectedCustomer.city}</span>
//                                     </div>
//                                 )}
//                             </div>
//                             <div className="bg-gray-50 rounded-lg p-3 mt-2">
//                                 <div className="flex justify-between text-sm">
//                                     <span className="text-gray-500">Total Spend:</span>
//                                     <span className="font-bold">₹{toNumber(selectedCustomer.total_spent).toFixed(2)}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm mt-1">
//                                     <span className="text-gray-500">Total Orders:</span>
//                                     <span className="font-bold">{selectedCustomer.total_orders || 0}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm mt-1">
//                                     <span className="text-gray-500">Last Purchase:</span>
//                                     <span className="text-gray-700">{fmtDate(selectedCustomer.last_purchase)}</span>
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
//                             <button onClick={() => dispatch(closeViewModal())} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Close</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }