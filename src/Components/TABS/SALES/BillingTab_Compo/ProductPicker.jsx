// TABS/SALES/BillingTab_Compo/ProductPicker.jsx
//
// Product grid for billing - shows products from shop-stocks API
// Single variant → add directly, multiple variants → open picker
// FIXED: Quantity increment on multiple scans, garbage barcode filtering
// UPDATED: Default price_type to "SPECIAL" to match backend
// FIXED: Using special_price instead of retail_price

import React, { useState, useRef } from "react";
import { Package, CloudOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useShopStocksForBilling } from "../../../../offline/hooks/useShopStocksForBilling";
import { shopStockRepository } from "../../../../offline/db/repositories/dataRepository";
import { mapLocalStockToBarcodeProduct } from "../../../../offline/utils/offlineStockAdapter";
import { addToCart, updateCartQty } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
import { useLazyGetProductByBarcodeQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
import { toast } from "../../../shared/ToastConfig";
import {
    buildBillingCartItem,
    canIncreaseCartQuantity,
    formatGstPercentLabel,
    resolveBillingStockAvailable,
    resolveProductGstPercent,
    resolveProductGstType,
    toBillingNumber,
} from "../../../../utils/billingCart.utils";
import { formatAttributesDisplay } from "../../../../utils/variantAttributes.utils";
import BarcodeScanner from "./BarcodeScanner";

const resolveStockImageUrl = (variant, product) =>
    variant?.images?.[0]?.url
    || product?.variants?.[0]?.images?.[0]?.url
    || null;

function ProductThumb({ src, alt }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return <Package size={16} className="text-gray-300" />;
    }

    return (
        <img
            src={src}
            alt={alt || "Product"}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
        />
    );
}

// Valid barcode pattern: alphanumeric, dash, underscore, min 3 chars
const isValidBarcode = (barcode) => {
    if (!barcode || typeof barcode !== 'string') return false;
    if (barcode.length < 3) return false;
    // Allow alphanumeric, dash, underscore, colon (EAN-13 uses numbers only)
    return /^[a-zA-Z0-9\-_:]+$/.test(barcode);
};

