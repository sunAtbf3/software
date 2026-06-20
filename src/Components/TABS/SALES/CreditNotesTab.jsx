

// TABS/SALES/CreditNotesTab.jsx
//
// Credit Notes Management - Full CRUD operations
// FIXED: Added missing close modal actions, fixed amount fields, fixed customer display

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RefreshCw, Eye, CreditCard, Receipt, Ban, X, Plus, Search, User } from "lucide-react";
import { toast } from "../../shared/ToastConfig";
import {
    useGetCreditNotesQuery,
    useRedeemCreditNoteMutation,
    useRefundCreditNoteMutation,
    useCancelCreditNoteMutation,
    useCreateCreditNoteMutation,
} from "../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";
import { useLazySearchCustomersQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
import { normalizeCustomerSearchResults } from "../../../utils/customerForm.utils";
import { useGetBillsQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
import {
    setStatusFilter,
    setFromDate,
    setToDate,
    setCurrentPage,
    setPageSize,
    resetFilters,
    openViewModal,
    closeViewModal,
    openRedeemModal,
    closeRedeemModal,
    openRefundModal,
    closeRefundModal,
    openCancelModal,
    closeCancelModal,
    setActionErrors,
    clearActionErrors,
} from "../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteSlice";
import CreditNoteViewModal from "./CreditNoteShared/CreditNoteViewModal";
import RedeemCreditNoteModal from "./CreditNoteShared/RedeemCreditNoteModal";
import RefundCreditNoteModal from "./CreditNoteShared/RefundCreditNoteModal";
import CancelCreditNoteModal from "./CreditNoteShared/CancelCreditNoteModal";
import CreateCreditNoteModal from "./CreditNoteShared/CreateCreditNoteModal";

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const STATUS_BADGE = {
    ACTIVE: "bg-green-100 text-green-700",
    PARTIALLY_REDEEMED: "bg-blue-100 text-blue-700",
    REDEEMED: "bg-purple-100 text-purple-700",
    PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
    REFUNDED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-600",
};

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function CreditNotesTab() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { statusFilter, fromDate, toDate, currentPage, pageSize, showViewModal, showRedeemModal, showRefundModal, showCancelModal, selectedCreditNote } = useSelector((state) => state.creditNote);

    const userShopId = user?.shop_id || "";
    const userRole = user?.role || "";
    const isSuperAdmin = userRole === "SUPER_ADMIN";
    const canCreate = userRole === "SHOP_OWNER" || userRole === "BILLING_STAFF" || isSuperAdmin;

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchMobile, setSearchMobile] = useState("");
    const [selectedCustomerForCreate, setSelectedCustomerForCreate] = useState(null);
    const [selectedBillForCreate, setSelectedBillForCreate] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [reason, setReason] = useState("");
    const [restoreStock, setRestoreStock] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [triggerSearchCustomers, { data: searchResults, isLoading: isSearching }] = useLazySearchCustomersQuery();
    const [createCreditNote] = useCreateCreditNoteMutation();

    const { data: billsData } = useGetBillsQuery({
        page: 1,
        limit: 50,
        shop_id: userShopId,
    }, { skip: !selectedCustomerForCreate });

    const bills = billsData?.bills || [];
    const customers = normalizeCustomerSearchResults(searchResults);

    const handleSearchCustomer = () => {
        if (searchMobile.length === 10) {
            triggerSearchCustomers({ mobile: searchMobile });
        } else {
            toast.error("Enter 10-digit mobile number");
        }
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomerForCreate(customer);
        setSearchMobile("");
        setSelectedBillForCreate(null);
        setSelectedItems([]);
    };

    const handleSelectBill = (bill) => {
        setSelectedBillForCreate(bill);
        const initialItems = bill.items?.map(item => ({
            variant_id: item.variant_id,
            product_name: item.variant?.product?.name || item.product?.name,
            quantity: item.quantity,
            max_quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
        })) || [];
        setSelectedItems(initialItems);
    };

    const handleUpdateItemQuantity = (variantId, newQuantity) => {
        setSelectedItems(prev => prev.map(item =>
            item.variant_id === variantId
                ? { ...item, quantity: Math.min(newQuantity, item.max_quantity) }
                : item
        ));
    };

    const handleCreateCreditNote = async () => {
        if (!selectedBillForCreate) {
            toast.error("Please select a bill");
            return;
        }
        const itemsToReturn = selectedItems.filter(item => item.quantity > 0);
        if (itemsToReturn.length === 0) {
            toast.error("Please select at least one item to return");
            return;
        }
        if (!reason.trim()) {
            toast.error("Please enter a reason for return");
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await createCreditNote({
                idempotencyKey: `cn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                original_bill_id: selectedBillForCreate.bill_id,
                items: itemsToReturn.map(item => ({
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                })),
                reason: reason.trim(),
                restore_stock: restoreStock,
            }).unwrap();
            toast.success(`Credit note ${result.credit_note_number} created successfully`);
            setShowCreateModal(false);
            setSelectedCustomerForCreate(null);
            setSelectedBillForCreate(null);
            setSelectedItems([]);
            setReason("");
            setSearchMobile("");
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to create credit note");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [redeemCreditNote] = useRedeemCreditNoteMutation();
    const [refundCreditNote] = useRefundCreditNoteMutation();
    const [cancelCreditNote] = useCancelCreditNoteMutation();

    const { data, isLoading, refetch } = useGetCreditNotesQuery({
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        shop_id: userShopId,
        from_date: fromDate,
        to_date: toDate,
    });

    const creditNotes = data?.creditNotes || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const handleRefresh = () => {
        refetch();
        dispatch(resetFilters());
    };

    const handleRedeem = async (creditNoteId, redeemData) => {
        try {
            await redeemCreditNote({
                creditNoteId,
                idempotencyKey: `redeem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...redeemData,
            }).unwrap();
            toast.success("Credit note redeemed successfully");
            refetch();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const fieldErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                dispatch(setActionErrors(fieldErrors));
            } else {
                toast.error(err?.data?.message || "Failed to redeem credit note");
            }
        }
    };

    const handleRefund = async (creditNoteId, refundData) => {
        try {
            await refundCreditNote({
                creditNoteId,
                idempotencyKey: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...refundData,
            }).unwrap();
            toast.success("Credit note refunded successfully");
            refetch();
        } catch (err) {
            if (err?.data?.errors?.length) {
                const fieldErrors = {};
                err.data.errors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                dispatch(setActionErrors(fieldErrors));
            } else {
                toast.error(err?.data?.message || "Failed to refund credit note");
            }
        }
    };

    const handleCancel = async (creditNoteId, cancelData) => {
        try {
            await cancelCreditNote({
                creditNoteId,
                idempotencyKey: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...cancelData,
            }).unwrap();
            toast.success("Credit note cancelled");
            refetch();
        } catch (err) {
            toast.error(err?.data?.message || "Failed to cancel credit note");
        }
    };

    // FIXED: Use correct field names from API response
    const getAvailableActions = (creditNote) => {
        const actions = [];
        const status = creditNote.status;
        // API returns 'balance' for remaining amount, not 'remaining_amount'
        const remainingAmount = toNumber(creditNote.balance || 0);
        actions.push({ type: "view", label: "View Details", icon: <Eye size={14} />, color: "text-blue-500" });
        if (status === "ACTIVE" && remainingAmount > 0) {
            actions.push({ type: "redeem", label: "Redeem", icon: <CreditCard size={14} />, color: "text-green-600" });
            actions.push({ type: "refund", label: "Refund", icon: <Receipt size={14} />, color: "text-purple-600" });
        }
        if (status === "PARTIALLY_REDEEMED" && remainingAmount > 0) {
            actions.push({ type: "redeem", label: "Redeem More", icon: <CreditCard size={14} />, color: "text-green-600" });
        }
        if (status === "PARTIALLY_REFUNDED" && remainingAmount > 0) {
            actions.push({ type: "refund", label: "Refund More", icon: <Receipt size={14} />, color: "text-purple-600" });
        }
        if (isSuperAdmin && !["REDEEMED", "REFUNDED", "CANCELLED"].includes(status)) {
            actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-red-600" });
        }
        return actions;
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Credit Notes</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Manage customer credit notes — created from returns, redeemable against future purchases</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canCreate && (
                        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer">
                            <Plus size={15} /> Create Credit Note
                        </button>
                    )}
                    <button onClick={handleRefresh} className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 bg-white">
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats - FIXED: Use credit_amount instead of amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Total Credit Notes</p>
                    <p className="text-3xl font-bold text-gray-900">{meta.total}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Active</p>
                    <p className="text-3xl font-bold text-gray-900">{creditNotes.filter(c => c.status === "ACTIVE").length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Redeemed / Refunded</p>
                    <p className="text-3xl font-bold text-gray-900">{creditNotes.filter(c => c.status === "REDEEMED" || c.status === "REFUNDED").length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2">Total Credit Amount</p>
                    <p className="text-3xl font-bold text-gray-900">₹{creditNotes.reduce((sum, c) => sum + toNumber(c.credit_amount || 0), 0).toFixed(0)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                    <select value={statusFilter} onChange={(e) => dispatch(setStatusFilter(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PARTIALLY_REDEEMED">Partially Redeemed</option>
                        <option value="REDEEMED">Redeemed</option>
                        <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                        <option value="REFUNDED">Refunded</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <input type="date" value={fromDate} onChange={(e) => dispatch(setFromDate(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <input type="date" value={toDate} onChange={(e) => dispatch(setToDate(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <button onClick={() => { dispatch(setStatusFilter("")); dispatch(setFromDate("")); dispatch(setToDate("")); dispatch(setCurrentPage(1)); }} className="w-full sm:w-auto px-3 py-2 text-gray-500 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center gap-1 bg-white"><X size={14} /> Clear</button>
                    <select value={pageSize} onChange={(e) => dispatch(setPageSize(Number(e.target.value)))} className="w-full sm:w-auto sm:ml-auto px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
                    </select>
                </div>
            </div>

            {/* Credit Notes Table - FIXED: Use correct field names */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Credit Notes</p>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{creditNotes.length} records</span>
                </div>
                <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Credit Note #</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Original Bill</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Redeemed</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Reason</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading && (
                            <tr><td colSpan={9} className="px-4 py-10 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                        )}
                        {!isLoading && creditNotes.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">No credit notes found</td></tr>
                        )}
                        {!isLoading && creditNotes.map((cn) => {
                            const actions = getAvailableActions(cn);
                            // FIXED: Use correct field names from API
                            const creditAmount = toNumber(cn.credit_amount || 0);
                            const redeemedAmount = toNumber(cn.amount_redeemed || 0);
                            const refundedAmount = toNumber(cn.amount_refunded || 0);
                            const totalUsed = redeemedAmount + refundedAmount;
                            const balance = toNumber(cn.balance || 0);
                            const reasonText = cn.remarks || cn.reason || "—";
                            const customerName = cn.customer_name || cn.customer?.name || "—";
                            const customerMobile = cn.customer_mobile || cn.customer?.mobile || "—";
                            
                            return (
                                <tr key={cn.credit_note_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{cn.credit_note_number || cn.credit_note_id?.slice(-8)}</td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{cn.original_bill?.bill_number || cn.original_bill_id?.slice(-8)}</td>
                                    <td className="px-5 py-3.5 text-right font-semibold text-gray-800">₹{creditAmount.toFixed(2)}</td>
                                    <td className="px-5 py-3.5 text-right text-gray-600">₹{totalUsed.toFixed(2)}</td>
                                    <td className="px-5 py-3.5 text-right font-semibold text-blue-600">₹{balance.toFixed(2)}</td>
                                    <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[150px] truncate">{reasonText}</td>
                                    <td className="px-5 py-3.5"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[cn.status] || "bg-gray-100 text-gray-600"}`}>{cn.status?.replace(/_/g, " ")}</span></td>
                                    <td className="px-5 py-3.5 text-xs text-gray-400">{fmtDate(cn.created_at)}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1 flex-wrap">
                                            {actions.map((action) => (
                                                <button
                                                    key={action.type}
                                                    onClick={() => {
                                                        if (action.type === "view") dispatch(openViewModal(cn));
                                                        if (action.type === "redeem") dispatch(openRedeemModal(cn));
                                                        if (action.type === "refund") dispatch(openRefundModal(cn));
                                                        if (action.type === "cancel") dispatch(openCancelModal(cn));
                                                    }}
                                                    className={`p-1.5 ${action.color} hover:bg-gray-100 rounded-lg transition-colors`}
                                                    title={action.label}
                                                >
                                                    {action.icon}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
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

            {/* Create Credit Note Modal */}
            {showCreateModal && (
                <CreateCreditNoteModal
                    shop_id={userShopId}
                    onSuccess={() => { refetch(); setShowCreateModal(false); }}
                    onClose={() => setShowCreateModal(false)}
                />
            )}

            {/* View Modal */}
            {showViewModal && selectedCreditNote && (
                <CreditNoteViewModal creditNote={selectedCreditNote} onClose={() => dispatch(closeViewModal())} />
            )}
            
            {/* Redeem Modal */}
            {showRedeemModal && selectedCreditNote && (
                <RedeemCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleRedeem} onClose={() => dispatch(closeRedeemModal())} />
            )}
            
            {/* Refund Modal */}
            {showRefundModal && selectedCreditNote && (
                <RefundCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleRefund} onClose={() => dispatch(closeRefundModal())} />
            )}
            
            {/* Cancel Modal */}
            {showCancelModal && selectedCreditNote && (
                <CancelCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleCancel} onClose={() => dispatch(closeCancelModal())} />
            )}
        </div>
    );
}
// down code is working but upper code ui is updated 
// // TABS/SALES/CreditNotesTab.jsx
// //
// // Credit Notes Management - Full CRUD operations
// // FIXED: Added missing close modal actions, fixed amount fields, fixed customer display

// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { RefreshCw, Eye, CreditCard, Receipt, Ban, X, Plus, Search, User } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//     useGetCreditNotesQuery,
//     useRedeemCreditNoteMutation,
//     useRefundCreditNoteMutation,
//     useCancelCreditNoteMutation,
//     useCreateCreditNoteMutation,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";
// import { useLazySearchCustomersQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
// import { useGetBillsQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
// import {
//     setStatusFilter,
//     setFromDate,
//     setToDate,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openViewModal,
//     closeViewModal,
//     openRedeemModal,
//     closeRedeemModal,
//     openRefundModal,
//     closeRefundModal,
//     openCancelModal,
//     closeCancelModal,
//     setActionErrors,
//     clearActionErrors,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteSlice";
// import CreditNoteViewModal from "./CreditNoteShared/CreditNoteViewModal";
// import RedeemCreditNoteModal from "./CreditNoteShared/RedeemCreditNoteModal";
// import RefundCreditNoteModal from "./CreditNoteShared/RefundCreditNoteModal";
// import CancelCreditNoteModal from "./CreditNoteShared/CancelCreditNoteModal";
// import CreateCreditNoteModal from "./CreditNoteShared/CreateCreditNoteModal";

// const toNumber = (value, defaultValue = 0) => {
//     const num = Number(value);
//     return isNaN(num) ? defaultValue : num;
// };

// const STATUS_BADGE = {
//     ACTIVE: "bg-green-100 text-green-700",
//     PARTIALLY_REDEEMED: "bg-blue-100 text-blue-700",
//     REDEEMED: "bg-purple-100 text-purple-700",
//     PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
//     REFUNDED: "bg-gray-100 text-gray-600",
//     CANCELLED: "bg-red-100 text-red-600",
// };

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// export default function CreditNotesTab() {
//     const dispatch = useDispatch();
//     const { user } = useSelector((state) => state.auth);
//     const { statusFilter, fromDate, toDate, currentPage, pageSize, showViewModal, showRedeemModal, showRefundModal, showCancelModal, selectedCreditNote } = useSelector((state) => state.creditNote);

//     const userShopId = user?.shop_id || "";
//     const userRole = user?.role || "";
//     const isSuperAdmin = userRole === "SUPER_ADMIN";
//     const canCreate = userRole === "SHOP_OWNER" || userRole === "BILLING_STAFF" || isSuperAdmin;

//     const [showCreateModal, setShowCreateModal] = useState(false);
//     const [searchMobile, setSearchMobile] = useState("");
//     const [selectedCustomerForCreate, setSelectedCustomerForCreate] = useState(null);
//     const [selectedBillForCreate, setSelectedBillForCreate] = useState(null);
//     const [selectedItems, setSelectedItems] = useState([]);
//     const [reason, setReason] = useState("");
//     const [restoreStock, setRestoreStock] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const [triggerSearchCustomers, { data: searchResults, isLoading: isSearching }] = useLazySearchCustomersQuery();
//     const [createCreditNote] = useCreateCreditNoteMutation();

//     const { data: billsData } = useGetBillsQuery({
//         page: 1,
//         limit: 50,
//         shop_id: userShopId,
//     }, { skip: !selectedCustomerForCreate });

//     const bills = billsData?.bills || [];
//     const customers = searchResults || [];

//     const handleSearchCustomer = () => {
//         if (searchMobile.length === 10) {
//             triggerSearchCustomers({ mobile: searchMobile });
//         } else {
//             toast.error("Enter 10-digit mobile number");
//         }
//     };

//     const handleSelectCustomer = (customer) => {
//         setSelectedCustomerForCreate(customer);
//         setSearchMobile("");
//         setSelectedBillForCreate(null);
//         setSelectedItems([]);
//     };

//     const handleSelectBill = (bill) => {
//         setSelectedBillForCreate(bill);
//         const initialItems = bill.items?.map(item => ({
//             variant_id: item.variant_id,
//             product_name: item.variant?.product?.name || item.product?.name,
//             quantity: item.quantity,
//             max_quantity: item.quantity,
//             unit_price: item.unit_price,
//             line_total: item.line_total,
//         })) || [];
//         setSelectedItems(initialItems);
//     };

//     const handleUpdateItemQuantity = (variantId, newQuantity) => {
//         setSelectedItems(prev => prev.map(item =>
//             item.variant_id === variantId
//                 ? { ...item, quantity: Math.min(newQuantity, item.max_quantity) }
//                 : item
//         ));
//     };

//     const handleCreateCreditNote = async () => {
//         if (!selectedBillForCreate) {
//             toast.error("Please select a bill");
//             return;
//         }
//         const itemsToReturn = selectedItems.filter(item => item.quantity > 0);
//         if (itemsToReturn.length === 0) {
//             toast.error("Please select at least one item to return");
//             return;
//         }
//         if (!reason.trim()) {
//             toast.error("Please enter a reason for return");
//             return;
//         }
//         setIsSubmitting(true);
//         try {
//             const result = await createCreditNote({
//                 idempotencyKey: `cn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 original_bill_id: selectedBillForCreate.bill_id,
//                 items: itemsToReturn.map(item => ({
//                     variant_id: item.variant_id,
//                     quantity: item.quantity,
//                     unit_price: item.unit_price,
//                 })),
//                 reason: reason.trim(),
//                 restore_stock: restoreStock,
//             }).unwrap();
//             toast.success(`Credit note ${result.credit_note_number} created successfully`);
//             setShowCreateModal(false);
//             setSelectedCustomerForCreate(null);
//             setSelectedBillForCreate(null);
//             setSelectedItems([]);
//             setReason("");
//             setSearchMobile("");
//             refetch();
//         } catch (err) {
//             toast.error(err?.data?.message || "Failed to create credit note");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const [redeemCreditNote] = useRedeemCreditNoteMutation();
//     const [refundCreditNote] = useRefundCreditNoteMutation();
//     const [cancelCreditNote] = useCancelCreditNoteMutation();

//     const { data, isLoading, refetch } = useGetCreditNotesQuery({
//         page: currentPage,
//         limit: pageSize,
//         status: statusFilter,
//         shop_id: userShopId,
//         from_date: fromDate,
//         to_date: toDate,
//     });

//     const creditNotes = data?.creditNotes || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

//     const handleRefresh = () => {
//         refetch();
//         dispatch(resetFilters());
//     };

//     const handleRedeem = async (creditNoteId, redeemData) => {
//         try {
//             await redeemCreditNote({
//                 creditNoteId,
//                 idempotencyKey: `redeem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 ...redeemData,
//             }).unwrap();
//             toast.success("Credit note redeemed successfully");
//             refetch();
//         } catch (err) {
//             if (err?.data?.errors?.length) {
//                 const fieldErrors = {};
//                 err.data.errors.forEach(({ field, message }) => {
//                     fieldErrors[field] = message;
//                 });
//                 dispatch(setActionErrors(fieldErrors));
//             } else {
//                 toast.error(err?.data?.message || "Failed to redeem credit note");
//             }
//         }
//     };

//     const handleRefund = async (creditNoteId, refundData) => {
//         try {
//             await refundCreditNote({
//                 creditNoteId,
//                 idempotencyKey: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 ...refundData,
//             }).unwrap();
//             toast.success("Credit note refunded successfully");
//             refetch();
//         } catch (err) {
//             if (err?.data?.errors?.length) {
//                 const fieldErrors = {};
//                 err.data.errors.forEach(({ field, message }) => {
//                     fieldErrors[field] = message;
//                 });
//                 dispatch(setActionErrors(fieldErrors));
//             } else {
//                 toast.error(err?.data?.message || "Failed to refund credit note");
//             }
//         }
//     };

//     const handleCancel = async (creditNoteId, cancelData) => {
//         try {
//             await cancelCreditNote({
//                 creditNoteId,
//                 idempotencyKey: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 ...cancelData,
//             }).unwrap();
//             toast.success("Credit note cancelled");
//             refetch();
//         } catch (err) {
//             toast.error(err?.data?.message || "Failed to cancel credit note");
//         }
//     };

//     // FIXED: Use correct field names from API response
//     const getAvailableActions = (creditNote) => {
//         const actions = [];
//         const status = creditNote.status;
//         // API returns 'balance' for remaining amount, not 'remaining_amount'
//         const remainingAmount = toNumber(creditNote.balance || 0);
//         actions.push({ type: "view", label: "View Details", icon: <Eye size={14} />, color: "text-blue-500" });
//         if (status === "ACTIVE" && remainingAmount > 0) {
//             actions.push({ type: "redeem", label: "Redeem", icon: <CreditCard size={14} />, color: "text-green-600" });
//             actions.push({ type: "refund", label: "Refund", icon: <Receipt size={14} />, color: "text-purple-600" });
//         }
//         if (status === "PARTIALLY_REDEEMED" && remainingAmount > 0) {
//             actions.push({ type: "redeem", label: "Redeem More", icon: <CreditCard size={14} />, color: "text-green-600" });
//         }
//         if (status === "PARTIALLY_REFUNDED" && remainingAmount > 0) {
//             actions.push({ type: "refund", label: "Refund More", icon: <Receipt size={14} />, color: "text-purple-600" });
//         }
//         if (isSuperAdmin && !["REDEEMED", "REFUNDED", "CANCELLED"].includes(status)) {
//             actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-red-600" });
//         }
//         return actions;
//     };

//     return (
//         <div className="space-y-5">
//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//                 <div>
//                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Credit Notes</h2>
//                     <p className="text-sm text-gray-500 mt-1">Manage customer credit notes — created from returns, redeemable against future purchases</p>
//                 </div>
//                 <div className="flex items-center gap-2.5">
//                     {canCreate && (
//                         <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer">
//                             <Plus size={16} /> Create Credit Note
//                         </button>
//                     )}
//                     <button onClick={handleRefresh} className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-1">
//                         <RefreshCw size={14} /> Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Stats - FIXED: Use credit_amount instead of amount */}
//             <div className="grid grid-cols-4 gap-4">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Total Credit Notes</p>
//                     <p className="text-3xl font-bold">{meta.total}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Active</p>
//                     <p className="text-3xl font-bold">{creditNotes.filter(c => c.status === "ACTIVE").length}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Redeemed/Refunded</p>
//                     <p className="text-3xl font-bold">{creditNotes.filter(c => c.status === "REDEEMED" || c.status === "REFUNDED").length}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Total Credit Amount</p>
//                     <p className="text-3xl font-bold">₹{creditNotes.reduce((sum, c) => sum + toNumber(c.credit_amount || 0), 0).toFixed(0)}</p>
//                 </div>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-gray-700">
//                 <div className="flex gap-3 flex-wrap">
//                     <select value={statusFilter} onChange={(e) => dispatch(setStatusFilter(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
//                         <option value="">All Status</option>
//                         <option value="ACTIVE">Active</option>
//                         <option value="PARTIALLY_REDEEMED">Partially Redeemed</option>
//                         <option value="REDEEMED">Redeemed</option>
//                         <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
//                         <option value="REFUNDED">Refunded</option>
//                         <option value="CANCELLED">Cancelled</option>
//                     </select>
//                     <input type="date" value={fromDate} onChange={(e) => dispatch(setFromDate(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
//                     <input type="date" value={toDate} onChange={(e) => dispatch(setToDate(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
//                     <button onClick={() => { dispatch(setStatusFilter("")); dispatch(setFromDate("")); dispatch(setToDate("")); dispatch(setCurrentPage(1)); }} className="px-3 py-2 text-gray-600 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"><X size={14} /> Clear</button>
//                     <select value={pageSize} onChange={(e) => dispatch(setPageSize(Number(e.target.value)))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm ml-auto">
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Credit Notes Table - FIXED: Use correct field names */}
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Credit Note #</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Original Bill</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Redeemed</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Balance</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Reason</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {isLoading && (
//                             <tr><td colSpan={9} className="px-4 py-10 text-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
//                         )}
//                         {!isLoading && creditNotes.length === 0 && (
//                             <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No credit notes found</td></tr>
//                         )}
//                         {!isLoading && creditNotes.map((cn) => {
//                             const actions = getAvailableActions(cn);
//                             // FIXED: Use correct field names from API
//                             const creditAmount = toNumber(cn.credit_amount || 0);
//                             const redeemedAmount = toNumber(cn.amount_redeemed || 0);
//                             const refundedAmount = toNumber(cn.amount_refunded || 0);
//                             const totalUsed = redeemedAmount + refundedAmount;
//                             const balance = toNumber(cn.balance || 0);
//                             const reasonText = cn.remarks || cn.reason || "—";
//                             const customerName = cn.customer_name || cn.customer?.name || "—";
//                             const customerMobile = cn.customer_mobile || cn.customer?.mobile || "—";
                            
//                             return (
//                                 <tr key={cn.credit_note_id} className="hover:bg-gray-50">
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-500">{cn.credit_note_number || cn.credit_note_id?.slice(-8)}</td>
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-500">{cn.original_bill?.bill_number || cn.original_bill_id?.slice(-8)}</td>
//                                     <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{creditAmount.toFixed(2)}</td>
//                                     <td className="px-4 py-3 text-right text-gray-600">₹{totalUsed.toFixed(2)}</td>
//                                     <td className="px-4 py-3 text-right font-semibold text-blue-600">₹{balance.toFixed(2)}</td>
//                                     <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{reasonText}</td>
//                                     <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[cn.status] || "bg-gray-100 text-gray-600"}`}>{cn.status?.replace(/_/g, " ")}</span></td>
//                                     <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(cn.created_at)}</td>
//                                     <td className="px-4 py-3 text-center">
//                                         <div className="flex items-center justify-center gap-1 flex-wrap">
//                                             {actions.map((action) => (
//                                                 <button
//                                                     key={action.type}
//                                                     onClick={() => {
//                                                         if (action.type === "view") dispatch(openViewModal(cn));
//                                                         if (action.type === "redeem") dispatch(openRedeemModal(cn));
//                                                         if (action.type === "refund") dispatch(openRefundModal(cn));
//                                                         if (action.type === "cancel") dispatch(openCancelModal(cn));
//                                                     }}
//                                                     className={`p-1.5 ${action.color} hover:bg-gray-100 rounded-lg transition-colors`}
//                                                     title={action.label}
//                                                 >
//                                                     {action.icon}
//                                                 </button>
//                                             ))}
//                                         </div>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
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

//             {/* Create Credit Note Modal */}
//             {showCreateModal && (
//                 <CreateCreditNoteModal
//                     shop_id={userShopId}
//                     onSuccess={() => { refetch(); setShowCreateModal(false); }}
//                     onClose={() => setShowCreateModal(false)}
//                 />
//             )}

//             {/* View Modal */}
//             {showViewModal && selectedCreditNote && (
//                 <CreditNoteViewModal creditNote={selectedCreditNote} onClose={() => dispatch(closeViewModal())} />
//             )}
            
//             {/* Redeem Modal */}
//             {showRedeemModal && selectedCreditNote && (
//                 <RedeemCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleRedeem} onClose={() => dispatch(closeRedeemModal())} />
//             )}
            
//             {/* Refund Modal */}
//             {showRefundModal && selectedCreditNote && (
//                 <RefundCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleRefund} onClose={() => dispatch(closeRefundModal())} />
//             )}
            
//             {/* Cancel Modal */}
//             {showCancelModal && selectedCreditNote && (
//                 <CancelCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleCancel} onClose={() => dispatch(closeCancelModal())} />
//             )}
//         </div>
//     );
// }

// // TABS/SALES/CreditNotesTab.jsx
// //
// // Credit Notes Management - Full CRUD operations
// // Create, View, Redeem, Refund, Cancel credit notes
// // ADDED: Create Credit Note button with customer search

// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { RefreshCw, Eye, CreditCard, Receipt, Ban, X, Plus, Search, User, Phone } from "lucide-react";
// import { toast } from "react-toastify";
// import {
//     useGetCreditNotesQuery,
//     useRedeemCreditNoteMutation,
//     useRefundCreditNoteMutation,
//     useCancelCreditNoteMutation,
//     useCreateCreditNoteMutation,
//     // useLazySearchCustomersQuery,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";
// import { useLazySearchCustomersQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
// import { useGetBillsQuery } from "../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
// import {
//     setStatusFilter,
//     setFromDate,
//     setToDate,
//     setCurrentPage,
//     setPageSize,
//     resetFilters,
//     openViewModal,
//     openRedeemModal,
//     openRefundModal,
//     openCancelModal,
//     setActionErrors,
//     clearActionErrors,
// } from "../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteSlice";
// import CreditNoteViewModal from "./CreditNoteShared/CreditNoteViewModal";
// import RedeemCreditNoteModal from "./CreditNoteShared/RedeemCreditNoteModal";
// import RefundCreditNoteModal from "./CreditNoteShared/RefundCreditNoteModal";
// import CancelCreditNoteModal from "./CreditNoteShared/CancelCreditNoteModal";
// import CreateCreditNoteModal from "./CreditNoteShared/CreateCreditNoteModal";

// const toNumber = (value, defaultValue = 0) => {
//     const num = Number(value);
//     return isNaN(num) ? defaultValue : num;
// };

// const STATUS_BADGE = {
//     ACTIVE: "bg-green-100 text-green-700",
//     PARTIALLY_REDEEMED: "bg-blue-100 text-blue-700",
//     REDEEMED: "bg-purple-100 text-purple-700",
//     PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
//     REFUNDED: "bg-gray-100 text-gray-600",
//     CANCELLED: "bg-red-100 text-red-600",
// };

// const fmtDate = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// export default function CreditNotesTab() {
//     const dispatch = useDispatch();
//     const { user } = useSelector((state) => state.auth);
//     const { statusFilter, fromDate, toDate, currentPage, pageSize, showViewModal, showRedeemModal, showRefundModal, showCancelModal, selectedCreditNote } = useSelector((state) => state.creditNote);

//     const userShopId = user?.shop_id || "";
//     const userRole = user?.role || "";
//     const isSuperAdmin = userRole === "SUPER_ADMIN";
//     const canCreate = userRole === "SHOP_OWNER" || userRole === "BILLING_STAFF" || isSuperAdmin;

//     // Local state for Create Modal
//     const [showCreateModal, setShowCreateModal] = useState(false);
//     const [searchMobile, setSearchMobile] = useState("");
//     const [selectedCustomerForCreate, setSelectedCustomerForCreate] = useState(null);
//     const [selectedBillForCreate, setSelectedBillForCreate] = useState(null);
//     const [selectedItems, setSelectedItems] = useState([]);
//     const [reason, setReason] = useState("");
//     const [restoreStock, setRestoreStock] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const [triggerSearchCustomers, { data: searchResults, isLoading: isSearching }] = useLazySearchCustomersQuery();
//     const [createCreditNote] = useCreateCreditNoteMutation();

//     // Fetch bills for selected customer
//     const { data: billsData } = useGetBillsQuery({
//         page: 1,
//         limit: 50,
//         shop_id: userShopId,
//     }, { skip: !selectedCustomerForCreate });

//     const bills = billsData?.bills || [];
//     const customers = searchResults || [];

//     // Search customer by mobile
//     const handleSearchCustomer = () => {
//         if (searchMobile.length === 10) {
//             triggerSearchCustomers({ mobile: searchMobile });
//         } else {
//             toast.error("Enter 10-digit mobile number");
//         }
//     };

//     const handleSelectCustomer = (customer) => {
//         setSelectedCustomerForCreate(customer);
//         setSearchMobile("");
//         setSelectedBillForCreate(null);
//         setSelectedItems([]);
//     };

//     const handleSelectBill = (bill) => {
//         setSelectedBillForCreate(bill);
//         // Initialize items with bill items
//         const initialItems = bill.items?.map(item => ({
//             variant_id: item.variant_id,
//             product_name: item.variant?.product?.name || item.product?.name,
//             quantity: item.quantity,
//             max_quantity: item.quantity,
//             unit_price: item.unit_price,
//             line_total: item.line_total,
//         })) || [];
//         setSelectedItems(initialItems);
//     };

//     const handleUpdateItemQuantity = (variantId, newQuantity) => {
//         setSelectedItems(prev => prev.map(item =>
//             item.variant_id === variantId
//                 ? { ...item, quantity: Math.min(newQuantity, item.max_quantity) }
//                 : item
//         ));
//     };

//     const handleCreateCreditNote = async () => {
//         if (!selectedBillForCreate) {
//             toast.error("Please select a bill");
//             return;
//         }

//         const itemsToReturn = selectedItems.filter(item => item.quantity > 0);
//         if (itemsToReturn.length === 0) {
//             toast.error("Please select at least one item to return");
//             return;
//         }

//         if (!reason.trim()) {
//             toast.error("Please enter a reason for return");
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             const result = await createCreditNote({
//                 idempotencyKey: `cn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 original_bill_id: selectedBillForCreate.bill_id,
//                 items: itemsToReturn.map(item => ({
//                     variant_id: item.variant_id,
//                     quantity: item.quantity,
//                     unit_price: item.unit_price,
//                 })),
//                 reason: reason.trim(),
//                 restore_stock: restoreStock,
//             }).unwrap();

//             toast.success(`Credit note ${result.credit_note_number} created successfully`);
//             setShowCreateModal(false);
//             setSelectedCustomerForCreate(null);
//             setSelectedBillForCreate(null);
//             setSelectedItems([]);
//             setReason("");
//             setSearchMobile("");
//             refetch();
//         } catch (err) {
//             toast.error(err?.data?.message || "Failed to create credit note");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const [redeemCreditNote] = useRedeemCreditNoteMutation();
//     const [refundCreditNote] = useRefundCreditNoteMutation();
//     const [cancelCreditNote] = useCancelCreditNoteMutation();

//     const { data, isLoading, refetch } = useGetCreditNotesQuery({
//         page: currentPage,
//         limit: pageSize,
//         status: statusFilter,
//         shop_id: userShopId,
//         from_date: fromDate,
//         to_date: toDate,
//     });

//     const creditNotes = data?.creditNotes || [];
//     const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

//     const handleRefresh = () => {
//         refetch();
//         dispatch(resetFilters());
//     };

//     const handleRedeem = async (creditNoteId, redeemData) => {
//         try {
//             await redeemCreditNote({
//                 creditNoteId,
//                 idempotencyKey: `redeem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 ...redeemData,
//             }).unwrap();
//             toast.success("Credit note redeemed successfully");
//             refetch();
//         } catch (err) {
//             if (err?.data?.errors?.length) {
//                 const fieldErrors = {};
//                 err.data.errors.forEach(({ field, message }) => {
//                     fieldErrors[field] = message;
//                 });
//                 dispatch(setActionErrors(fieldErrors));
//             } else {
//                 toast.error(err?.data?.message || "Failed to redeem credit note");
//             }
//         }
//     };

//     const handleRefund = async (creditNoteId, refundData) => {
//         try {
//             await refundCreditNote({
//                 creditNoteId,
//                 idempotencyKey: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 ...refundData,
//             }).unwrap();
//             toast.success("Credit note refunded successfully");
//             refetch();
//         } catch (err) {
//             if (err?.data?.errors?.length) {
//                 const fieldErrors = {};
//                 err.data.errors.forEach(({ field, message }) => {
//                     fieldErrors[field] = message;
//                 });
//                 dispatch(setActionErrors(fieldErrors));
//             } else {
//                 toast.error(err?.data?.message || "Failed to refund credit note");
//             }
//         }
//     };

//     const handleCancel = async (creditNoteId, cancelData) => {
//         try {
//             await cancelCreditNote({
//                 creditNoteId,
//                 idempotencyKey: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 ...cancelData,
//             }).unwrap();
//             toast.success("Credit note cancelled");
//             refetch();
//         } catch (err) {
//             toast.error(err?.data?.message || "Failed to cancel credit note");
//         }
//     };

//     // Get available actions based on status and role
//     const getAvailableActions = (creditNote) => {
//         const actions = [];
//         const status = creditNote.status;
//         const remainingAmount = toNumber(creditNote.remaining_amount || creditNote.amount);

//         actions.push({ type: "view", label: "View Details", icon: <Eye size={14} />, color: "text-blue-500" });

//         if (status === "ACTIVE" && remainingAmount > 0) {
//             actions.push({ type: "redeem", label: "Redeem", icon: <CreditCard size={14} />, color: "text-green-600" });
//             actions.push({ type: "refund", label: "Refund", icon: <Receipt size={14} />, color: "text-purple-600" });
//         }

//         if (status === "PARTIALLY_REDEEMED" && remainingAmount > 0) {
//             actions.push({ type: "redeem", label: "Redeem More", icon: <CreditCard size={14} />, color: "text-green-600" });
//         }

//         if (status === "PARTIALLY_REFUNDED" && remainingAmount > 0) {
//             actions.push({ type: "refund", label: "Refund More", icon: <Receipt size={14} />, color: "text-purple-600" });
//         }

//         if (isSuperAdmin && !["REDEEMED", "REFUNDED", "CANCELLED"].includes(status)) {
//             actions.push({ type: "cancel", label: "Cancel", icon: <Ban size={14} />, color: "text-red-600" });
//         }

//         return actions;
//     };

//     return (
//         <div className="space-y-5">
//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
//                 <div>
//                     <h2 className="text-xl font-bold text-gray-900 tracking-tight">Credit Notes</h2>
//                     <p className="text-sm text-gray-500 mt-1">
//                         Manage customer credit notes — created from returns, redeemable against future purchases
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2.5">
//                     {canCreate && (
//                         <button
//                             onClick={() => setShowCreateModal(true)}
//                             className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
//                         >
//                             <Plus size={16} /> Create Credit Note
//                         </button>
//                     )}
//                     <button onClick={handleRefresh} className="px-3 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 flex items-center gap-1">
//                         <RefreshCw size={14} /> Refresh
//                     </button>
//                 </div>
//             </div>

//             {/* Stats */}
//             <div className="grid grid-cols-4 gap-4">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Total Credit Notes</p>
//                     <p className="text-3xl font-bold">{meta.total}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Active</p>
//                     <p className="text-3xl font-bold">{creditNotes.filter(c => c.status === "ACTIVE").length}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Redeemed/Refunded</p>
//                     <p className="text-3xl font-bold">{creditNotes.filter(c => c.status === "REDEEMED" || c.status === "REFUNDED").length}</p>
//                 </div>
//                 <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-md">
//                     <p className="text-xs opacity-75">Total Credit Amount</p>
//                     <p className="text-3xl font-bold">₹{creditNotes.reduce((sum, c) => sum + toNumber(c.amount), 0).toFixed(0)}</p>
//                 </div>
//             </div>

//             {/* Filters */}
//             <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 text-gray-700">
//                 <div className="flex gap-3 flex-wrap">
//                     <select
//                         value={statusFilter}
//                         onChange={(e) => dispatch(setStatusFilter(e.target.value))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                     >
//                         <option value="">All Status</option>
//                         <option value="ACTIVE">Active</option>
//                         <option value="PARTIALLY_REDEEMED">Partially Redeemed</option>
//                         <option value="REDEEMED">Redeemed</option>
//                         <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
//                         <option value="REFUNDED">Refunded</option>
//                         <option value="CANCELLED">Cancelled</option>
//                     </select>
//                     <input
//                         type="date"
//                         value={fromDate}
//                         onChange={(e) => dispatch(setFromDate(e.target.value))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                         placeholder="From Date"
//                     />
//                     <input
//                         type="date"
//                         value={toDate}
//                         onChange={(e) => dispatch(setToDate(e.target.value))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                         placeholder="To Date"
//                     />
//                     <button
//                         onClick={() => {
//                             dispatch(setStatusFilter(""));
//                             dispatch(setFromDate(""));
//                             dispatch(setToDate(""));
//                             dispatch(setCurrentPage(1));
//                         }}
//                         className="px-3 py-2 text-gray-600 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"
//                     >
//                         <X size={14} /> Clear
//                     </button>
//                     <select
//                         value={pageSize}
//                         onChange={(e) => dispatch(setPageSize(Number(e.target.value)))}
//                         className="px-3 py-2 border border-gray-300 rounded-lg text-sm ml-auto"
//                     >
//                         {[10, 20, 50].map(s => <option key={s} value={s}>{s} per page</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* Credit Notes Table */}
//             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
//                 <table className="w-full text-sm">
//                     <thead className="bg-gray-50">
//                         <tr>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Credit Note #</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Original Bill</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Redeemed</th>
//                             <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Balance</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Reason</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
//                             <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
//                             <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-100">
//                         {isLoading && (
//                             <tr>
//                                 <td colSpan={9} className="px-4 py-10 text-center">
//                                     <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
//                                 </td>
//                             </tr>
//                         )}
//                         {!isLoading && creditNotes.length === 0 && (
//                             <tr>
//                                 <td colSpan={9} className="px-4 py-10 text-center text-gray-400">No credit notes found</td>
//                             </tr>
//                         )}
//                         {!isLoading && creditNotes.map((cn) => {
//                             const actions = getAvailableActions(cn);
//                             const redeemedAmount = toNumber(cn.redeemed_amount || 0);
//                             const refundedAmount = toNumber(cn.refunded_amount || 0);
//                             const totalUsed = redeemedAmount + refundedAmount;
//                             const remainingAmount = toNumber(cn.amount) - totalUsed;

//                             return (
//                                 <tr key={cn.credit_note_id} className="hover:bg-gray-50">
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-500">{cn.credit_note_number || cn.credit_note_id?.slice(-8)}</td>
//                                     <td className="px-4 py-3 font-mono text-xs text-gray-500">{cn.original_bill?.bill_number || cn.original_bill_id?.slice(-8)}</td>
//                                     <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{toNumber(cn.amount).toFixed(2)}</td>
//                                     <td className="px-4 py-3 text-right text-gray-600">₹{totalUsed.toFixed(2)}</td>
//                                     <td className="px-4 py-3 text-right font-semibold text-blue-600">₹{remainingAmount.toFixed(2)}</td>
//                                     <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{cn.reason || "—"}</td>
//                                     <td className="px-4 py-3">
//                                         <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[cn.status] || "bg-gray-100 text-gray-600"}`}>
//                                             {cn.status?.replace(/_/g, " ")}
//                                         </span>
//                                     </td>
//                                     <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(cn.created_at)}</td>
//                                     <td className="px-4 py-3 text-center">
//                                         <div className="flex items-center justify-center gap-1 flex-wrap">
//                                             {actions.map((action) => (
//                                                 <button
//                                                     key={action.type}
//                                                     onClick={() => {
//                                                         if (action.type === "view") dispatch(openViewModal(cn));
//                                                         if (action.type === "redeem") dispatch(openRedeemModal(cn));
//                                                         if (action.type === "refund") dispatch(openRefundModal(cn));
//                                                         if (action.type === "cancel") dispatch(openCancelModal(cn));
//                                                     }}
//                                                     className={`p-1.5 ${action.color} hover:bg-gray-100 rounded-lg transition-colors`}
//                                                     title={action.label}
//                                                 >
//                                                     {action.icon}
//                                                 </button>
//                                             ))}
//                                         </div>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
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
//                 CREATE CREDIT NOTE MODAL
//             ============================================================ */}
//             {showCreateModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
//                         {/* Header */}
//                         <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
//                             <div>
//                                 <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
//                                     <Receipt size={18} className="text-blue-600" />
//                                     Create Credit Note
//                                 </h3>
//                                 <p className="text-xs text-gray-400 mt-0.5">Issue credit note for product returns</p>
//                             </div>
//                             <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         {/* Body */}
//                         <div className="p-6 space-y-5">
//                             {/* Step 1: Search Customer */}
//                             <div className="border-b pb-4">
//                                 <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
//                                     <User size={14} /> Find Customer
//                                 </p>
//                                 <div className="flex gap-2">
//                                     <input
//                                         type="tel"
//                                         placeholder="Enter 10-digit mobile number"
//                                         value={searchMobile}
//                                         onChange={(e) => setSearchMobile(e.target.value)}
//                                         className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                         onKeyPress={(e) => e.key === "Enter" && handleSearchCustomer()}
//                                     />
//                                     <button
//                                         onClick={handleSearchCustomer}
//                                         className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
//                                     >
//                                         <Search size={16} />
//                                     </button>
//                                 </div>

//                                 {isSearching && <p className="text-xs text-gray-400 mt-2">Searching...</p>}

//                                 {customers.length > 0 && !selectedCustomerForCreate && (
//                                     <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
//                                         {customers.map(customer => (
//                                             <button
//                                                 key={customer.customer_id}
//                                                 onClick={() => handleSelectCustomer(customer)}
//                                                 className="w-full text-left p-2 hover:bg-gray-50 rounded-lg"
//                                             >
//                                                 <p className="font-medium">{customer.name}</p>
//                                                 <p className="text-xs text-gray-500">{customer.mobile}</p>
//                                             </button>
//                                         ))}
//                                     </div>
//                                 )}

//                                 {selectedCustomerForCreate && (
//                                     <div className="mt-2 p-2 bg-green-50 rounded-lg flex justify-between items-center">
//                                         <div>
//                                             <p className="font-medium text-green-800">{selectedCustomerForCreate.name}</p>
//                                             <p className="text-xs text-green-600">{selectedCustomerForCreate.mobile}</p>
//                                         </div>
//                                         <button
//                                             onClick={() => setSelectedCustomerForCreate(null)}
//                                             className="text-xs text-red-500"
//                                         >
//                                             Change
//                                         </button>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Step 2: Select Bill */}
//                             {selectedCustomerForCreate && (
//                                 <div className="border-b pb-4">
//                                     <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
//                                         <Receipt size={14} /> Select Original Bill
//                                     </p>
//                                     <select
//                                         value={selectedBillForCreate?.bill_id || ""}
//                                         onChange={(e) => {
//                                             const bill = bills.find(b => b.bill_id === e.target.value);
//                                             if (bill) handleSelectBill(bill);
//                                         }}
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                     >
//                                         <option value="">Select a bill</option>
//                                         {bills.map(bill => (
//                                             <option key={bill.bill_id} value={bill.bill_id}>
//                                                 {bill.bill_number} - ₹{toNumber(bill.total_amount).toFixed(2)} - {fmtDate(bill.created_at)}
//                                             </option>
//                                         ))}
//                                     </select>
//                                 </div>
//                             )}

//                             {/* Step 3: Select Items to Return */}
//                             {selectedBillForCreate && selectedItems.length > 0 && (
//                                 <div className="border-b pb-4">
//                                     <p className="text-sm font-medium text-gray-700 mb-2">Select Items to Return</p>
//                                     <div className="space-y-2 max-h-60 overflow-y-auto">
//                                         {selectedItems.map((item, idx) => (
//                                             <div key={idx} className="flex items-center gap-3 p-2 border rounded-lg">
//                                                 <div className="flex-1">
//                                                     <p className="font-medium text-sm">{item.product_name}</p>
//                                                     <p className="text-xs text-gray-400">Max: {item.max_quantity} units</p>
//                                                 </div>
//                                                 <div className="w-24">
//                                                     <input
//                                                         type="number"
//                                                         min="0"
//                                                         max={item.max_quantity}
//                                                         value={item.quantity}
//                                                         onChange={(e) => handleUpdateItemQuantity(item.variant_id, parseInt(e.target.value) || 0)}
//                                                         className="w-full px-2 py-1 border rounded text-sm text-center"
//                                                     />
//                                                 </div>
//                                                 <div className="w-20 text-right">
//                                                     <p className="text-sm font-semibold">₹{toNumber(item.unit_price).toFixed(2)}</p>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Step 4: Reason & Stock Restore */}
//                             {selectedBillForCreate && selectedItems.some(i => i.quantity > 0) && (
//                                 <>
//                                     <div>
//                                         <label className="block text-xs font-medium text-gray-700 mb-1">
//                                             Return Reason <span className="text-red-500">*</span>
//                                         </label>
//                                         <textarea
//                                             value={reason}
//                                             onChange={(e) => setReason(e.target.value)}
//                                             rows={2}
//                                             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
//                                             placeholder="e.g., Product defective, Wrong item, Customer returned"
//                                         />
//                                     </div>

//                                     <div className="flex items-center gap-2">
//                                         <input
//                                             type="checkbox"
//                                             id="restoreStock"
//                                             checked={restoreStock}
//                                             onChange={(e) => setRestoreStock(e.target.checked)}
//                                             className="w-4 h-4 text-blue-600 rounded"
//                                         />
//                                         <label htmlFor="restoreStock" className="text-sm text-gray-700">
//                                             Restore stock to shop (add returned products back to inventory)
//                                         </label>
//                                     </div>
//                                 </>
//                             )}
//                         </div>

//                         {/* Footer */}
//                         <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
//                             <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
//                                 Cancel
//                             </button>
//                             <button
//                                 onClick={handleCreateCreditNote}
//                                 disabled={isSubmitting || !selectedBillForCreate || !selectedItems.some(i => i.quantity > 0) || !reason.trim()}
//                                 className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
//                             >
//                                 {isSubmitting ? "Creating..." : "Create Credit Note"}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Modals */}
//             {showViewModal && selectedCreditNote && (
//                 <CreditNoteViewModal creditNote={selectedCreditNote} onClose={() => dispatch(closeViewModal())} />
//             )}
//             {showRedeemModal && selectedCreditNote && (
//                 <RedeemCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleRedeem} onClose={() => dispatch(closeRedeemModal())} />
//             )}
//             {showRefundModal && selectedCreditNote && (
//                 <RefundCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleRefund} onClose={() => dispatch(closeRefundModal())} />
//             )}
//             {showCancelModal && selectedCreditNote && (
//                 <CancelCreditNoteModal creditNote={selectedCreditNote} onSuccess={handleCancel} onClose={() => dispatch(closeCancelModal())} />
//             )}
//             {showCreateModal && (
//                 <CreateCreditNoteModal
//                     shop_id={userShopId}
//                     onSuccess={() => {
//                         refetch();
//                         setShowCreateModal(false);
//                     }}
//                     onClose={() => setShowCreateModal(false)}
//                 />
//             )}
//         </div>
//     );
// }