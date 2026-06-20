// TABS/SALES/BillingTab_Compo/CheckoutPanel.jsx
//
// Checkout panel - totals, payment method, create bill button
// Calls billingApi to create bill
// FIXED: Added View Bill modal, fixed PDF download
// ADDED: Credit Note integration with customer auto-detection
// FIXED: Changed `remaining_amount` to `balance` to match backend API
// UPDATED: Bill type values to match backend enum (GST_INVOICE | NON_GST_INVOICE)
// UPDATED: Per-bill GST details form + save-to-customer option

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Printer, Download, PlusCircle, Eye, X, Receipt, CheckCircle, Search } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useCreateBillMutation, useLazyGetBillPdfQuery, useGetBillByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
import { useBillDocumentActions } from "../../../../offline/hooks/useBillDocumentActions";
import { useGetCreditNotesQuery, useLazyLookupCreditNoteQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";
import {
    createOfflineBill,
    resolveCustomerForBill,
    shouldUseOfflineBilling,
    refreshBillIfSynced,
    isBillAwaitingSync,
    OFFLINE_EVENTS,
} from "../../../../offline";
import {
    applyLocalSaleDeductions,
    saleLinesFromCart,
} from "../../../../offline/sync/shopStockSync.service";
import { useOfflineShopConfig } from "../../../../offline/hooks/useOfflineShopConfig";
import UpiPaymentModal from "./UpiPaymentModal";
import BillTypeSection from "./BillTypeSection";
import UpiQrDisplayModal from "../../../Billing/UpiQrDisplayModal";
import { formatBankAccountLabel } from "../../../../utils/upiPayment";
import { canShowBillUpiQr } from "../../../../utils/upiQr";
import { formatStaffCodeLabel } from "../../../../utils/staffCode";
import {
    clearCart,
    clearManualCart,
    clearSelectedCustomer,
    setPaymentMethod,
    setLastCreatedBill,
    clearLastCreatedBill,
    openEditCustomer,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import {
    selectCartSubtotal,
    selectCartTotal,
    selectCartItemCount,
    selectCartTaxSummary,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { getStateName } from "../../../../constants/indianStateCodes";
import { BILL_TYPES, getBillTypeLabel, isWithGstBill, isNonListedBill } from "../../../../constants/billingBillTypes";

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const fmtDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

// Bill View Modal Component
const BillViewModal = ({ bill, onClose, onPrint, onDownloadPdf, isPrinting, isPdfLoading }) => {
    if (!bill) return null;
    const totalQty = bill.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto text-gray-700">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Bill Details</h3>
                            <p className="text-xs text-gray-400 font-mono">{bill.bill_number}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3 text-sm">
                            <div><p className="text-xs text-gray-500">Bill Date</p><p className="font-medium text-gray-800">{fmtDateTime(bill.created_at)}</p></div>
                            <div>
                                <p className="text-xs text-gray-500">Bill Type</p>
                                <p className="font-medium text-gray-800">
                                    {getBillTypeLabel(bill.bill_type)}
                                </p>
                            </div>
                            {bill.place_of_supply_state_code && (
                                <div>
                                    <p className="text-xs text-gray-500">Place of Supply</p>
                                    <p className="font-medium text-gray-800">
                                        {getStateName(bill.place_of_supply_state_code)} ({bill.place_of_supply_state_code})
                                    </p>
                                </div>
                            )}
                            <div><p className="text-xs text-gray-500">Payment Status</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${bill.payment_status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{bill.payment_status || "PENDING"}</span></div>
                            <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium text-gray-800">{bill.customer_name || "Walk-in Customer"}</p></div>
                            {bill.staff_code_value && (
                                <div>
                                    <p className="text-xs text-gray-500">Billing Staff</p>
                                    <p className="font-medium text-gray-800">
                                        {bill.staff_code_value} — {bill.staff_name_snapshot}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Items ({totalQty})</p>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
                                <table className="w-full min-w-[720px] lg:min-w-0 text-sm">
                                    <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Price</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {bill.items?.map((item, idx) => (
                                            <tr key={idx}><td className="px-3 py-2"><p className="font-medium text-gray-800">{item.variant?.product?.name || item.product?.name || item.manual_item_name}</p><p className="text-xs text-gray-400">{item.variant?.sku || "—"}</p></td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">₹{toNumber(item.unit_price).toFixed(2)}</td><td className="px-3 py-2 text-right font-semibold">₹{toNumber(item.line_total).toFixed(2)}</td></tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr><td colSpan="3" className="px-3 py-2 text-right font-semibold">Subtotal:</td><td className="px-3 py-2 text-right">₹{toNumber(bill.subtotal).toFixed(2)}</td></tr>
                                        <tr><td colSpan="3" className="px-3 py-2 text-right font-semibold">GST:</td><td className="px-3 py-2 text-right">₹{toNumber(bill.gst_amount).toFixed(2)}</td></tr>
                                        {bill.tax_summary?.cgst > 0 && (
                                            <tr><td colSpan="3" className="px-3 py-2 text-right text-xs text-gray-500">CGST:</td><td className="px-3 py-2 text-right text-xs">₹{toNumber(bill.tax_summary.cgst).toFixed(2)}</td></tr>
                                        )}
                                        {bill.tax_summary?.sgst > 0 && (
                                            <tr><td colSpan="3" className="px-3 py-2 text-right text-xs text-gray-500">SGST:</td><td className="px-3 py-2 text-right text-xs">₹{toNumber(bill.tax_summary.sgst).toFixed(2)}</td></tr>
                                        )}
                                        {bill.tax_summary?.igst > 0 && (
                                            <tr><td colSpan="3" className="px-3 py-2 text-right text-xs text-gray-500">IGST:</td><td className="px-3 py-2 text-right text-xs">₹{toNumber(bill.tax_summary.igst).toFixed(2)}</td></tr>
                                        )}
                                        {bill.credit_applied > 0 && <tr><td colSpan="3" className="px-3 py-2 text-right font-semibold text-green-600">Credit Applied:</td><td className="px-3 py-2 text-right text-green-600">-₹{toNumber(bill.credit_applied).toFixed(2)}</td></tr>}
                                        <tr className="border-t border-gray-200"><td colSpan="3" className="px-3 py-2 text-right font-bold text-lg">Total:</td><td className="px-3 py-2 text-right font-bold text-lg text-blue-600">₹{toNumber(bill.total_amount).toFixed(2)}</td></tr>
                                    </tfoot>
                                </table>
                                </div>
                            </div>
                        </div>
                        {bill.payments && bill.payments.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-medium text-gray-500 mb-2">Payments</p>{bill.payments.map((payment, idx) => (<div key={idx} className="flex justify-between text-sm"><span>{payment.payment_method} • {fmtDateTime(payment.paid_at)}</span><span className="font-medium">₹{toNumber(payment.amount).toFixed(2)}</span></div>))}</div>
                        )}
                        {bill.credit_notes_applied && bill.credit_notes_applied.length > 0 && (
                            <div className="bg-purple-50 rounded-lg p-3"><p className="text-xs font-medium text-purple-800 mb-2">Credit Notes Applied</p>{bill.credit_notes_applied.map((cn, idx) => (<div key={idx} className="flex justify-between text-sm"><span>{cn.credit_note_number}</span><span className="font-medium">₹{toNumber(cn.amount_applied).toFixed(2)}</span></div>))}</div>
                        )}
                    </div>
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => onPrint?.(bill)}
                            disabled={isPrinting || isPdfLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
                        >
                            <Printer size={14} /> {isPrinting ? "Printing…" : "Print"}
                        </button>
                        <button
                            type="button"
                            onClick={() => onDownloadPdf?.(bill)}
                            disabled={isPrinting || isPdfLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                        >
                            <Download size={14} /> {isPdfLoading ? "Loading…" : "Download PDF"}
                        </button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CheckoutPanel({ shop_id }) {
    const dispatch = useDispatch();
    const isOnline = useSelector((state) => state.offline.isOnline);
    const isSyncing = useSelector((state) => state.offline.isSyncing);
    const pendingOutboxCount = useSelector((state) => state.offline.pendingCounts.pending);
    const { user } = useSelector((state) => state.auth);
    const {
        cart,
        manualCart,
        selectedCustomer,
        customerMobileInput,
        billType,
        paymentMethod,
        lastCreatedBill,
    } = useSelector((state) => state.billing);
    const subtotal = useSelector(selectCartSubtotal);
    const total = useSelector(selectCartTotal);
    const itemCount = useSelector(selectCartItemCount);
    const taxSummary = useSelector(selectCartTaxSummary);

    const [createBill, { isLoading: isCreating }] = useCreateBillMutation();
    const [triggerPdf] = useLazyGetBillPdfQuery();
    const { printBill, downloadPdf, isPrinting, isPdfLoading } = useBillDocumentActions({
        triggerServerPdf: triggerPdf,
        isOnline,
    });
    const [createdBillData, setCreatedBillData] = useState(null);
    const [showBillModal, setShowBillModal] = useState(false);
    const [viewBillId, setViewBillId] = useState(null);
    const [viewBillSnapshot, setViewBillSnapshot] = useState(null);
    const [isOfflineCreating, setIsOfflineCreating] = useState(false);
    const isCreatingBill = isOnline ? isCreating : isOfflineCreating;

    const applySyncedBillUpdate = useCallback(async () => {
        const current = createdBillData || lastCreatedBill;
        if (!current || !isBillAwaitingSync(current)) return;

        const refreshed = await refreshBillIfSynced(current);
        if (refreshed.sync_status !== "synced") return;

        setCreatedBillData(refreshed);
        dispatch(setLastCreatedBill(refreshed));

        if (viewBillSnapshot && (viewBillSnapshot.client_bill_id || viewBillSnapshot.bill_id) === (current.client_bill_id || current.bill_id)) {
            setViewBillSnapshot(refreshed);
        }
    }, [createdBillData, lastCreatedBill, dispatch, viewBillSnapshot]);

    useEffect(() => {
        const onSyncDone = () => {
            applySyncedBillUpdate();
        };
        window.addEventListener(OFFLINE_EVENTS.SYNC_COMPLETED, onSyncDone);
        return () => window.removeEventListener(OFFLINE_EVENTS.SYNC_COMPLETED, onSyncDone);
    }, [applySyncedBillUpdate]);

    useEffect(() => {
        const onBillDiscarded = (event) => {
            const discardedId = event.detail?.clientBillId;
            if (!discardedId) return;
            const current = createdBillData || lastCreatedBill;
            const currentId = current?.client_bill_id || current?.bill_id;
            if (currentId && currentId === discardedId) {
                setCreatedBillData(null);
                dispatch(clearLastCreatedBill());
            }
        };
        window.addEventListener(OFFLINE_EVENTS.BILL_DISCARDED, onBillDiscarded);
        return () => window.removeEventListener(OFFLINE_EVENTS.BILL_DISCARDED, onBillDiscarded);
    }, [createdBillData, lastCreatedBill, dispatch]);

    useEffect(() => {
        if (isOnline && !isSyncing && pendingOutboxCount === 0) {
            applySyncedBillUpdate();
        }
    }, [isOnline, isSyncing, pendingOutboxCount, applySyncedBillUpdate]);

    // Credit Note States
    const [selectedCreditNoteIds, setSelectedCreditNoteIds] = useState([]);
    const [searchedCreditNotes, setSearchedCreditNotes] = useState([]);
    const [creditNoteSearchInput, setCreditNoteSearchInput] = useState("");
    const [showCreditAlert, setShowCreditAlert] = useState(false);
    const [dismissedCredit, setDismissedCredit] = useState(false);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
    const [showUpiModal, setShowUpiModal] = useState(false);
    const [showUpiQrBill, setShowUpiQrBill] = useState(null);
    const [selectedStaffCodeId, setSelectedStaffCodeId] = useState("");



    const [lookupCreditNote, { isFetching: isLookingUpCn }] = useLazyLookupCreditNoteQuery();

    const { staffCodes, bankAccounts } = useOfflineShopConfig(shop_id);

    const staffCodesRequired = staffCodes.length > 0;

    // Org-wide pool: customer's credit notes redeemable at this shop counter
    const { data: creditNotesData, refetch: refetchCreditNotes } = useGetCreditNotesQuery({
        redeemable_at_shop: shop_id,
        customer_id: selectedCustomer?.customer_id,
        page: 1,
        limit: 50,
    }, {
        skip: !selectedCustomer?.customer_id || !shop_id || !isOnline || isNonListedBill(billType),
    });

    const availableCreditNotes = creditNotesData?.creditNotes || [];
    const mergedCreditNotes = [
        ...availableCreditNotes,
        ...searchedCreditNotes.filter(
            (s) => !availableCreditNotes.some((a) => a.credit_note_id === s.credit_note_id)
        ),
    ];

    const totalCreditAvailable = mergedCreditNotes.reduce(
        (sum, cn) => sum + toNumber(cn.balance || cn.credit_amount || cn.amount),
        0
    );
    const totalSelectedCredit = mergedCreditNotes
        .filter((cn) => selectedCreditNoteIds.includes(cn.credit_note_id))
        .reduce((sum, cn) => sum + toNumber(cn.balance || cn.credit_amount || cn.amount), 0);

    const finalPayable = Math.max(0, total - totalSelectedCredit);
    const selectedBankAccount =
        bankAccounts.find((a) => a.bank_account_id === selectedBankAccountId) ||
        bankAccounts.find((a) => a.is_default) ||
        bankAccounts[0] ||
        null;

    useEffect(() => {
        if (!bankAccounts.length) {
            setSelectedBankAccountId("");
            return;
        }
        const preferred =
            bankAccounts.find((a) => a.bank_account_id === selectedBankAccountId) ||
            bankAccounts.find((a) => a.is_default) ||
            bankAccounts[0];
        if (preferred && preferred.bank_account_id !== selectedBankAccountId) {
            setSelectedBankAccountId(preferred.bank_account_id);
        }
    }, [bankAccounts, selectedBankAccountId]);

    // Auto-show credit alert when customer is selected and has credit
    useEffect(() => {
        if (selectedCustomer && totalCreditAvailable > 0 && !dismissedCredit) {
            setShowCreditAlert(true);
        }
    }, [selectedCustomer, totalCreditAvailable, dismissedCredit]);

    // Reset credit selection when customer changes
    useEffect(() => {
        setSelectedCreditNoteIds([]);
        setSearchedCreditNotes([]);
        setCreditNoteSearchInput("");
        setShowCreditAlert(false);
        setDismissedCredit(false);
    }, [selectedCustomer]);

    const handleSearchCreditNote = async () => {
        if (!isOnline) {
            toast.error("Credit note lookup requires an internet connection");
            return;
        }
        const number = creditNoteSearchInput.trim();
        if (!number) {
            toast.error("Enter a credit note number");
            return;
        }
        try {
            const cn = await lookupCreditNote({
                credit_note_number: number,
                redeeming_shop_id: shop_id,
            }).unwrap();
            if (!cn.redeemable) {
                toast.error(`Credit note not usable (status: ${cn.status}, balance: ₹${toNumber(cn.balance).toFixed(2)})`);
                return;
            }
            setSearchedCreditNotes((prev) => {
                if (prev.some((p) => p.credit_note_id === cn.credit_note_id)) return prev;
                return [...prev, cn];
            });
            setSelectedCreditNoteIds((prev) =>
                prev.includes(cn.credit_note_id) ? prev : [...prev, cn.credit_note_id]
            );
            toast.success(
                `Credit note found — ₹${toNumber(cn.balance).toFixed(2)} from ${cn.origin_shop?.shop_name || cn.shop?.shop_name || "origin shop"}`
            );
        } catch (err) {
            toast.error(err?.data?.message || "Credit note not found");
        }
    };

    // Fetch bill details for viewing
    const { data: billDetails, refetch: refetchBill } = useGetBillByIdQuery(viewBillId, { skip: !viewBillId });

    const handleViewBill = (billId) => {
        const bill = createdBillData || lastCreatedBill;
        const awaitingSync = isBillAwaitingSync(bill);

        if (awaitingSync) {
            setViewBillSnapshot(bill);
            setViewBillId(null);
            setShowBillModal(true);
            return;
        }

        setViewBillSnapshot(null);
        setViewBillId(billId);
        setShowBillModal(true);
        refetchBill();
    };

    const buildBillPayload = (extra = {}) => {
        const items = billType === BILL_TYPES.NON_LISTED
            ? manualCart.map((item) => ({
                item_name: item.item_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                mrp: item.mrp,
            }))
            : cart.map((item) => ({
                variant_id: item.variant_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                price_type: item.price_type,
            }));

        const payload = {
            shop_id,
            bill_type: billType,
            payment_method: paymentMethod,
            sales_channel: "WALK_IN",
            items,
            credit_note_ids: selectedCreditNoteIds,
            ...extra,
        };

        if (selectedCustomer) {
            payload.customer_id = selectedCustomer.customer_id;
        } else {
            payload.customer_name = customerMobileInput ? customerMobileInput : "Walk-in Customer";
            if (customerMobileInput) payload.customer_mobile = customerMobileInput;
        }

        // Attach GST details for GST Invoice bills
        if (billType === "GST_INVOICE") {
            payload.customer_gstin = selectedCustomer?.gst_number?.trim().toUpperCase() || "";
            payload.company_name = selectedCustomer?.company_name?.trim() || selectedCustomer?.name?.trim() || "";
            payload.address = selectedCustomer?.address?.trim() || "";
            payload.city = selectedCustomer?.city?.trim() || "";
            payload.state_code = selectedCustomer?.state_code?.trim() || "";
            payload.pincode = selectedCustomer?.pincode?.trim() || "";
        }

        if (finalPayable > 0 && paymentMethod) {
            payload.payment_amount = finalPayable;
        }

        const staffId = extra.staff_code_id ?? selectedStaffCodeId;
        if (staffId) {
            payload.staff_code_id = staffId;
        }

        return payload;
    };

    const submitBill = async (extra = {}) => {
        try {
            if (shouldUseOfflineBilling(isOnline)) {
                if (selectedCreditNoteIds.length) {
                    toast.error("Credit notes cannot be applied while offline");
                    return;
                }

                setIsOfflineCreating(true);
                const customerRef = resolveCustomerForBill(selectedCustomer);
                const offlinePayload = {
                    ...buildBillPayload(extra),
                    ...customerRef,
                    customer_id: customerRef.customer_id,
                    credit_note_ids: [],
                    payment_amount: finalPayable > 0 && paymentMethod ? finalPayable : 0,
                    payment_method: paymentMethod || null,
                    bank_account_id: extra.bank_account_id || null,
                    reference_no: extra.reference_no || null,
                };

                const result = await createOfflineBill({
                    user,
                    shopId: shop_id,
                    payload: offlinePayload,
                    cart: billType === BILL_TYPES.NON_LISTED ? manualCart : cart,
                    billType,
                    staffCodeId: (extra.staff_code_id ?? selectedStaffCodeId) || null,
                    offlineCustomerClientId: customerRef.offline_customer_client_id,
                });

                toast.success(`Offline bill ${result.bill_number} saved — will sync when online`);
                setCreatedBillData(result);
                dispatch(setLastCreatedBill(result));
                dispatch(clearCart());
                dispatch(clearManualCart());
                dispatch(clearSelectedCustomer());
                setSelectedCreditNoteIds([]);
                setSearchedCreditNotes([]);
                setCreditNoteSearchInput("");
                setShowUpiModal(false);
                setSelectedStaffCodeId("");
                return;
            }

            const saleLines = billType === BILL_TYPES.NON_LISTED ? [] : saleLinesFromCart(cart);

            const result = await createBill({
                idempotencyKey: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...buildBillPayload(extra),
            }).unwrap();

            try {
                if (saleLines.length > 0) {
                    await applyLocalSaleDeductions(shop_id, saleLines);
                }
            } catch (stockErr) {
                console.error("Local stock cache update after online bill:", stockErr);
            }

            if (result.credit_applied > 0) {
                toast.success(
                    `Bill created! ₹${result.credit_applied.toFixed(2)} credit applied. Remaining credit: ₹${(totalCreditAvailable - result.credit_applied).toFixed(2)}`
                );
            } else {
                toast.success(`Bill ${result.bill_number} created successfully`);
            }

            setCreatedBillData(result);
            dispatch(setLastCreatedBill(result));
            dispatch(clearCart());
            dispatch(clearManualCart());
            // Refresh credit-note pool before clearing customer (skipped queries cannot refetch).
            if (selectedCustomer?.customer_id) {
                refetchCreditNotes();
            }
            dispatch(clearSelectedCustomer());
            setSelectedCreditNoteIds([]);
            setSearchedCreditNotes([]);
            setCreditNoteSearchInput("");
            setShowUpiModal(false);
            setSelectedStaffCodeId("");
        } catch (err) {
            console.error("Bill creation error:", err);
            toast.error(err?.data?.message || err?.message || "Failed to create bill");
            throw err;
        } finally {
            setIsOfflineCreating(false);
        }
    };

    const assertStaffCodeSelected = () => {
        if (staffCodesRequired && !selectedStaffCodeId) {
            toast.error("Select your billing staff code before creating this bill");
            return false;
        }
        return true;
    };

    const handleCreateBill = async () => {
        const isCartEmpty = billType === BILL_TYPES.NON_LISTED 
            ? manualCart.length === 0 
            : cart.length === 0;

        if (isCartEmpty) {
            toast.error("Cart is empty");
            return;
        }

        if (!assertStaffCodeSelected()) return;

        // Validate GST fields client-side before hitting the server
        if (billType === "GST_INVOICE") {
            if (!selectedCustomer) {
                toast.error("Please select a customer for GST Invoice");
                return;
            }
            if (!selectedCustomer.is_gst_registered) {
                toast.error("Selected customer is not GST registered. Please upgrade to GST.");
                dispatch(openEditCustomer());
                return;
            }
            const gn = (selectedCustomer.gst_number || "").trim().toUpperCase();
            const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!selectedCustomer.company_name?.trim()) { toast.error("Company name is required on customer profile for GST Invoice"); return; }
            if (!gn) { toast.error("GST number is required on customer profile for GST Invoice"); return; }
            if (gn.length !== 15 || !GST_REGEX.test(gn)) { toast.error("Invalid GST number format on customer profile (15 characters, e.g. 22AAAAA0000A1Z5)"); return; }
            if (!selectedCustomer.address?.trim()) { toast.error("Address is required on customer profile for GST Invoice"); return; }
            if (!selectedCustomer.city?.trim()) { toast.error("City is required on customer profile for GST Invoice"); return; }
            if (!/^\d{2}$/.test((selectedCustomer.state_code || "").trim())) { toast.error("State code must be 2 digits (e.g. 27 for Maharashtra)"); return; }
            if (!/^\d{6}$/.test((selectedCustomer.pincode || "").trim())) { toast.error("Pincode must be 6 digits"); return; }
        }

        if (!isOnline && selectedCreditNoteIds.length) {
            toast.error("Credit notes cannot be applied while offline");
            return;
        }

        if (paymentMethod === "UPI" && finalPayable > 0) {
            if (!bankAccounts.length) {
                toast.error("No UPI bank account configured. Add one in Settings → Bank Details.");
                return;
            }
            if (!selectedBankAccount?.upi_id) {
                toast.error("Select a bank account with a valid UPI ID");
                return;
            }
            setShowUpiModal(true);
            return;
        }

        await submitBill();
    };

    const handleUpiPaymentConfirm = async ({ reference_no } = {}) => {
        await submitBill({
            bank_account_id: selectedBankAccount.bank_account_id,
            reference_no,
        });
    };

    const handleDownloadPdf = async () => {
        const bill = createdBillData || lastCreatedBill;
        await downloadPdf(bill);
    };

    const handlePrintBill = async () => {
        const bill = createdBillData || lastCreatedBill;
        await printBill(bill);
    };

    const handleNewBill = () => {
        setCreatedBillData(null);
        dispatch(clearLastCreatedBill());
        setSelectedCreditNoteIds([]);
        setSearchedCreditNotes([]);
        setCreditNoteSearchInput("");
        setShowCreditAlert(false);
        setDismissedCredit(false);
        setGstForm(EMPTY_GST_FORM);
        setSaveGstToCustomer(false);
    };

    const handleApplyAllCredit = () => {
        const allIds = mergedCreditNotes.map((cn) => cn.credit_note_id);
        setSelectedCreditNoteIds(allIds);
        setShowCreditAlert(false);
        toast.info(`Applied ₹${totalCreditAvailable.toFixed(2)} credit to this bill`);
    };

    const handleDismissCredit = () => {
        setShowCreditAlert(false);
        setDismissedCredit(true);
    };

    if (createdBillData || lastCreatedBill) {
        const bill = createdBillData || lastCreatedBill;
        const awaitingSync = isBillAwaitingSync(bill);
        const isSyncingBill = awaitingSync && isOnline && isSyncing;
        const wasOfflineBill = Boolean(bill.offline_bill_number);
        const docBusy = isPrinting || isPdfLoading;

        return (
            <>
                <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-3xl mb-2">{isSyncingBill ? "🔄" : "✅"}</div>
                        <p className="font-bold text-green-800">
                            {isSyncingBill
                                ? "Syncing Bill to Server..."
                                : awaitingSync
                                    ? "Bill Saved Offline!"
                                    : wasOfflineBill
                                        ? "Bill Synced Successfully!"
                                        : "Bill Created Successfully!"}
                        </p>
                        <p className="text-sm text-green-700 font-mono mt-1">{bill.bill_number}</p>
                        {wasOfflineBill && !awaitingSync && bill.offline_bill_number && bill.offline_bill_number !== bill.bill_number && (
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                                Offline ref: {bill.offline_bill_number}
                            </p>
                        )}
                        {awaitingSync && !isOnline && (
                            <p className="text-xs text-amber-600 mt-1">Will sync automatically when you&apos;re back online</p>
                        )}
                        {isSyncingBill && (
                            <p className="text-xs text-blue-600 mt-1">Uploading to server...</p>
                        )}
                        {awaitingSync && isOnline && !isSyncing && (
                            <p className="text-xs text-amber-600 mt-1">Waiting to sync — tap Sync in the header if needed</p>
                        )}
                        <p className="text-xs text-green-600 mt-1">Amount: ₹{toNumber(bill.total_amount || bill.total).toFixed(2)}</p>
                        {bill.credit_applied > 0 && (
                            <p className="text-xs text-purple-600 mt-1">Credit Applied: -₹{toNumber(bill.credit_applied).toFixed(2)}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-4">
                            <button onClick={() => handleViewBill(bill.server_bill_id || bill.bill_id || bill.client_bill_id || bill.bill_id)} className="flex-1 min-w-[120px] py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-2"><Eye size={14} /> View Bill</button>
                            {canShowBillUpiQr(bill) && (
                                <button type="button" onClick={() => setShowUpiQrBill(bill)} className="flex-1 min-w-[120px] py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">📱 UPI QR</button>
                            )}
                            <button onClick={handlePrintBill} disabled={docBusy} className="flex-1 min-w-[120px] py-2 border border-green-400 text-green-800 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-60 flex items-center justify-center gap-2"><Printer size={14} /> {isPrinting ? "Printing…" : "Print"}</button>
                            <button onClick={handleDownloadPdf} disabled={docBusy} className="flex-1 min-w-[120px] py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"><Download size={14} /> {isPdfLoading ? "Loading..." : "Download PDF"}</button>
                            <button onClick={handleNewBill} className="flex-1 min-w-[120px] py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 flex items-center justify-center gap-2"><PlusCircle size={14} /> New Bill</button>
                        </div>
                    </div>
                </div>
                <UpiQrDisplayModal
                    open={Boolean(showUpiQrBill)}
                    bill={showUpiQrBill}
                    onClose={() => setShowUpiQrBill(null)}
                />
                {showBillModal && (viewBillSnapshot || billDetails) && (
                    <BillViewModal
                        bill={viewBillSnapshot || billDetails}
                        onPrint={printBill}
                        onDownloadPdf={downloadPdf}
                        isPrinting={isPrinting}
                        isPdfLoading={isPdfLoading}
                        onClose={() => {
                            setShowBillModal(false);
                            setViewBillId(null);
                            setViewBillSnapshot(null);
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <div className="mt-4 pt-3 border-t border-gray-200">
            {/* <div className="mb-3 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Search size={14} /> Search credit note (any shop)
                </p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={creditNoteSearchInput}
                        onChange={(e) => setCreditNoteSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearchCreditNote()}
                        placeholder="e.g. CN-20260603-0001"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                    <button
                        type="button"
                        onClick={handleSearchCreditNote}
                        disabled={isLookingUpCn}
                        className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-60"
                    >
                        {isLookingUpCn ? "..." : "Find"}
                    </button>
                </div>
                {searchedCreditNotes.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {searchedCreditNotes.map((cn) => (
                            <div
                                key={cn.credit_note_id}
                                className="flex justify-between items-center text-xs bg-purple-50 border border-purple-100 rounded px-2 py-1.5"
                            >
                                <span className="font-mono text-purple-800">{cn.credit_note_number}</span>
                                <span className="text-purple-600">
                                    ₹{toNumber(cn.balance).toFixed(2)} · {cn.origin_shop?.shop_name || cn.shop?.shop_name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div> */}

            {showCreditAlert && totalCreditAvailable > 0 && (
                <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Receipt size={18} className="text-purple-600" />
                        <div>
                            <p className="text-sm font-medium text-purple-800">Credit Available!</p>
                            <p className="text-xs text-purple-600">You have ₹{totalCreditAvailable.toFixed(2)} in credit notes</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleApplyAllCredit} className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700">Apply to Bill</button>
                        <button onClick={handleDismissCredit} className="px-3 py-1 border border-purple-300 text-purple-600 text-xs rounded-lg hover:bg-purple-50">Dismiss</button>
                    </div>
                </div>
            )}

            {selectedCustomer && mergedCreditNotes.length > 0 && totalSelectedCredit === 0 && !showCreditAlert && (
                <div className="mb-3 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setShowCreditAlert(true)}>
                        <Receipt size={14} className="text-purple-600" />
                        <span className="text-xs font-medium text-gray-700">You have ₹{totalCreditAvailable.toFixed(2)} credit available</span>
                        <span className="text-xs text-purple-600 ml-auto">Click to apply →</span>
                    </div>
                </div>
            )}

            {totalSelectedCredit > 0 && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-600" />
                            <span className="text-xs font-medium text-green-800">Credit Applied: -₹{totalSelectedCredit.toFixed(2)}</span>
                        </div>
                        <button onClick={() => setSelectedCreditNoteIds([])} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                    <div className="mt-1 text-xs text-green-600">{selectedCreditNoteIds.length} credit note(s) applied</div>
                </div>
            )}

            {/* 1. Added a 2-column grid container around everything */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">

                {/* LEFT SIDE: Your exact billing staff section */}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-gray-700 flex flex-col justify-between">
                    <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">
                            Billing Staff Code (required for this bill)
                        </label>
                        <select
                            value={selectedStaffCodeId}
                            onChange={(e) => setSelectedStaffCodeId(e.target.value)}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white"
                        >
                            <option value="">— Select your code —</option>
                            {staffCodes.map((sc) => (
                                <option key={sc.staff_code_id} value={sc.staff_code_id}>
                                    {formatStaffCodeLabel(sc)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-2">
                        Shared login stays active — pick your code for each bill. Cleared after bill is saved.
                    </p>
                </div>


                <BillTypeSection />
            </div>

            {/* Warning alert if selected customer is not GST registered */}
            {billType === "GST_INVOICE" && selectedCustomer && !selectedCustomer.is_gst_registered && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                        <span className="font-semibold block mb-0.5">GST Details Required</span>
                        This customer is not registered for GST. You need to upgrade them to create a GST Invoice.
                    </div>
                    <button
                        type="button"
                        onClick={() => dispatch(openEditCustomer())}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm shrink-0 ml-3 cursor-pointer"
                    >
                        Upgrade Customer
                    </button>
                </div>
            )}

            {/* Top Phase: Price Calculation Matrix */}
            <div className="space-y-1 mb-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                        {isWithGstBill(billType) ? `Sub Total (${itemCount} items):` : `Sub Total (${itemCount} items):`}
                    </span>
                    <span className="font-medium text-gray-800">₹{toNumber(subtotal).toFixed(2)}</span>
                </div>
                {isWithGstBill(billType) && taxSummary.gst_amount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">GST:</span>
                        <span className="font-medium text-gray-800">₹{toNumber(taxSummary.gst_amount).toFixed(2)}</span>
                    </div>
                )}
                {isWithGstBill(billType) && taxSummary.gst_amount > 0 && (
                    <>
                        {taxSummary.cgst > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 pl-2">
                                <span>CGST</span>
                                <span>₹{toNumber(taxSummary.cgst).toFixed(2)}</span>
                            </div>
                        )}
                        {taxSummary.sgst > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 pl-2">
                                <span>SGST</span>
                                <span>₹{toNumber(taxSummary.sgst).toFixed(2)}</span>
                            </div>
                        )}
                        {taxSummary.igst > 0 && (
                            <div className="flex justify-between text-xs text-gray-500 pl-2">
                                <span>IGST</span>
                                <span>₹{toNumber(taxSummary.igst).toFixed(2)}</span>
                            </div>
                        )}
                    </>
                )}
                {totalSelectedCredit > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                        <span>Credit Applied:</span>
                        <span>-₹{totalSelectedCredit.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-lg font-bold text-gray-800">NET PAYABLE:</span>
                    <span className="text-2xl font-black text-blue-600">₹{finalPayable.toFixed(2)}</span>
                </div>
            </div>

            {/* Bottom Phase: Intelligent Conditional Layout */}
            <div className="space-y-3">

                {/* Master Action Grid Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">

                    {/* Column 1: Payment Method Selection */}
                    <div className="text-gray-700">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => dispatch(setPaymentMethod(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none"
                        >
                            <option value="CASH">💵 Cash</option>
                            <option value="UPI">📱 UPI</option>
                            <option value="CARD">💳 Card</option>
                        </select>
                    </div>

                    {/* Column 2: UPI Bank Account (Only shows when UPI is active) */}
                    {paymentMethod === "UPI" && finalPayable > 0 ? (
                        <div className="text-gray-700 max-w-full min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">UPI Bank Account</label>
                            {bankAccounts.length === 0 ? (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 truncate">
                                    No UPI account configured.
                                </p>
                            ) : (
                                <select
                                    value={selectedBankAccountId}
                                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none truncate"
                                    style={{ textOverflow: 'ellipsis', maxWidth: '100%' }}
                                >
                                    {bankAccounts.map((account) => (
                                        <option key={account.bank_account_id} value={account.bank_account_id} className="text-xs">
                                            {formatBankAccountLabel(account)} — {account.upi_id}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    ) : (
                        /* Column 2 Alternative: Inline Action button for Cash & Card selection types */
                        <button
                            onClick={handleCreateBill}
                            disabled={(isNonListedBill(billType) ? manualCart.length === 0 : cart.length === 0) || isCreatingBill}
                            className={`w-full py-2.5 rounded-lg font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${(isNonListedBill(billType) ? manualCart.length === 0 : cart.length === 0) ? "bg-gray-300 cursor-not-allowed shadow-none" : "bg-green-600 hover:bg-green-700"
                                }`}
                        >
                            {isCreatingBill ? (
                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                            ) : (
                                <><Printer size={16} /> Create Bill & {totalSelectedCredit > 0 ? "Apply Credit" : "Print"}</>
                            )}
                        </button>
                    )}
                </div>

                {/* Full-Width Lower Execution Area: Renders only when UPI selection mode shifts down here */}
                {paymentMethod === "UPI" && finalPayable > 0 && (
                    <button
                        onClick={handleCreateBill}
                        disabled={(isNonListedBill(billType) ? manualCart.length === 0 : cart.length === 0) || isCreatingBill}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${(isNonListedBill(billType) ? manualCart.length === 0 : cart.length === 0) ? "bg-gray-300 cursor-not-allowed shadow-none" : "bg-green-600 hover:bg-green-700 hover:shadow-lg"
                            }`}
                    >
                        {isCreatingBill ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Bill...</>
                        ) : (
                            <><Printer size={18} /> Show UPI QR & Collect ₹{finalPayable.toFixed(2)}</>
                        )}
                    </button>
                )}
            </div>

            <UpiPaymentModal
                open={showUpiModal}
                onClose={() => setShowUpiModal(false)}
                onConfirm={handleUpiPaymentConfirm}
                account={selectedBankAccount}
                amount={finalPayable}
                isConfirming={isCreatingBill}
            />
        </div>
    );
}

// // TABS/SALES/BillingTab_Compo/CheckoutPanel.jsx
// //
// // Checkout panel - totals, payment method, create bill button
// // Calls billingApi to create bill
// // FIXED: Added View Bill modal, fixed PDF download
// // ADDED: Credit Note integration with customer auto-detection
// // FIXED: Changed `remaining_amount` to `balance` to match backend API

// import React, { useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { Printer, Download, PlusCircle, Eye, X, Receipt, CheckCircle } from "lucide-react";
// import { toast } from "react-toastify";
// import { useCreateBillMutation, useLazyGetBillPdfQuery, useGetBillByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingApi";
// import { useGetCreditNotesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";
// import {
//     clearCart,
//     clearSelectedCustomer,
//     setBillType,
//     setPaymentMethod,
//     setLastCreatedBill,
//     clearLastCreatedBill,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
// import { selectCartSubtotal, selectCartGst, selectCartTotal, selectCartItemCount } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";

// const toNumber = (value, defaultValue = 0) => {
//     const num = Number(value);
//     return isNaN(num) ? defaultValue : num;
// };

// const fmtDateTime = (iso) => {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleString("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit"
//     });
// };

// // Bill View Modal Component
// const BillViewModal = ({ bill, onClose }) => {
//     if (!bill) return null;
//     const totalQty = bill.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-gray-700">
//             <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
//                 <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
//                     <div>
//                         <h3 className="text-base font-semibold text-gray-800">Bill Details</h3>
//                         <p className="text-xs text-gray-400 font-mono">{bill.bill_number}</p>
//                     </div>
//                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
//                 </div>
//                 <div className="p-6 space-y-4">
//                     <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-3 text-sm">
//                         <div><p className="text-xs text-gray-500">Bill Date</p><p className="font-medium text-gray-800">{fmtDateTime(bill.created_at)}</p></div>
//                         <div><p className="text-xs text-gray-500">Bill Type</p><p className="font-medium text-gray-800">{bill.bill_type}</p></div>
//                         <div><p className="text-xs text-gray-500">Payment Status</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${bill.payment_status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{bill.payment_status || "PENDING"}</span></div>
//                         <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium text-gray-800">{bill.customer_name || "Walk-in Customer"}</p></div>
//                     </div>
//                     <div>
//                         <p className="text-sm font-medium text-gray-700 mb-2">Items ({totalQty})</p>
//                         <div className="border border-gray-200 rounded-lg overflow-hidden">
//                             <table className="w-full text-sm">
//                                 <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Product</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Qty</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Price</th><th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Total</th></tr></thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                     {bill.items?.map((item, idx) => (
//                                         <tr key={idx}><td className="px-3 py-2"><p className="font-medium text-gray-800">{item.variant?.product?.name || item.product?.name}</p><p className="text-xs text-gray-400">{item.variant?.sku || "—"}</p></td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">₹{toNumber(item.unit_price).toFixed(2)}</td><td className="px-3 py-2 text-right font-semibold">₹{toNumber(item.line_total).toFixed(2)}</td></tr>
//                                     ))}
//                                 </tbody>
//                                 <tfoot className="bg-gray-50">
//                                     <tr><td colSpan="3" className="px-3 py-2 text-right font-semibold">Subtotal:</td><td className="px-3 py-2 text-right">₹{toNumber(bill.subtotal).toFixed(2)}</td></tr>
//                                     <tr><td colSpan="3" className="px-3 py-2 text-right font-semibold">GST:</td><td className="px-3 py-2 text-right">₹{toNumber(bill.gst_amount).toFixed(2)}</td></tr>
//                                     {bill.credit_applied > 0 && <tr><td colSpan="3" className="px-3 py-2 text-right font-semibold text-green-600">Credit Applied:</td><td className="px-3 py-2 text-right text-green-600">-₹{toNumber(bill.credit_applied).toFixed(2)}</td></tr>}
//                                     <tr className="border-t border-gray-200"><td colSpan="3" className="px-3 py-2 text-right font-bold text-lg">Total:</td><td className="px-3 py-2 text-right font-bold text-lg text-blue-600">₹{toNumber(bill.total_amount).toFixed(2)}</td></tr>
//                                 </tfoot>
//                             </table>
//                         </div>
//                     </div>
//                     {bill.payments && bill.payments.length > 0 && (
//                         <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-medium text-gray-500 mb-2">Payments</p>{bill.payments.map((payment, idx) => (<div key={idx} className="flex justify-between text-sm"><span>{payment.payment_method} • {fmtDateTime(payment.paid_at)}</span><span className="font-medium">₹{toNumber(payment.amount).toFixed(2)}</span></div>))}</div>
//                     )}
//                     {bill.credit_notes_applied && bill.credit_notes_applied.length > 0 && (
//                         <div className="bg-purple-50 rounded-lg p-3"><p className="text-xs font-medium text-purple-800 mb-2">Credit Notes Applied</p>{bill.credit_notes_applied.map((cn, idx) => (<div key={idx} className="flex justify-between text-sm"><span>{cn.credit_note_number}</span><span className="font-medium">₹{toNumber(cn.amount_applied).toFixed(2)}</span></div>))}</div>
//                     )}
//                 </div>
//                 <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Close</button></div>
//             </div>
//         </div>
//     );
// };

// export default function CheckoutPanel({ shop_id }) {
//     const dispatch = useDispatch();
//     const { cart, selectedCustomer, customerMobileInput, billType, paymentMethod, lastCreatedBill } = useSelector((state) => state.billing);
//     const subtotal = useSelector(selectCartSubtotal);
//     const gstAmount = useSelector(selectCartGst);
//     const total = useSelector(selectCartTotal);
//     const itemCount = useSelector(selectCartItemCount);

//     const [createBill, { isLoading: isCreating }] = useCreateBillMutation();
//     const [triggerPdf, { isLoading: isPdfLoading }] = useLazyGetBillPdfQuery();
//     const [createdBillData, setCreatedBillData] = useState(null);
//     const [showBillModal, setShowBillModal] = useState(false);
//     const [viewBillId, setViewBillId] = useState(null);

//     // Credit Note States
//     const [selectedCreditNoteIds, setSelectedCreditNoteIds] = useState([]);
//     const [showCreditAlert, setShowCreditAlert] = useState(false);
//     const [dismissedCredit, setDismissedCredit] = useState(false);

//     // Fetch available credit notes for the customer (when customer is selected)
//     const { data: creditNotesData, refetch: refetchCreditNotes } = useGetCreditNotesQuery({
//         status: "ACTIVE",
//         shop_id: shop_id,
//         customer_id: selectedCustomer?.customer_id,
//         page: 1,
//         limit: 50,
//     }, {
//         skip: !selectedCustomer?.customer_id,
//     });

//     const availableCreditNotes = creditNotesData?.creditNotes || [];
//     // FIXED: Changed `remaining_amount` to `balance` to match backend API
//     const totalCreditAvailable = availableCreditNotes.reduce((sum, cn) => sum + toNumber(cn.balance || cn.credit_amount || cn.amount), 0);
//     const totalSelectedCredit = availableCreditNotes
//         .filter(cn => selectedCreditNoteIds.includes(cn.credit_note_id))
//         .reduce((sum, cn) => sum + toNumber(cn.balance || cn.credit_amount || cn.amount), 0);

//     // Auto-show credit alert when customer is selected and has credit
//     useEffect(() => {
//         if (selectedCustomer && totalCreditAvailable > 0 && !dismissedCredit) {
//             setShowCreditAlert(true);
//         }
//     }, [selectedCustomer, totalCreditAvailable, dismissedCredit]);

//     // Reset credit selection when customer changes
//     useEffect(() => {
//         setSelectedCreditNoteIds([]);
//         setShowCreditAlert(false);
//         setDismissedCredit(false);
//     }, [selectedCustomer]);

//     // Fetch bill details for viewing
//     const { data: billDetails, refetch: refetchBill } = useGetBillByIdQuery(viewBillId, { skip: !viewBillId });

//     const handleViewBill = (billId) => {
//         setViewBillId(billId);
//         setShowBillModal(true);
//         refetchBill();
//     };

//     const handleCreateBill = async () => {
//         if (cart.length === 0) {
//             toast.error("Cart is empty");
//             return;
//         }

//         const items = cart.map(item => ({
//             variant_id: item.variant_id,
//             quantity: item.quantity,
//             unit_price: item.unit_price,
//             price_type: item.price_type,
//         }));

//         const payload = {
//             shop_id,
//             bill_type: billType,
//             payment_method: paymentMethod,
//             sales_channel: "WALK_IN",
//             items,
//             credit_note_ids: selectedCreditNoteIds,
//         };

//         if (selectedCustomer) {
//             payload.customer_id = selectedCustomer.customer_id;
//         } else {
//             payload.customer_name = customerMobileInput ? customerMobileInput : "Walk-in Customer";
//             if (customerMobileInput) payload.customer_mobile = customerMobileInput;
//         }

//         try {
//             const result = await createBill({
//                 idempotencyKey: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//                 ...payload,
//             }).unwrap();

//             if (result.credit_applied > 0) {
//                 toast.success(`Bill created! ₹${result.credit_applied.toFixed(2)} credit applied. Remaining credit: ₹${(totalCreditAvailable - result.credit_applied).toFixed(2)}`);
//             } else {
//                 toast.success(`Bill ${result.bill_number} created successfully`);
//             }

//             setCreatedBillData(result);
//             dispatch(setLastCreatedBill(result));
//             dispatch(clearCart());
//             dispatch(clearSelectedCustomer());
//             setSelectedCreditNoteIds([]);
//             refetchCreditNotes();
//         } catch (err) {
//             console.error("Bill creation error:", err);
//             toast.error(err?.data?.message || "Failed to create bill");
//         }
//     };

//     const handleDownloadPdf = async () => {
//         const billId = createdBillData?.bill_id || lastCreatedBill?.bill_id;
//         if (!billId) {
//             toast.error("No bill available to download");
//             return;
//         }

//         try {
//             const response = await triggerPdf(billId).unwrap();
//             const isBlob = response && typeof response === "object" && typeof response.size === "number";
//             if (isBlob) {
//                 const blob = new Blob([response], { type: "application/pdf" });
//                 const url = window.URL.createObjectURL(blob);
//                 const a = document.createElement("a");
//                 a.href = url;
//                 a.download = `invoice-${billId}.pdf`;
//                 document.body.appendChild(a);
//                 a.click();
//                 window.URL.revokeObjectURL(url);
//                 document.body.removeChild(a);
//                 toast.success("PDF downloaded");
//             } else {
//                 toast.error("PDF generation failed");
//             }
//         } catch (err) {
//             console.error("PDF download error:", err);
//             toast.error(err?.data?.message || "Failed to download PDF");
//         }
//     };

//     const handleNewBill = () => {
//         setCreatedBillData(null);
//         dispatch(clearLastCreatedBill());
//         setSelectedCreditNoteIds([]);
//         setShowCreditAlert(false);
//         setDismissedCredit(false);
//     };

//     const handleApplyAllCredit = () => {
//         const allIds = availableCreditNotes.map(cn => cn.credit_note_id);
//         setSelectedCreditNoteIds(allIds);
//         setShowCreditAlert(false);
//         toast.info(`Applied ₹${totalCreditAvailable.toFixed(2)} credit to this bill`);
//     };

//     const handleDismissCredit = () => {
//         setShowCreditAlert(false);
//         setDismissedCredit(true);
//     };

//     const finalPayable = Math.max(0, total - totalSelectedCredit);

//     if (createdBillData || lastCreatedBill) {
//         const bill = createdBillData || lastCreatedBill;
//         return (
//             <>
//                 <div className="mt-4 pt-3 border-t border-gray-200">
//                     <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
//                         <div className="text-3xl mb-2">✅</div>
//                         <p className="font-bold text-green-800">Bill Created Successfully!</p>
//                         <p className="text-sm text-green-700 font-mono mt-1">{bill.bill_number}</p>
//                         <p className="text-xs text-green-600 mt-1">Amount: ₹{toNumber(bill.total_amount || bill.total).toFixed(2)}</p>
//                         {bill.credit_applied > 0 && (
//                             <p className="text-xs text-purple-600 mt-1">Credit Applied: -₹{toNumber(bill.credit_applied).toFixed(2)}</p>
//                         )}
//                         <div className="flex gap-2 mt-4">
//                             <button onClick={() => handleViewBill(bill.bill_id)} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-2"><Eye size={14} /> View Bill</button>
//                             <button onClick={handleDownloadPdf} disabled={isPdfLoading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"><Download size={14} /> {isPdfLoading ? "Loading..." : "Download PDF"}</button>
//                             <button onClick={handleNewBill} className="flex-1 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 flex items-center justify-center gap-2"><PlusCircle size={14} /> New Bill</button>
//                         </div>
//                     </div>
//                 </div>
//                 {showBillModal && billDetails && <BillViewModal bill={billDetails} onClose={() => { setShowBillModal(false); setViewBillId(null); }} />}
//             </>
//         );
//     }

//     return (
//         <div className="mt-4 pt-3 border-t border-gray-200">
//             {showCreditAlert && totalCreditAvailable > 0 && (
//                 <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
//                     <div className="flex items-center gap-2">
//                         <Receipt size={18} className="text-purple-600" />
//                         <div>
//                             <p className="text-sm font-medium text-purple-800">Credit Available!</p>
//                             <p className="text-xs text-purple-600">You have ₹{totalCreditAvailable.toFixed(2)} in credit notes</p>
//                         </div>
//                     </div>
//                     <div className="flex gap-2">
//                         <button onClick={handleApplyAllCredit} className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700">Apply to Bill</button>
//                         <button onClick={handleDismissCredit} className="px-3 py-1 border border-purple-300 text-purple-600 text-xs rounded-lg hover:bg-purple-50">Dismiss</button>
//                     </div>
//                 </div>
//             )}

//             {selectedCustomer && availableCreditNotes.length > 0 && totalSelectedCredit === 0 && !showCreditAlert && (
//                 <div className="mb-3 border border-gray-200 rounded-lg p-3">
//                     <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setShowCreditAlert(true)}>
//                         <Receipt size={14} className="text-purple-600" />
//                         <span className="text-xs font-medium text-gray-700">You have ₹{totalCreditAvailable.toFixed(2)} credit available</span>
//                         <span className="text-xs text-purple-600 ml-auto">Click to apply →</span>
//                     </div>
//                 </div>
//             )}

//             {totalSelectedCredit > 0 && (
//                 <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
//                     <div className="flex justify-between items-center">
//                         <div className="flex items-center gap-2">
//                             <CheckCircle size={14} className="text-green-600" />
//                             <span className="text-xs font-medium text-green-800">Credit Applied: -₹{totalSelectedCredit.toFixed(2)}</span>
//                         </div>
//                         <button onClick={() => setSelectedCreditNoteIds([])} className="text-xs text-red-500 hover:text-red-700">Remove</button>
//                     </div>
//                     <div className="mt-1 text-xs text-green-600">{selectedCreditNoteIds.length} credit note(s) applied</div>
//                 </div>
//             )}

//             <div className="flex gap-2 mb-3">
//                 <button onClick={() => dispatch(setBillType("ESTIMATE"))} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${billType === "ESTIMATE" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>📄 Estimate</button>
//                 <button onClick={() => dispatch(setBillType("GST_INVOICE"))} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${billType === "GST_INVOICE" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>🧾 GST Invoice</button>
//             </div>

//             <div className="space-y-1 mb-3">
//                 <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal ({itemCount} items):</span><span className="font-medium text-gray-800">₹{toNumber(subtotal).toFixed(2)}</span></div>
//                 {billType === "GST_INVOICE" && (<div className="flex justify-between text-sm"><span className="text-gray-500">Total GST:</span><span className="font-medium text-gray-800">₹{toNumber(gstAmount).toFixed(2)}</span></div>)}
//                 {totalSelectedCredit > 0 && (<div className="flex justify-between text-sm text-green-600"><span>Credit Applied:</span><span>-₹{totalSelectedCredit.toFixed(2)}</span></div>)}
//                 <div className="flex justify-between items-center pt-2"><span className="text-lg font-bold text-gray-800">NET PAYABLE:</span><span className="text-2xl font-black text-blue-600">₹{finalPayable.toFixed(2)}</span></div>
//             </div>

//             <div className="mb-3 text-gray-700">
//                 <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
//                 <select value={paymentMethod} onChange={(e) => dispatch(setPaymentMethod(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
//                     <option value="CASH">💵 Cash</option>
//                     <option value="UPI">📱 UPI</option>
//                     <option value="CARD">💳 Card</option>
//                 </select>
//             </div>

//             <button onClick={handleCreateBill} disabled={cart.length === 0 || isCreating} className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${cart.length === 0 ? "bg-gray-300 cursor-not-allowed shadow-none" : "bg-green-600 hover:bg-green-700 hover:shadow-lg"}`}>
//                 {isCreating ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Bill...</>) : (<><Printer size={18} /> Create Bill & {totalSelectedCredit > 0 ? "Apply Credit" : "Print"}</>)}
//             </button>
//         </div>
//     );
// }