export default function ProductPicker({ shop_id, cart = [] }) {
    const dispatch = useDispatch();
    const isOnline = useSelector((state) => state.offline.isOnline);
    const [searchTerm, setSearchTerm] = useState("");
    const [showScanner, setShowScanner] = useState(false);
    const [triggerBarcodeSearch] = useLazyGetProductByBarcodeQuery();
    const lastScanTimeRef = useRef(0);

    const { stocks, isLoading, isFetching, usingOfflineCache, refetch } = useShopStocksForBilling(shop_id);

    const addProductToCart = (result, barcode) => {
        const productName = result.name || result.product_name || "Product";
        const variantId = result.variant_id;
        const stockAvailable = resolveBillingStockAvailable(result, stocks);
        const existingItem = cart.find((item) => item.variant_id === variantId);

        if (existingItem) {
            const newQuantity = existingItem.quantity + 1;
            if (!canIncreaseCartQuantity(existingItem.quantity, existingItem.quantity_available)) {
                toast.error(`Only ${existingItem.quantity_available} available for ${productName}`);
                return;
            }
            dispatch(updateCartQty({
                variant_id: variantId,
                quantity: newQuantity,
            }));
            toast.success(`${productName} quantity increased to ${newQuantity}`);
            return;
        }

        if (stockAvailable === 0) {
            toast.error(`${productName} is out of stock`);
            return;
        }
        if (!canIncreaseCartQuantity(0, stockAvailable)) {
            toast.error(`Cannot add ${productName} — insufficient stock`);
            return;
        }

        const cartItem = buildBillingCartItem({
            variant_id: variantId,
            product_name: productName,
            system_barcode: result.system_barcode || barcode,
            special_price: result.special_price,
            wholesale_price: result.wholesale_price,
            mrp: result.mrp,
            online_price: result.online_price,
            retail_price: result.special_price ?? result.retail_price,
            gst_percent: result.gst_percent ?? resolveProductGstPercent(result.product),
            gst_type: result.gst_type ?? resolveProductGstType(result.product),
            hsn_code: result.hsn_code ?? result.product?.hsn_code,
            quantity_available: stockAvailable,
            attributes: result.attributes,
        });
        dispatch(addToCart(cartItem));
        // toast.success(`${productName} added to cart`);
    };

    const handleBarcodeScan = async (barcode) => {
        // Debounce: ignore scans within 500ms
        const now = Date.now();
        if (now - lastScanTimeRef.current < 500) {
            console.log("Ignoring duplicate scan within 500ms");
            return;
        }
        lastScanTimeRef.current = now;

        // Validate barcode format
        if (!isValidBarcode(barcode)) {
            console.warn("Invalid barcode ignored:", barcode);
            return; // Silently ignore garbage scans
        }

        try {
            if (!isOnline) {
                const localRow = await shopStockRepository.getByBarcode(barcode);
                const result = mapLocalStockToBarcodeProduct(localRow);
                if (result) {
                    addProductToCart(result, barcode);
                } else {
                    toast.error("Product not found in offline catalog");
                }
                return;
            }

            const result = await triggerBarcodeSearch(
                shop_id ? { barcode, shop_id } : barcode
            ).unwrap();
            if (result) {
                addProductToCart(result, barcode);
            } else {
                console.warn("Product not found for barcode:", barcode);
            }
        } catch (err) {
            const localRow = await shopStockRepository.getByBarcode(barcode);
            const fallback = mapLocalStockToBarcodeProduct(localRow);
            if (fallback) {
                addProductToCart(fallback, barcode);
                return;
            }
            console.warn("Barcode search failed for:", barcode, err?.status);
            toast.error("Product not found");
        }
    };

    // Filter products client-side
    const filteredStocks = stocks.filter((stock) => {
        const term = searchTerm.toLowerCase();
        const productName = stock.variant?.product?.name?.toLowerCase() || "";
        const barcode = stock.variant?.system_barcode?.toLowerCase() || "";
        const sku = stock.variant?.sku?.toLowerCase() || "";
        return productName.includes(term) || barcode.includes(term) || sku.includes(term);
    });

    const handleProductClick = (stock) => {
        const variant = stock.variant;
        const product = variant?.product;
        
        // Check if product already exists in cart
        const existingItem = cart.find(item => item.variant_id === variant.variant_id);
        
        if (existingItem) {
            const newQuantity = existingItem.quantity + 1;
            if (!canIncreaseCartQuantity(existingItem.quantity, existingItem.quantity_available)) {
                toast.error(`Only ${existingItem.quantity_available} available for ${product?.name}`);
                return;
            }
            dispatch(updateCartQty({ 
                variant_id: variant.variant_id, 
                quantity: newQuantity 
            }));
            // toast.success(`${product?.name} quantity increased to ${newQuantity}`);
        } else {
            if (stock.quantity_available === 0) {
                toast.error(`${product?.name} is out of stock`);
                return;
            }
            const cartItem = buildBillingCartItem({
                variant_id: variant.variant_id,
                product_name: product?.name || "Unknown",
                system_barcode: variant.system_barcode,
                special_price: variant.special_price,
                wholesale_price: variant.wholesale_price,
                mrp: variant.mrp,
                online_price: variant.online_price,
                retail_price: variant.special_price,
                gst_percent: resolveProductGstPercent(product),
                gst_type: resolveProductGstType(product),
                hsn_code: product?.hsn_code,
                quantity_available: stock.quantity_available,
                attributes: variant?.attributes,
            });
            dispatch(addToCart(cartItem));
            // toast.success(`${product?.name} added to cart`);
        }
    };

    if (isLoading && !stocks.length) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Barcode Scanner */}
            <BarcodeScanner
                products={[]}
                onProductFound={handleBarcodeScan}
                showScanner={showScanner}
                setShowScanner={setShowScanner}
                disabled={false}
            />

            {/* Search Input */}
            {usingOfflineCache && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    <CloudOff size={12} />
                    <span>
                        {!isOnline
                            ? `Offline product catalog${isFetching ? " (refreshing when online…)" : ""}`
                            : "Server stock list unavailable — showing last synced catalog"}
                    </span>
                </div>
            )}
            <div className="relative mb-3">
                <input
                    type="text"
                    placeholder="🔍 Search by product name, barcode, or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500"
                />
            </div>

            {/* Refresh button for stock */}
            <button
                onClick={() => refetch()}
                className="text-xs text-blue-500 text-right mb-2 hover:text-blue-700"
            >
                ↻ Refresh stock
            </button>

            {/* Product Grid — 2 per row, rows sized to content only (no stretch) */}
            <div className="grid grid-cols-2 gap-2 auto-rows-min content-start items-start overflow-y-auto flex-1 pr-1 min-h-0">
                {filteredStocks.length === 0 ? (
                    <div className="col-span-2 text-center text-gray-400 py-8">
                        No products found in this shop
                    </div>
                ) : (
                    filteredStocks.map((stock) => {
                        const variant = stock.variant;
                        const product = variant?.product;
                        const imageUrl = resolveStockImageUrl(variant, product);
                        const stockQty = toBillingNumber(stock.quantity_available);
                        const lowStockThreshold = toBillingNumber(stock.low_stock_threshold);
                        const isLowStock = stockQty <= lowStockThreshold && stockQty > 0;
                        const isOutOfStock = stockQty === 0;
                        const gstLabel = formatGstPercentLabel(resolveProductGstPercent(product));
                        const attrLabel = formatAttributesDisplay(variant?.attributes);

                        return (
                            <button
                                key={stock.shop_stock_id}
                                type="button"
                                onClick={() => handleProductClick(stock)}
                                disabled={isOutOfStock}
                                className={`self-start w-full text-left p-1.5 border transition-colors flex items-center gap-2 ${
                                    isOutOfStock
                                        ? "opacity-60 bg-gray-50 border-gray-200 cursor-not-allowed"
                                        : "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer"
                                }`}
                            >
                                <div className="w-10 h-10 shrink-0 border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                                    <ProductThumb
                                        src={imageUrl}
                                        alt={variant?.images?.[0]?.alt_text || product?.variants?.[0]?.images?.[0]?.alt_text || product?.name}
                                    />
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                                        {product?.name || "Unknown"}
                                    </p>
                                    {attrLabel && (
                                        <p className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                                            {attrLabel}
                                        </p>
                                    )}
                                    <div className="mt-1 flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span className="text-xs font-bold text-blue-600 shrink-0">
                                                ₹{toBillingNumber(variant.special_price).toFixed(0)}
                                            </span>
                                            {gstLabel && (
                                                <span className="text-[10px] text-gray-500 truncate">
                                                    GST {gstLabel}
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`shrink-0 text-[10px] px-1.5 py-0.5 font-medium whitespace-nowrap ${
                                                isOutOfStock
                                                    ? "bg-gray-100 text-gray-500"
                                                    : isLowStock
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-green-100 text-green-700"
                                            }`}
                                        >
                                            {isOutOfStock ? "Out" : `${stockQty} left`}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
// down code is old use upper code they have update prices handling 
// // TABS/SALES/BillingTab_Compo/ProductPicker.jsx
// //
// // Product grid for billing - shows products from shop-stocks API
// // Single variant → add directly, multiple variants → open picker
// // FIXED: Quantity increment on multiple scans, garbage barcode filtering

// import React, { useState, useRef } from "react";
// import { useDispatch } from "react-redux";
// import { useGetShopStocksQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/ShopStock_api/shopStockApi";
// import { addToCart, updateCartQty } from "../../../../REDUX_FEATURES/REDUX_SLICES/Billing_api/billingSlice";
// import BarcodeScanner from "./BarcodeScanner";
// import { useLazyGetProductByBarcodeQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
// import { toast } from "react-toastify";

// const toNumber = (value, defaultValue = 0) => {
//     const num = Number(value);
//     return isNaN(num) ? defaultValue : num;
// };

// // Valid barcode pattern: alphanumeric, dash, underscore, min 3 chars
// const isValidBarcode = (barcode) => {
//     if (!barcode || typeof barcode !== 'string') return false;
//     if (barcode.length < 3) return false;
//     // Allow alphanumeric, dash, underscore, colon (EAN-13 uses numbers only)
//     return /^[a-zA-Z0-9\-_:]+$/.test(barcode);
// };

// export default function ProductPicker({ shop_id, cart = [] }) {
//     const dispatch = useDispatch();
//     const [searchTerm, setSearchTerm] = useState("");
//     const [showScanner, setShowScanner] = useState(false);
//     const [triggerBarcodeSearch] = useLazyGetProductByBarcodeQuery();
//     const lastScanTimeRef = useRef(0);
//     const lastSuccessfulBarcodeRef = useRef(null);

//     const { data, isLoading, isFetching, refetch } = useGetShopStocksQuery({
//         shop_id,
//         limit: 100,
//     });

//     const stocks = data?.stocks || [];

//     // Handle barcode scan result - WITH QUANTITY INCREMENT ON SAME PRODUCT
//     const handleBarcodeScan = async (barcode) => {
//         // Debounce: ignore scans within 500ms
//         const now = Date.now();
//         if (now - lastScanTimeRef.current < 500) {
//             console.log("Ignoring duplicate scan within 500ms");
//             return;
//         }
//         lastScanTimeRef.current = now;

//         // Validate barcode format
//         if (!isValidBarcode(barcode)) {
//             console.warn("Invalid barcode ignored:", barcode);
//             return; // Silently ignore garbage scans
//         }

//         try {
//             const result = await triggerBarcodeSearch(barcode).unwrap();
//             if (result) {
//                 // Check if product already exists in cart
//                 const existingItem = cart.find(item => item.variant_id === result.variant_id);
                
//                 if (existingItem) {
//                     // INCREMENT QUANTITY - don't add duplicate
//                     const newQuantity = existingItem.quantity + 1;
//                     dispatch(updateCartQty({ 
//                         variant_id: result.variant_id, 
//                         quantity: newQuantity 
//                     }));
//                     toast.success(`${result.name} quantity increased to ${newQuantity}`);
//                 } else {
//                     // Add new item to cart
//                     const cartItem = {
//                         variant_id: result.variant_id,
//                         product_name: result.name,
//                         system_barcode: result.system_barcode || barcode,
//                         quantity: 1,
//                         price_type: "RETAIL",
//                         unit_price: toNumber(result.retail_price),
//                         retail_price: toNumber(result.retail_price),
//                         wholesale_price: toNumber(result.wholesale_price),
//                         mrp: toNumber(result.mrp),
//                         online_price: toNumber(result.online_price),
//                         gst_percent: toNumber(result.gst_percent),
//                         quantity_available: 999999,
//                         line_total: toNumber(result.retail_price),
//                         gst_amount: (toNumber(result.retail_price) * toNumber(result.gst_percent)) / 100,
//                     };
//                     dispatch(addToCart(cartItem));
//                     toast.success(`${result.name} added to cart`);
//                 }
//                 lastSuccessfulBarcodeRef.current = barcode;
//             } else {
//                 console.warn("Product not found for barcode:", barcode);
//             }
//         } catch (err) {
//             // Silently fail for garbage scans - don't show error toast
//             console.warn("Barcode search failed for:", barcode, err?.status);
//         }
//     };

//     // Filter products client-side
//     const filteredStocks = stocks.filter((stock) => {
//         const term = searchTerm.toLowerCase();
//         const productName = stock.variant?.product?.name?.toLowerCase() || "";
//         const barcode = stock.variant?.system_barcode?.toLowerCase() || "";
//         const sku = stock.variant?.sku?.toLowerCase() || "";
//         return productName.includes(term) || barcode.includes(term) || sku.includes(term);
//     });

//     const handleProductClick = (stock) => {
//         const variant = stock.variant;
//         const product = variant?.product;
        
//         // Check if product already exists in cart
//         const existingItem = cart.find(item => item.variant_id === variant.variant_id);
        
//         if (existingItem) {
//             // INCREMENT QUANTITY
//             const newQuantity = existingItem.quantity + 1;
//             dispatch(updateCartQty({ 
//                 variant_id: variant.variant_id, 
//                 quantity: newQuantity 
//             }));
//             toast.success(`${product?.name} quantity increased to ${newQuantity}`);
//         } else {
//             // Add new item
//             const cartItem = {
//                 variant_id: variant.variant_id,
//                 product_name: product?.name || "Unknown",
//                 system_barcode: variant.system_barcode,
//                 quantity: 1,
//                 price_type: "RETAIL",
//                 unit_price: toNumber(variant.retail_price),
//                 retail_price: toNumber(variant.retail_price),
//                 wholesale_price: toNumber(variant.wholesale_price),
//                 mrp: toNumber(variant.mrp),
//                 online_price: toNumber(variant.online_price),
//                 gst_percent: toNumber(variant.gst_percent),
//                 quantity_available: toNumber(stock.quantity_available),
//                 line_total: toNumber(variant.retail_price),
//                 gst_amount: (toNumber(variant.retail_price) * toNumber(variant.gst_percent)) / 100,
//             };
//             dispatch(addToCart(cartItem));
//             toast.success(`${product?.name} added to cart`);
//         }
//     };

//     if (isLoading || isFetching) {
//         return (
//             <div className="flex justify-center py-12">
//                 <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//             </div>
//         );
//     }

//     return (
//         <div className="h-full flex flex-col">
//             {/* Barcode Scanner */}
//             <BarcodeScanner
//                 products={[]}
//                 onProductFound={handleBarcodeScan}
//                 showScanner={showScanner}
//                 setShowScanner={setShowScanner}
//                 disabled={false}
//             />

//             {/* Search Input */}
//             <div className="relative mb-3">
//                 <input
//                     type="text"
//                     placeholder="🔍 Search by product name, barcode, or SKU..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500"
//                 />
//             </div>

//             {/* Refresh button for stock */}
//             <button
//                 onClick={() => refetch()}
//                 className="text-xs text-blue-500 text-right mb-2 hover:text-blue-700"
//             >
//                 ↻ Refresh stock
//             </button>

//             {/* Product Grid */}
//             <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1">
//                 {filteredStocks.length === 0 ? (
//                     <div className="col-span-3 text-center text-gray-400 py-8">
//                         No products found in this shop
//                     </div>
//                 ) : (
//                     filteredStocks.map((stock) => {
//                         const variant = stock.variant;
//                         const product = variant?.product;
//                         const stockQty = toNumber(stock.quantity_available);
//                         const lowStockThreshold = toNumber(stock.low_stock_threshold);
//                         const isLowStock = stockQty <= lowStockThreshold && stockQty > 0;
//                         const isOutOfStock = stockQty === 0;

//                         return (
//                             <button
//                                 key={stock.shop_stock_id}
//                                 onClick={() => handleProductClick(stock)}
//                                 disabled={isOutOfStock}
//                                 className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between h-24 ${
//                                     isOutOfStock
//                                         ? "opacity-50 bg-gray-50 border-gray-200 cursor-not-allowed"
//                                         : "bg-white border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer"
//                                 }`}
//                             >
//                                 <p className="font-medium text-sm text-gray-800 line-clamp-2">
//                                     {product?.name || "Unknown"}
//                                 </p>
//                                 <div className="mt-auto flex justify-between items-end w-full">
//                                     <div>
//                                         <p className="text-xs text-gray-500 font-mono">
//                                             {variant?.system_barcode?.slice(-6) || "—"}
//                                         </p>
//                                         <p className="font-bold text-blue-600">
//                                             ₹{toNumber(variant.retail_price).toFixed(2)}
//                                         </p>
//                                     </div>
//                                     <span
//                                         className={`text-xs px-1.5 py-0.5 rounded font-medium ${
//                                             isOutOfStock
//                                                 ? "bg-gray-100 text-gray-500"
//                                                 : isLowStock
//                                                 ? "bg-red-100 text-red-700"
//                                                 : "bg-green-100 text-green-700"
//                                         }`}
//                                     >
//                                         {isOutOfStock ? "Out" : stockQty} left
//                                     </span>
//                                 </div>
//                             </button>
//                         );
//                     })
//                 )}
//             </div>
//         </div>
//     );
// }