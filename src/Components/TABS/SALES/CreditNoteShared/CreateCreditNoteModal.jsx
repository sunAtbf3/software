// TABS/SALES/CreditNoteShared/CreateCreditNoteModal.jsx
//
// Create Credit Note Modal - Issue credit note for product returns
// Searches customer, selects bill, chooses items to return

import React, { useState } from "react";
import { X, Search, User, Receipt } from "lucide-react";
import { toast } from "../../../shared/ToastConfig";
import { useCreateCreditNoteMutation, useGetBillsForCreditNoteQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/CreditNote_api/creditNoteApi";
import { useLazySearchCustomersQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Customer_api/customerApi"
import { normalizeCustomerSearchResults } from "../../../../utils/customerForm.utils";

const toNumber = (value, defaultValue = 0) => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function CreateCreditNoteModal({ shop_id, onSuccess, onClose }) {
    // Step 1: Customer Search
    const [searchMobile, setSearchMobile] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [triggerSearchCustomers, { data: searchResults, isLoading: isSearching }] = useLazySearchCustomersQuery();
    
    // Step 2: Bill Selection
    const [selectedBill, setSelectedBill] = useState(null);
    const { data: billsData } = useGetBillsForCreditNoteQuery({
        page: 1,
        limit: 50,
        shop_id,
        customer_id: selectedCustomer?.customer_id || "",
    }, { skip: !selectedCustomer?.customer_id });
    
    // Step 3: Item Selection
    const [selectedItems, setSelectedItems] = useState([]);
    const [reason, setReason] = useState("");
    const [restoreStock, setRestoreStock] = useState(true);
    
    const [createCreditNote, { isLoading: isCreating }] = useCreateCreditNoteMutation();
    
    const customers = normalizeCustomerSearchResults(searchResults);
    const bills = billsData?.bills || [];

    // Search customer by mobile
    const handleSearchCustomer = () => {
        if (searchMobile.length === 10) {
            triggerSearchCustomers({ mobile: searchMobile });
        } else {
            toast.error("Enter 10-digit mobile number");
        }
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setSearchMobile("");
        setSelectedBill(null);
        setSelectedItems([]);
    };

    const handleSelectBill = (bill) => {
        setSelectedBill(bill);
        // Initialize items with bill items
        const initialItems = bill.items?.map(item => ({
            variant_id: item.variant_id,
            product_name: item.variant?.product?.name || item.product?.name,
            sku: item.variant?.sku,
            quantity: 0,
            max_quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
        })) || [];
        setSelectedItems(initialItems);
    };

    const handleUpdateItemQuantity = (variantId, newQuantity) => {
        setSelectedItems(prev => prev.map(item =>
            item.variant_id === variantId
                ? { ...item, quantity: Math.min(Math.max(0, newQuantity), item.max_quantity) }
                : item
        ));
    };

    const handleSelectAllItems = (checked) => {
        setSelectedItems(prev => prev.map(item => ({
            ...item,
            quantity: checked ? item.max_quantity : 0,
        })));
    };

    const handleCreateCreditNote = async () => {
        if (!selectedBill) {
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

        try {
            const result = await createCreditNote({
                idempotencyKey: `cn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                original_bill_id: selectedBill.bill_id,
                items: itemsToReturn.map(item => ({
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
            toast.error(err?.data?.message || "Failed to create credit note");
        }
    };

    const totalReturnAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const anyItemSelected = selectedItems.some(item => item.quantity > 0);
    const allItemsSelected = selectedItems.length > 0 && selectedItems.every(item => item.quantity === item.max_quantity);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                            <Receipt size={18} className="text-blue-600" />
                            Create Credit Note
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Issue credit note for product returns</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 text-gray-700">
                    {/* Step 1: Search Customer */}
                    <div className="border-b pb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <User size={14} /> Find Customer
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                placeholder="Enter 10-digit mobile number"
                                value={searchMobile}
                                onChange={(e) => setSearchMobile(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                onKeyPress={(e) => e.key === "Enter" && handleSearchCustomer()}
                            />
                            <button
                                onClick={handleSearchCustomer}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                            >
                                <Search size={16} />
                            </button>
                        </div>
                        
                        {isSearching && <p className="text-xs text-gray-400 mt-2">Searching...</p>}
                        
                        {customers.length > 0 && !selectedCustomer && (
                            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                                {customers.map(customer => (
                                    <button
                                        key={customer.customer_id}
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
                                    onClick={() => {
                                        setSelectedCustomer(null);
                                        setSelectedBill(null);
                                        setSelectedItems([]);
                                    }}
                                    className="text-xs text-red-500"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Bill */}
                    {selectedCustomer && (
                        <div className="border-b pb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Receipt size={14} /> Select Original Bill
                            </p>
                            <select
                                value={selectedBill?.bill_id || ""}
                                onChange={(e) => {
                                    const bill = bills.find(b => b.bill_id === e.target.value);
                                    if (bill) handleSelectBill(bill);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="">Select a bill</option>
                                {bills.map(bill => (
                                    <option key={bill.bill_id} value={bill.bill_id}>
                                        {bill.bill_number} - ₹{toNumber(bill.total_amount).toFixed(2)} - {fmtDate(bill.created_at)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Step 3: Select Items to Return */}
                    {selectedBill && selectedItems.length > 0 && (
                        <div className="border-b pb-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium text-gray-700">Select Items to Return</p>
                                <button
                                    onClick={() => handleSelectAllItems(!allItemsSelected)}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    {allItemsSelected ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {selectedItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{item.product_name}</p>
                                            <p className="text-xs text-gray-400">
                                                {item.sku || "—"} • Max: {item.max_quantity} units
                                            </p>
                                        </div>
                                        <div className="w-24">
                                            <input
                                                type="number"
                                                min="0"
                                                max={item.max_quantity}
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItemQuantity(item.variant_id, parseInt(e.target.value) || 0)}
                                                className="w-full px-2 py-1 border rounded text-sm text-center"
                                            />
                                        </div>
                                        <div className="w-20 text-right">
                                            <p className="text-sm font-semibold">₹{toNumber(item.unit_price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {totalReturnAmount > 0 && (
                                <div className="mt-3 text-right">
                                    <p className="text-sm font-semibold">
                                        Total Return Amount: <span className="text-blue-600">₹{totalReturnAmount.toFixed(2)}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Reason & Stock Restore */}
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
                                    Restore stock to shop (add returned products back to inventory)
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateCreditNote}
                        disabled={isCreating || !selectedBill || !anyItemSelected || !reason.trim()}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                    >
                        {isCreating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Creating...
                            </>
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