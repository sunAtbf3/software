// TABS/INVENTORY/ProductShared/ProductView.jsx
//
// Read-only modal for viewing product details.
// FIXED: Display special_price, purchase_price, expenses instead of retail/wholesale

import React from "react";
import { useDispatch } from "react-redux";
import { closeViewModal } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
import { useGetProductByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";

const toNumber = (val, defaultVal = 0) => {
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
};

const getImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (img?.url) return img.url;
  return null;
};

export default function ProductView({ productId, onClose }) {
  const dispatch = useDispatch();
  
  const { data: product, isLoading, isError } = useGetProductByIdQuery(productId, {
    skip: !productId,
  });

  const handleClose = () => {
    if (onClose) onClose();
    dispatch(closeViewModal());
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/50" />

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading product details...</p>
        </div>
    </div>
</div>
    );
  }

  if (isError || !product) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/50" />

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 text-center">
          <p className="text-red-500">Failed to load product details</p>
          <button onClick={handleClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">Close</button>
        </div>
    </div>
</div>
    );
  }

  const primaryVariant = product.primary_variant || product.variants?.[0] || {};
  const allVariants = product.variants || [];
  const extraVariants = allVariants.slice(1);
  const mainImages = primaryVariant.images || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/50" />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Product Details</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {product.product_code} — {product.name}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Basic Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-28 text-gray-500">Product Code:</span>
                  <span className="font-mono text-gray-800">{product.product_code}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-500">Name:</span>
                  <span className="text-gray-800">{product.name}</span>
                </div>
                {product.title && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Title (SEO):</span>
                    <span className="text-gray-600 italic">{product.title}</span>
                  </div>
                )}
                {product.brand_name && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Brand:</span>
                    <span className="text-gray-800">{product.brand_name}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="w-28 text-gray-500">Unit:</span>
                  <span className="text-gray-800">{product.unit_of_measure}</span>
                </div>
                {product.description && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Description:</span>
                    <span className="text-gray-600">{product.description}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Classification</h4>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-28 text-gray-500">Vendor:</span>
                  <span className="text-gray-800">{product.primary_vendor?.company_name || "-"}</span>
                </div>
                {product.primary_vendor?.city && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Vendor City:</span>
                    <span className="text-gray-600">{product.primary_vendor.city}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="w-28 text-gray-500">Category:</span>
                  <span className="text-gray-800">{product.category?.name || "-"}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-500">Warehouse:</span>
                  <span className="text-gray-800">{product.warehouse?.warehouse_name || "-"}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tax & Compliance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-28 text-gray-500">HSN Code:</span>
                  <span className="font-mono text-gray-800">{product.hsn_code || "-"}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-500">GST %:</span>
                  <span className="text-gray-800">{toNumber(product.gst_percent)}%</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-500">GST Type:</span>
                  <span className="text-gray-800">{product.gst_type || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pricing (Main Variant)</h4>
              <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-500">MRP:</span>
                  <span className="font-bold text-red-600">₹{toNumber(primaryVariant.mrp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Special Price:</span>
                  <span className="font-semibold text-blue-600">₹{toNumber(primaryVariant.special_price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Wholesale Price:</span>
                  <span className="font-semibold text-indigo-600">₹{toNumber(primaryVariant.wholesale_price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchase Price:</span>
                  <span className="font-semibold text-green-600">₹{toNumber(primaryVariant.purchase_price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expenses:</span>
                  <span className="text-gray-600">₹{toNumber(primaryVariant.expenses).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Warranty:</span>
                  <span className="text-gray-800">{primaryVariant.warranty || product.warranty || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchase Code:</span>
                  <span className="font-mono text-gray-600">{primaryVariant.purchase_code || "-"}</span>
                </div>
                {primaryVariant.online_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Online:</span>
                    <span className="font-semibold text-purple-600">₹{toNumber(primaryVariant.online_price).toLocaleString()}</span>
                  </div>
                )}
                {primaryVariant.purchase_cost && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cost (Legacy):</span>
                    <span className="text-gray-600">₹{toNumber(primaryVariant.purchase_cost).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Shipping</h4>
              <div className="space-y-1 text-sm">
                <div className="flex">
                  <span className="w-28 text-gray-500">Weight:</span>
                  <span className="text-gray-800">{toNumber(primaryVariant.weight)} kg</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-gray-500">Dimensions:</span>
                  <span className="text-gray-800">
                    {toNumber(primaryVariant.length)} × {toNumber(primaryVariant.width)} × {toNumber(primaryVariant.height)} cm
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="w-28 text-gray-500">Product Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {product.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {product.remarks && (
                  <div className="flex">
                    <span className="w-28 text-gray-500">Remarks:</span>
                    <span className="text-gray-600">{product.remarks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {mainImages.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Product Images ({mainImages.length})</h4>
            <div className="flex gap-3 flex-wrap">
              {mainImages.map((img, i) => (
                <div key={img.image_id || i} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={getImageUrl(img)} alt={`product-${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {extraVariants.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Additional Variants ({extraVariants.length})
            </h4>
            <div className="space-y-3">
              {extraVariants.map((variant, idx) => (
                <div key={variant.variant_id || idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start gap-4">
                    {variant.images?.[0] && (
                      <img 
                        src={getImageUrl(variant.images[0])} 
                        alt="variant" 
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{variant.variant_code}</span>
                        <span className="text-xs font-mono text-gray-400">{variant.system_barcode}</span>
                      </div>
                      {variant.attributes?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {variant.attributes.map((attr, aIdx) => (
                            <span key={aIdx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              {attr.key}: {attr.value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="font-semibold text-red-600">MRP: ₹{toNumber(variant.mrp).toLocaleString()}</span>
                        <span className="text-blue-600">SP: ₹{toNumber(variant.special_price).toLocaleString()}</span>
                        <span className="text-indigo-600">WP: ₹{toNumber(variant.wholesale_price).toLocaleString()}</span>
                        <span className="text-green-600">PP: ₹{toNumber(variant.purchase_price).toLocaleString()}</span>
                        <span className="text-gray-500">Exp: ₹{toNumber(variant.expenses).toLocaleString()}</span>
                        <span className="text-gray-600">Warranty: {variant.warranty || "—"}</span>
                        {variant.weight && <span className="text-gray-500">Shipping: {toNumber(variant.weight)}kg</span>}
                      </div>
                      {variant.remarks && <p className="text-xs text-gray-400 mt-1">{variant.remarks}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variant.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {variant.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button onClick={handleClose} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 cursor-pointer">
            Close
          </button>
        </div>

      </div>
    </div>
</div>
  );
}
// down code is not updated by the new price updates use upper updated and working code 
// // TABS/INVENTORY/ProductShared/ProductView.jsx
// //
// // Read-only modal for viewing product details.
// // Fetches FULL product detail by ID to show all fields (HSN, GST, vendor, etc.)

// import React, { useEffect, useState } from "react";
// import { useDispatch } from "react-redux";
// import { closeViewModal } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
// import { useGetProductByIdQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";

// const getImageUrl = (img) => {
//   if (!img) return null;
//   if (typeof img === "string") return img;
//   if (img?.url) return img.url;
//   return null;
// };

// export default function ProductView({ productId, onClose }) {
//   const dispatch = useDispatch();
  
//   const { data: product, isLoading, isError } = useGetProductByIdQuery(productId, {
//     skip: !productId,
//   });

//   const handleClose = () => {
//     if (onClose) onClose();
//     dispatch(closeViewModal());
//   };

//   if (isLoading) {
//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//         <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 text-center">
//           <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
//           <p className="text-gray-500">Loading product details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (isError || !product) {
//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//         <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 text-center">
//           <p className="text-red-500">Failed to load product details</p>
//           <button onClick={handleClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">Close</button>
//         </div>
//       </div>
//     );
//   }

//   const primaryVariant = product.primary_variant || product.variants?.[0] || {};
//   const allVariants = product.variants || [];
//   const extraVariants = allVariants.slice(1);
//   const mainImages = primaryVariant.images || [];

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//       <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">

//         <div className="flex items-center justify-between pb-3 border-b border-gray-200">
//           <div>
//             <h3 className="text-lg font-semibold text-gray-800">Product Details</h3>
//             <p className="text-xs text-gray-400 mt-0.5 font-mono">
//               {product.product_code} — {product.name}
//             </p>
//           </div>
//           <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
//         </div>

//         <div className="grid grid-cols-2 gap-6">
//           <div className="space-y-4">
//             <div>
//               <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Basic Info</h4>
//               <div className="space-y-2 text-sm">
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Product Code:</span>
//                   <span className="font-mono text-gray-800">{product.product_code}</span>
//                 </div>
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Name:</span>
//                   <span className="text-gray-800">{product.name}</span>
//                 </div>
//                 {product.title && (
//                   <div className="flex">
//                     <span className="w-28 text-gray-500">Title (SEO):</span>
//                     <span className="text-gray-600 italic">{product.title}</span>
//                   </div>
//                 )}
//                 {product.brand_name && (
//                   <div className="flex">
//                     <span className="w-28 text-gray-500">Brand:</span>
//                     <span className="text-gray-800">{product.brand_name}</span>
//                   </div>
//                 )}
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Unit:</span>
//                   <span className="text-gray-800">{product.unit_of_measure}</span>
//                 </div>
//                 {product.description && (
//                   <div className="flex">
//                     <span className="w-28 text-gray-500">Description:</span>
//                     <span className="text-gray-600">{product.description}</span>
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div>
//               <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Classification</h4>
//               <div className="space-y-2 text-sm">
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Vendor:</span>
//                   <span className="text-gray-800">{product.primary_vendor?.company_name || "-"}</span>
//                 </div>
//                 {product.primary_vendor?.city && (
//                   <div className="flex">
//                     <span className="w-28 text-gray-500">Vendor City:</span>
//                     <span className="text-gray-600">{product.primary_vendor.city}</span>
//                   </div>
//                 )}
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Category:</span>
//                   <span className="text-gray-800">{product.category?.name || "-"}</span>
//                 </div>
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Warehouse:</span>
//                   <span className="text-gray-800">{product.warehouse?.warehouse_name || "-"}</span>
//                 </div>
//               </div>
//             </div>

//             <div>
//               <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tax & Compliance</h4>
//               <div className="space-y-2 text-sm">
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">HSN Code:</span>
//                   <span className="font-mono text-gray-800">{product.hsn_code || "-"}</span>
//                 </div>
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">GST %:</span>
//                   <span className="text-gray-800">{product.gst_percent || 0}%</span>
//                 </div>
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">GST Type:</span>
//                   <span className="text-gray-800">{product.gst_type || "-"}</span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="space-y-4">
//             <div>
//               <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pricing (Main Variant)</h4>
//               <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
//                 <div className="flex justify-between">
//                   <span className="text-gray-500">MRP:</span>
//                   <span className="font-bold text-red-600">₹{primaryVariant.mrp?.toLocaleString()}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-500">Wholesale:</span>
//                   <span className="font-semibold text-green-600">₹{primaryVariant.wholesale_price?.toLocaleString()}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-500">Retail:</span>
//                   <span className="font-semibold text-blue-600">₹{primaryVariant.retail_price?.toLocaleString()}</span>
//                 </div>
//                 {primaryVariant.online_price && (
//                   <div className="flex justify-between">
//                     <span className="text-gray-500">Online:</span>
//                     <span className="font-semibold text-purple-600">₹{primaryVariant.online_price?.toLocaleString()}</span>
//                   </div>
//                 )}
//                 {primaryVariant.purchase_cost && (
//                   <div className="flex justify-between">
//                     <span className="text-gray-500">Cost:</span>
//                     <span className="text-gray-600">₹{primaryVariant.purchase_cost?.toLocaleString()}</span>
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div>
//               <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Shipping</h4>
//               <div className="space-y-1 text-sm">
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Weight:</span>
//                   <span className="text-gray-800">{primaryVariant.weight || 0} kg</span>
//                 </div>
//                 <div className="flex">
//                   <span className="w-28 text-gray-500">Dimensions:</span>
//                   <span className="text-gray-800">
//                     {primaryVariant.length || 0} × {primaryVariant.width || 0} × {primaryVariant.height || 0} cm
//                   </span>
//                 </div>
//               </div>
//             </div>

//             <div>
//               <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</h4>
//               <div className="space-y-2 text-sm">
//                 <div className="flex items-center">
//                   <span className="w-28 text-gray-500">Product Status:</span>
//                   <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
//                     {product.is_active ? "Active" : "Inactive"}
//                   </span>
//                 </div>
//                 {product.remarks && (
//                   <div className="flex">
//                     <span className="w-28 text-gray-500">Remarks:</span>
//                     <span className="text-gray-600">{product.remarks}</span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {mainImages.length > 0 && (
//           <div>
//             <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Product Images ({mainImages.length})</h4>
//             <div className="flex gap-3 flex-wrap">
//               {mainImages.map((img, i) => (
//                 <div key={img.image_id || i} className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
//                   <img src={getImageUrl(img)} alt={`product-${i}`} className="w-full h-full object-cover" />
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {extraVariants.length > 0 && (
//           <div>
//             <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
//               Additional Variants ({extraVariants.length})
//             </h4>
//             <div className="space-y-3">
//               {extraVariants.map((variant, idx) => (
//                 <div key={variant.variant_id || idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
//                   <div className="flex items-start gap-4">
//                     {variant.images?.[0] && (
//                       <img 
//                         src={getImageUrl(variant.images[0])} 
//                         alt="variant" 
//                         className="w-12 h-12 rounded-lg object-cover border border-gray-200"
//                       />
//                     )}
//                     <div className="flex-1">
//                       <div className="flex items-center gap-2 mb-1">
//                         <span className="text-xs font-mono text-gray-400">{variant.variant_code}</span>
//                         <span className="text-xs font-mono text-gray-400">{variant.system_barcode}</span>
//                       </div>
//                       {variant.attributes?.length > 0 && (
//                         <div className="flex flex-wrap gap-1.5 mb-2">
//                           {variant.attributes.map((attr, aIdx) => (
//                             <span key={aIdx} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
//                               {attr.key}: {attr.value}
//                             </span>
//                           ))}
//                         </div>
//                       )}
//                       <div className="flex flex-wrap gap-4 text-sm">
//                         <span className="font-semibold text-red-600">MRP: ₹{variant.mrp?.toLocaleString()}</span>
//                         <span className="text-green-600">WS: ₹{variant.wholesale_price?.toLocaleString()}</span>
//                         <span className="text-blue-600">Retail: ₹{variant.retail_price?.toLocaleString()}</span>
//                         {variant.weight && <span className="text-gray-500">Shipping: {variant.weight}kg</span>}
//                       </div>
//                       {variant.remarks && <p className="text-xs text-gray-400 mt-1">{variant.remarks}</p>}
//                     </div>
//                     <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variant.is_active !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
//                       {variant.is_active !== false ? "Active" : "Inactive"}
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         <div className="flex justify-end pt-3 border-t border-gray-100">
//           <button onClick={handleClose} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 cursor-pointer">
//             Close
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// }