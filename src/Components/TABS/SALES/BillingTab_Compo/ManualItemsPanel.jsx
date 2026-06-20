import React, { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { PlusCircle, FileText } from "lucide-react";
import { addManualItem } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { toast } from "../../../shared/ToastConfig";

export default function ManualItemsPanel() {
    const dispatch = useDispatch();
    const nameRef = useRef(null);

    const [formData, setFormData] = useState({
        itemName: "",
        quantity: 1,
        mrp: "",
        specialPrice: "",
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAddItem = (e) => {
        e.preventDefault();

        const name = formData.itemName.trim();
        if (!name) {
            toast.error("Please enter a product name");
            return;
        }

        const qty = parseInt(formData.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Quantity must be a positive number");
            return;
        }

        const mrpVal = parseFloat(formData.mrp);
        const mrp = isNaN(mrpVal) || mrpVal < 0 ? 0 : mrpVal;

        const priceVal = parseFloat(formData.specialPrice);
        if (isNaN(priceVal) || priceVal < 0) {
            toast.error("Please enter a valid selling price (>= 0)");
            return;
        }

        if (mrp > 0 && priceVal > mrp) {
            toast.error("Selling price cannot exceed the MRP");
            return;
        }

        const itemPayload = {
            id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            item_name: name,
            quantity: qty,
            unit_price: priceVal,
            mrp: mrp || priceVal,
        };

        dispatch(addManualItem(itemPayload));
        toast.success(`"${name}" added to cart`);

        // Reset form
        setFormData({
            itemName: "",
            quantity: 1,
            mrp: "",
            specialPrice: "",
        });

        // Autofocus name input for next item
        if (nameRef.current) {
            nameRef.current.focus();
        }
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-200">
                <FileText className="text-purple-600" size={20} />
                <h2 className="text-sm font-bold text-gray-800">Add Non-Listed Item</h2>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-1">
                    <label htmlFor="itemName" className="text-xs font-semibold text-gray-600 block">
                        Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="itemName"
                        ref={nameRef}
                        type="text"
                        name="itemName"
                        placeholder="e.g. Phenyl, Detol, Broom..."
                        value={formData.itemName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        autoComplete="off"
                        required
                    />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label htmlFor="quantity" className="text-xs font-semibold text-gray-600 block">
                            Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="quantity"
                            type="number"
                            name="quantity"
                            min="1"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="mrp" className="text-xs font-semibold text-gray-600 block">
                            MRP (₹)
                        </label>
                        <input
                            id="mrp"
                            type="number"
                            step="0.01"
                            name="mrp"
                            placeholder="Optional"
                            value={formData.mrp}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="specialPrice" className="text-xs font-semibold text-gray-600 block">
                            Selling Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="specialPrice"
                            type="number"
                            step="0.01"
                            name="specialPrice"
                            placeholder="Price"
                            value={formData.specialPrice}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                        />
                    </div>
                </div>

                <div className="pt-2 mt-auto">
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md shadow-purple-100"
                    >
                        <PlusCircle size={16} />
                        Add Item to Cart
                    </button>
                </div>
            </form>
        </div>
    );
}
