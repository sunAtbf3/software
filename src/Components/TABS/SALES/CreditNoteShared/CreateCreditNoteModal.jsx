// TABS/SALES/CreditNoteShared/CreateCreditNoteModal.jsx
//
// Create Credit Note — phone or exact bill number (walk-in + registered, cross-shop).
// Restocks the returning shop. Return qty prefills remaining billed qty.

import React, { useState } from "react";
import { X, Search, User, Receipt } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import {
    useCreateCreditNoteMutation,
    useLazyGetOriginalBillsForReturnQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";
import { useLazySearchCustomersQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi";
import { normalizeCustomerSearchResults } from "../../../../utils/customerForm.utils";
import { getApiErrorMessage } from "../../../../utils/apiErrorMessage";

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const mapBillItems = (bill) =>
    (bill?.items || []).map((item) => {
        const remaining = Number(
            item.remaining_quantity != null ? item.remaining_quantity : item.quantity || 0
        );
        return {
            variant_id: item.variant_id,
            product_name: item.product_name || item.variant?.product?.name || item.product?.name,
            sku: item.variant?.sku,
            product_code: item.variant?.product_code || item.product_code,
            quantity: 0,
            max_quantity: remaining,
            unit_price: item.unit_price,
            line_total: item.line_total,
        };
    });

export default function CreateCreditNoteModal({ shop_id, onSuccess, onClose }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [matchedBills, setMatchedBills] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [reason, setReason] = useState("");
    const [restoreStock, setRestoreStock] = useState(true);

    const [triggerSearchCustomers, { data: searchResults, isLoading: isSearchingCustomers }] =
        useLazySearchCustomersQuery();
    const [fetchOriginalBills, { isFetching: isSearchingBills }] =
        useLazyGetOriginalBillsForReturnQuery();
    const [createCreditNote, { isLoading: isCreating }] = useCreateCreditNoteMutation();

    const customers = normalizeCustomerSearchResults(searchResults);
    const isSearching = isSearchingCustomers || isSearchingBills;

    const resetBillState = () => {
        setSelectedBill(null);
        setSelectedItems([]);
    };

    const applyBills = (bills = []) => {
        setMatchedBills(Array.isArray(bills) ? bills : []);
        resetBillState();
        if (bills.length === 1 && Number(bills[0].remaining_return_qty) > 0) {
            handleSelectBill(bills[0]);
        }
    };

    const handleSearch = async () => {
        const query = String(searchQuery || "").trim();
        if (!query) {
            toast.error("Enter mobile number or bill number");
            return;
        }
        try {
            setSelectedCustomer(null);
            const digits = query.replace(/\D/g, "").slice(-10);
            if (digits.length === 10) {
                await triggerSearchCustomers({ mobile: digits }).unwrap().catch(() => null);
            }
            const data = await fetchOriginalBills({
                q: query,
                shop_id,
            }).unwrap();
            applyBills(data?.bills || []);
            if (!(data?.bills || []).length) {
                toast.error("No returnable bill found for this number");
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to search bills"));
        }
    };

    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setSearchQuery("");
        resetBillState();
        try {
            const data = await fetchOriginalBills({
                customer_id: customer.customer_id,
                shop_id,
            }).unwrap();
            applyBills(data?.bills || []);
            if (!(data?.bills || []).length) {
                toast.error("No returnable bills for this customer");
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to load customer bills"));
        }
    };

    const handleSelectBill = (bill) => {
        if (!bill) return;
        if (Number(bill.remaining_return_qty) <= 0) {
            toast.error("All items on this bill are already returned");
            return;
        }
        setSelectedBill(bill);
        setSelectedItems(mapBillItems(bill));
    };

    const handleToggleReturnItem = (variantId, checked) => {
        setSelectedItems((prev) =>
            prev.map((item) =>
                item.variant_id === variantId
                    ? { ...item, quantity: checked ? item.max_quantity : 0 }
                    : item
            )
        );
    };

    const handleUpdateItemQuantity = (variantId, newQuantity) => {
        setSelectedItems((prev) =>
            prev.map((item) =>
                item.variant_id === variantId
                    ? { ...item, quantity: Math.min(Math.max(0, newQuantity), item.max_quantity) }
                    : item
            )
        );
    };

    const handleSelectAllItems = (checked) => {
        setSelectedItems((prev) =>
            prev.map((item) => ({
                ...item,
                quantity: checked ? item.max_quantity : 0,
            }))
        );
    };

    const handleCreateCreditNote = async () => {
        if (!selectedBill) {
            toast.error("Please select a bill");
            return;
        }

        const itemsToReturn = selectedItems.filter((item) => item.quantity > 0);
        if (itemsToReturn.length === 0) {
            toast.error("Please select at least one item to return");
            return;
        }

        if (!reason.trim()) {
            toast.error("Please enter a reason for return");
            return;
        }

        try {
            const result = await createCreditNote({
                idempotencyKey: `cn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                original_bill_id: selectedBill.bill_id,
                shop_id,
                items: itemsToReturn.map((item) => ({
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                })),
                reason: reason.trim(),
                restore_stock: restoreStock,
            }).unwrap();

            toast.success(`Credit note ${result.credit_note_number} created successfully`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error("Create credit note error:", err);
            toast.error(getApiErrorMessage(err, "Failed to create credit note"));
        }
    };

    const totalReturnAmount = selectedItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
    );
    const anyItemSelected = selectedItems.some((item) => item.quantity > 0);
    const allItemsSelected =
        selectedItems.length > 0 &&
        selectedItems.every((item) => item.quantity === item.max_quantity);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 bg-black/40" />

                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <Receipt size={18} className="text-blue-600" />
                                Create Credit Note
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Search mobile or bill number — walk-in and registered
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5 text-gray-700">
                        <div className="border-b pb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <User size={14} /> Find original bill
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Mobile number or bill / invoice number"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                >
                                    <Search size={16} />
                                </button>
                            </div>

                            {isSearching && <p className="text-xs text-gray-400 mt-2">Searching...</p>}

                            {customers.length > 0 && !selectedCustomer && (
                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                                    {customers.map((customer) => (
                                        <button
                                            key={customer.customer_id}
                                            type="button"
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="w-full text-left p-2 hover:bg-gray-50 rounded-lg"
                                        >
                                            <p className="font-medium">{customer.name}</p>
                                            <p className="text-xs text-gray-500">{customer.mobile}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedCustomer && (
                                <div className="mt-2 p-2 bg-green-50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-green-800">{selectedCustomer.name}</p>
                                        <p className="text-xs text-green-600">{selectedCustomer.mobile}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            setMatchedBills([]);
                                            resetBillState();
                                        }}
                                        className="text-xs text-red-500"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>

                        {matchedBills.length > 0 && (
                            <div className="border-b pb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Receipt size={14} /> Select Original Bill
                                </p>
                                <select
                                    value={selectedBill?.bill_id || ""}
                                    onChange={(e) => {
                                        const bill = matchedBills.find((b) => b.bill_id === e.target.value);
                                        if (bill) handleSelectBill(bill);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">Select a bill</option>
                                    {matchedBills.map((bill) => (
                                        <option key={bill.bill_id} value={bill.bill_id}>
                                            {bill.bill_number} — ₹{toNumber(bill.total_amount).toFixed(2)} —{" "}
                                            {fmtDate(bill.created_at)}
                                            {bill.shop?.shop_name ? ` — ${bill.shop.shop_name}` : ""}
                                            {bill.customer_name ? ` — ${bill.customer_name}` : " — Walk-in"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedBill && selectedItems.length > 0 && (
                            <div className="border-b pb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm font-medium text-gray-700">Select Items to Return</p>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllItems(!allItemsSelected)}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        {allItemsSelected ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">
                                    Tick only the items to return. Credit note amount is for those items only — not the full bill.
                                </p>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 border rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={item.quantity > 0}
                                                onChange={(e) =>
                                                    handleToggleReturnItem(item.variant_id, e.target.checked)
                                                }
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{item.product_name}</p>
                                                <p className="text-xs">
                                                    <span className="font-semibold text-blue-600">{item.product_code || item.sku || "—"}</span>
                                                    <span className="text-gray-400"> • Billed: {item.max_quantity}</span>
                                                </p>
                                            </div>
                                            <div className="w-28">
                                                <label className="block text-[10px] text-gray-400 mb-0.5">Return qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.max_quantity}
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        handleUpdateItemQuantity(
                                                            item.variant_id,
                                                            parseInt(e.target.value, 10) || 0
                                                        )
                                                    }
                                                    className="w-full px-2 py-1 border rounded text-sm text-center"
                                                />
                                            </div>
                                            <div className="w-24 text-right">
                                                <p className="text-[10px] text-gray-400">Credit</p>
                                                <p className="text-sm font-semibold">
                                                    ₹{(item.quantity * toNumber(item.unit_price)).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 flex justify-between items-center">
                                    <p className="text-xs text-gray-500">
                                        {selectedItems.filter((i) => i.quantity > 0).length} item(s) selected
                                    </p>
                                    <p className="text-sm font-semibold">
                                        Credit note amount:{" "}
                                        <span className="text-blue-600">₹{totalReturnAmount.toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {selectedBill && anyItemSelected && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Return Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        placeholder="e.g., Product defective, Wrong item, Customer returned, Size issue"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="restoreStock"
                                        checked={restoreStock}
                                        onChange={(e) => setRestoreStock(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor="restoreStock" className="text-sm text-gray-700">
                                        Restore stock to this shop (add returned products to current shop inventory)
                                    </label>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateCreditNote}
                            disabled={isCreating || !selectedBill || !anyItemSelected || !reason.trim()}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : anyItemSelected ? (
                                `Create Credit Note · ₹${totalReturnAmount.toFixed(2)}`
                            ) : (
                                "Create Credit Note"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
