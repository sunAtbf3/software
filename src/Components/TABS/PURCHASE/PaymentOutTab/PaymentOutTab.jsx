import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Plus, RefreshCw, XCircle, Pencil } from "lucide-react";
import {
    useGetVendorPaymentsQuery,
    useGetVendorPaymentByIdQuery,
    useCancelVendorPaymentMutation,
    useUpdateVendorPaymentStatusMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Purchase_api/purchaseFinanceApi";
import RecordPaymentModal from "./RecordPaymentModal";
import PaymentDetailModal from "./PaymentDetailModal";
import {
    fmtCurrency,
    fmtDate,
    PAYMENT_STATUS_BADGE,
    getPaymentMethodLabel,
} from "../purchaseFinanceUtils";
import { useGetWarehousesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { ROLES } from "../../../roles";

export default function PaymentOutTab() {
    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ORG_MANAGER;
    const warehouseId = user?.warehouse_id || "";
    const canWrite = [ROLES.SUPER_ADMIN, ROLES.ORG_MANAGER, ROLES.WH_MANAGER].includes(user?.role);

    const [warehouseFilter, setWarehouseFilter] = useState("");
    const effectiveWarehouseId = isSuperAdmin ? warehouseFilter : warehouseId;

    const { data: warehousesData } = useGetWarehousesQuery(
        { page: 1, limit: 100, is_active: "true" },
        { skip: !isSuperAdmin }
    );
    const warehouses = warehousesData?.warehouses || [];

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState("create");
    const [editPaymentId, setEditPaymentId] = useState("");
    const [detailPaymentId, setDetailPaymentId] = useState("");

    const { data, isLoading, isFetching, refetch } = useGetVendorPaymentsQuery({
        search,
        status,
        from_date: fromDate,
        to_date: toDate,
        warehouse_id: effectiveWarehouseId,
        limit: 100,
    });

    const { data: editPayment } = useGetVendorPaymentByIdQuery(editPaymentId, {
        skip: !editPaymentId || formMode !== "edit",
    });

    const [cancelPayment] = useCancelVendorPaymentMutation();
    const [updateStatus] = useUpdateVendorPaymentStatusMutation();

    const payments = data?.payments || [];
    const summary = data?.meta?.summary || {};

    const openCreate = () => {
        setFormMode("create");
        setEditPaymentId("");
        setShowForm(true);
    };

    const openEdit = (payment) => {
        setFormMode("edit");
        setEditPaymentId(payment.payment_id);
        setDetailPaymentId("");
        setShowForm(true);
    };

    const openDetail = (payment) => {
        setDetailPaymentId(payment.payment_id);
    };

    const handleCancel = async (payment) => {
        if (!window.confirm(`Cancel payment ${payment.payment_number}?`)) return;
        try {
            await cancelPayment(payment.payment_id).unwrap();
            setDetailPaymentId("");
            refetch();
        } catch (err) {
            alert(err?.data?.message || "Failed to cancel payment");
        }
    };

    const handleMarkPaid = async (payment) => {
        try {
            await updateStatus({ paymentId: payment.payment_id, status: "PAID" }).unwrap();
            setDetailPaymentId("");
            refetch();
        } catch (err) {
            alert(err?.data?.message || "Failed to update status");
        }
    };

    const handleEditFromPendingLink = (pendingPaymentId) => {
        if (!pendingPaymentId) return;
        setShowForm(false);
        setFormMode("edit");
        setEditPaymentId(pendingPaymentId);
        setTimeout(() => setShowForm(true), 0);
    };

    return (
        <div className="space-y-5 bg-gray-50 min-h-screen px-1 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Payment Out</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Vendor settlements allocated against purchase bills</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-500 text-sm rounded-lg">
                        <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} /> Refresh
                    </button>
                    {canWrite && (
                        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg">
                            <Plus size={14} /> Record Payment
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase text-gray-500">Total Paid</p>
                    <p className="text-3xl font-bold text-gray-800">{fmtCurrency(summary.total_paid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase text-gray-500">Payments</p>
                    <p className="text-3xl font-bold text-gray-800">{summary.total_payments || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-yellow-100 p-4">
                    <p className="text-xs uppercase text-yellow-600">Pending</p>
                    <p className="text-3xl font-bold text-yellow-700">{summary.pending_count || 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs uppercase text-gray-500">Vendors Paid</p>
                    <p className="text-3xl font-bold text-gray-800">{summary.vendors_paid || 0}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 text-gray-700">
                {isSuperAdmin && (
                    <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[160px]">
                        <option value="">All Warehouses</option>
                        {warehouses.map((w) => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
                    </select>
                )}
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, reference…" className="flex-1 min-w-[180px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                </select>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            {["Payment #", "Date", "Vendor", "Mode", "Amount", "Reference", "Allocated to", "Status", "Actions"].map((h) => (
                                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {(isLoading || isFetching) && (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
                        )}
                        {!isLoading && payments.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No vendor payments recorded yet</td></tr>
                        )}
                        {payments.map((p) => (
                            <tr key={p.payment_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => openDetail(p)}
                                        className="font-mono text-xs text-blue-600 hover:underline"
                                    >
                                        {p.payment_number}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(p.payment_date)}</td>
                                <td className="px-4 py-3">{p.vendor?.company_name}</td>
                                <td className="px-4 py-3 text-xs">{getPaymentMethodLabel(p.payment_method)}</td>
                                <td className="px-4 py-3 font-medium">{fmtCurrency(p.amount)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{p.reference_no || "—"}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    {p.allocations?.map((a) => a.purchase?.purchase_number).join(", ") || "—"}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_BADGE[p.status] || PAYMENT_STATUS_BADGE.PENDING}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {canWrite && (
                                        <div className="flex gap-1">
                                            {p.status === "PENDING" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(p)}
                                                        className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                                                        title="Edit payment"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button type="button" onClick={() => handleMarkPaid(p)} className="text-xs px-2 py-1 border border-green-200 text-green-700 rounded-lg">Mark Paid</button>
                                                </>
                                            )}
                                            <button type="button" onClick={() => handleCancel(p)} className="p-1.5 border border-red-100 rounded-lg text-red-600 hover:bg-red-50">
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <RecordPaymentModal
                open={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditPaymentId("");
                    setFormMode("create");
                }}
                onSaved={refetch}
                isSuperAdmin={isSuperAdmin}
                assignedWarehouseId={warehouseId}
                assignedWarehouseName={user?.locationName || ""}
                initialWarehouseId={warehouseFilter}
                mode={formMode}
                paymentId={editPaymentId}
                initialPayment={formMode === "edit" ? editPayment : null}
                onEditExistingPending={handleEditFromPendingLink}
            />

            <PaymentDetailModal
                open={!!detailPaymentId}
                paymentId={detailPaymentId}
                onClose={() => setDetailPaymentId("")}
                canWrite={canWrite}
                onEdit={(payment) => {
                    setDetailPaymentId("");
                    openEdit(payment);
                }}
                onMarkPaid={handleMarkPaid}
                onCancel={handleCancel}
            />
        </div>
    );
}
