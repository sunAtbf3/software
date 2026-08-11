// TABS/SALES/BillingTab_Compo/VariantPickerModal.jsx
//
// Modal for selecting variant when product has multiple variants
// UPDATED: Default price_type to "SPECIAL" to match backend
// FIXED: Using special_price instead of retail_price

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { X } from "lucide-react";
import { addToCart, closeVariantPicker } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { toast } from "../../../shared/ToastConfig";
import {
    buildBillingCartItem,
    formatGstPercentLabel,
    toBillingNumber,
} from "../../../../utils/billingCart.utils";
import { formatAttributesDisplay } from "../../../../utils/variantAttributes.utils";

export default function VariantPickerModal() {
    const dispatch = useDispatch();
    const { showVariantPicker, variantPickerTarget } = useSelector((state) => state.billing);

    if (!showVariantPicker || !variantPickerTarget) return null;

    const { product_name, variants } = variantPickerTarget;

    const handleSelectVariant = (variant) => {
        const cartItem = buildBillingCartItem({
            variant_id: variant.variant_id,
            product_name,
            system_barcode: variant.system_barcode,
            special_price: variant.special_price,
            wholesale_price: variant.wholesale_price,
            mrp: variant.mrp,
            online_price: variant.online_price,
            retail_price: variant.special_price,
            attributes: variant.attributes,
            gst_percent: variant.gst_percent,
            gst_type: variant.gst_type || "CGST_SGST",
            quantity_available: variant.quantity_available || 999999,
            combo_eligible: variant.combo_eligible === true,
        });
        dispatch(addToCart(cartItem));
        dispatch(closeVariantPicker());
        toast.success(`${variant.sku || variant.system_barcode} added to cart`);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Select Variant</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{product_name}</p>
                    </div>
                    <button onClick={() => dispatch(closeVariantPicker())} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Variant List */}
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {variants.map((variant, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelectVariant(variant)}
                            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                            <p className="font-medium text-gray-800">{variant.sku || "No SKU"}</p>
                            {formatAttributesDisplay(variant.attributes) && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                    {formatAttributesDisplay(variant.attributes)}
                                </p>
                            )}
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-gray-500 font-mono">
                                    Barcode: {variant.system_barcode || "—"}
                                    {formatGstPercentLabel(variant.gst_percent) && (
                                        <span className="ml-2 text-indigo-600 font-sans">
                                            GST {formatGstPercentLabel(variant.gst_percent)}
                                        </span>
                                    )}
                                </p>
                                <p className="font-bold text-blue-600">
                                    ₹{toBillingNumber(variant.special_price).toFixed(2)}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
                    <button
                        onClick={() => dispatch(closeVariantPicker())}
                        className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
    </div>
</div>
    );
}
// down code is old use upper code have updated price handling 

// // TABS/SALES/BillingTab_Compo/VariantPickerModal.jsx
// //
// // Modal for selecting variant when product has multiple variants

// import React from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { X } from "lucide-react";
// import { addToCart, closeVariantPicker } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
// import { toast } from "react-toastify";

// const toNumber = (value, defaultValue = 0) => {
//     const num = Number(value);
//     return isNaN(num) ? defaultValue : num;
// };

// export default function VariantPickerModal() {
//     const dispatch = useDispatch();
//     const { showVariantPicker, variantPickerTarget } = useSelector((state) => state.billing);

//     if (!showVariantPicker || !variantPickerTarget) return null;

//     const { product_name, variants } = variantPickerTarget;

//     const handleSelectVariant = (variant) => {
//         const cartItem = {
//             variant_id: variant.variant_id,
//             product_name: product_name,
//             system_barcode: variant.system_barcode,
//             quantity: 1,
//             price_type: "RETAIL",
//             unit_price: toNumber(variant.retail_price),
//             retail_price: toNumber(variant.retail_price),
//             wholesale_price: toNumber(variant.wholesale_price),
//             mrp: toNumber(variant.mrp),
//             online_price: toNumber(variant.online_price),
//             gst_percent: toNumber(variant.gst_percent),
//             quantity_available: variant.quantity_available || 999999,
//         };
//         dispatch(addToCart(cartItem));
//         dispatch(closeVariantPicker());
//         toast.success(`${variant.sku || variant.system_barcode} added to cart`);
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
//                 {/* Header */}
//                 <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
//                     <div>
//                         <h3 className="text-base font-semibold text-gray-800">Select Variant</h3>
//                         <p className="text-xs text-gray-400 mt-0.5">{product_name}</p>
//                     </div>
//                     <button onClick={() => dispatch(closeVariantPicker())} className="text-gray-400 hover:text-gray-600">
//                         <X size={20} />
//                     </button>
//                 </div>

//                 {/* Variant List */}
//                 <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
//                     {variants.map((variant, idx) => (
//                         <button
//                             key={idx}
//                             onClick={() => handleSelectVariant(variant)}
//                             className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
//                         >
//                             <p className="font-medium text-gray-800">{variant.sku || "No SKU"}</p>
//                             <div className="flex justify-between items-center mt-1">
//                                 <p className="text-xs text-gray-500 font-mono">
//                                     Barcode: {variant.system_barcode || "—"}
//                                 </p>
//                                 <p className="font-bold text-blue-600">
//                                     ₹{toNumber(variant.retail_price).toFixed(2)}
//                                 </p>
//                             </div>
//                         </button>
//                     ))}
//                 </div>

//                 {/* Footer */}
//                 <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
//                     <button
//                         onClick={() => dispatch(closeVariantPicker())}
//                         className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
//                     >
//                         Cancel
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }