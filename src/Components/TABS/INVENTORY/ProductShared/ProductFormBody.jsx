
// TABS/INVENTORY/ProductShared/ProductFormBody.jsx
//
// Pure presentational component.
// Renders all product-level fields matching backend schema.
// FIXED: retail_price → special_price, wholesale_price → purchase_price, added expenses

import React, { useRef } from "react";
import { useDispatch } from "react-redux";
import { useGetVendorsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Vendor_api/vendorApi";
import { useGetCategoriesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Category_api/categoryApi";
import {
  addProductImages,
  removeProductImage,
  replaceProductImage,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";

import {
  getUnitOfMeasureSelectOptions,
  normalizeUnitOfMeasure,
} from "../../../../constants/unitOfMeasure.constants";

const GST_TYPES     = ["CGST_SGST", "IGST", "EXEMPT"];
const GST_PERCENTS  = ["0", "5", "12", "18", "28"];

export default function ProductFormBody({ formData, onChange, formErrors }) {
  const uomOptions = React.useMemo(
    () => getUnitOfMeasureSelectOptions(formData.unit_of_measure),
    [formData.unit_of_measure]
  );

  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const [pendingReplaceIndex, setPendingReplaceIndex] = React.useState(null);
  const [pendingReplaceIsExisting, setPendingReplaceIsExisting] = React.useState(null);

  const { data: vendorData, isLoading: vendorsLoading } = useGetVendorsQuery({ page: 1, limit: 100 });
  const vendors = vendorData?.vendors || [];

  const { data: categoryData, isLoading: categoriesLoading } = useGetCategoriesQuery({ is_active: true, limit: 100 });
  const categories = (categoryData?.categories || []).filter(cat => cat.is_active === true);

  // console.log('he print active only ',categories );
  

  const inputCls = (name) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      formErrors?.[name] ? "border-red-400" : "border-gray-300"
    }`;

  const errorMsg = (name) =>
    formErrors?.[name] ? <p className="text-xs text-red-500 mt-1">{formErrors[name]}</p> : null;

  const field = (name) => ({
    value: formData[name] ?? "",
    onChange: (e) => onChange({ [name]: e.target.value }),
  });

  // ── Image handling with Delete + Replace ────────────────────────────────────
  const getImageSrc = (img, isExisting, isNew) => {
    if (isExisting && img?.url) return img.url;
    if (isNew && img instanceof File) return URL.createObjectURL(img);
    if (typeof img === "string") return img;
    if (img?.url) return img.url;
    return "";
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      dispatch(addProductImages(files));
    }
    e.target.value = "";
  };

  const handleReplaceClick = (index, isExisting, imageId = null) => {
    setPendingReplaceIndex(index);
    setPendingReplaceIsExisting(isExisting);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && pendingReplaceIndex !== null) {
      dispatch(replaceProductImage({
        index: pendingReplaceIndex,
        isExisting: pendingReplaceIsExisting,
        imageId: pendingReplaceIsExisting ? formData.imagesToKeep?.[pendingReplaceIndex]?.image_id : null,
        file: file,
      }));
    }
    setPendingReplaceIndex(null);
    setPendingReplaceIsExisting(null);
    e.target.value = "";
  };

  const handleDelete = (index, isExisting, imageId = null) => {
    if (window.confirm("Delete this image?")) {
      dispatch(removeProductImage({ index, isExisting, imageId }));
    }
  };

  const existingImages = formData.imagesToKeep || [];
  const newImages = formData.newImages || [];
  const allImages = [...existingImages, ...newImages];

  const setPrimaryImage = (images, index) => {
    if (index === 0) return images;
    const reordered = [...images];
    const [selected] = reordered.splice(index, 1);
    reordered.unshift(selected);
    return reordered;
  };

  return (
    <div className="space-y-6 text-gray-700">

      {/* ── Section 1: Basic Info ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</p>
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Product Code <span className="text-red-500">*</span>
            </label>
            <input {...field("product_code")} placeholder="e.g. 8878" className={inputCls("product_code")} />
            <p className="text-xs text-gray-400 mt-1">Base code only (no dash). Variants auto: 8878-1, 8878-2</p>
            {errorMsg("product_code")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input {...field("name")} placeholder="e.g. Cotton Shirt" className={inputCls("name")} />
            {errorMsg("name")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title (SEO) <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <input {...field("title")} placeholder="e.g. Premium Cotton Shirt - Best Quality" className={inputCls("title")} />
            <p className="text-xs text-gray-400 mt-1">Used for search engines and meta tags</p>
            {errorMsg("title")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Brand Name</label>
            <input {...field("brand_name")} placeholder="e.g. Nestle" className={inputCls("brand_name")} />
            {errorMsg("brand_name")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Unit of Measure <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.unit_of_measure || ""}
              onChange={(e) => onChange({ unit_of_measure: normalizeUnitOfMeasure(e.target.value) })}
              className={inputCls("unit_of_measure")}
            >
              <option value="">— Select UOM —</option>
              {uomOptions.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {errorMsg("unit_of_measure")}
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea {...field("description")} rows={2} placeholder="Product features, details, etc." className={`${inputCls("description")} resize-none`} />
          </div>

        </div>
      </div>

      {/* ── Section 2: Vendor & Category ─────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Classification</p>
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Primary Vendor <span className="text-red-500">*</span>
            </label>
            {vendorsLoading ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">Loading vendors…</div>
            ) : (
              <select value={formData.primary_vendor_id || ""} onChange={(e) => onChange({ primary_vendor_id: e.target.value })} className={inputCls("primary_vendor_id")}>
                <option value="">— Select Vendor —</option>
                {vendors.map(v => (
                  <option key={v.vendor_id} value={v.vendor_id}>{v.company_name}{v.city ? ` — ${v.city}` : ""}</option>
                ))}
              </select>
            )}
            {errorMsg("primary_vendor_id")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            {categoriesLoading ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">Loading categories…</div>
            ) : (
              <select value={formData.category_id || ""} onChange={(e) => onChange({ category_id: e.target.value })} className={inputCls("category_id")}>
                <option value="">— Select Category —</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            )}
            {errorMsg("category_id")}
          </div>

        </div>
      </div>

      {/* ── Section 3: Prices (Variant 0 / defaults) ─────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Prices — Variant 0 (defaults)
        </p>
        <div className="grid grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              MRP <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" {...field("mrp")} placeholder="MRP" className={inputCls("mrp")} />
            {errorMsg("mrp")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Special Price (Retail) <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" {...field("special_price")} placeholder="Selling Price" className={inputCls("special_price")} />
            {errorMsg("special_price")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Wholesale Price <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" {...field("wholesale_price")} placeholder="Franchise / B2B" className={inputCls("wholesale_price")} />
            {errorMsg("wholesale_price")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Purchase Price <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" {...field("purchase_price")} placeholder="Cost Price" className={inputCls("purchase_price")} />
            {errorMsg("purchase_price")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Expenses <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" {...field("expenses")} placeholder="Per Unit" className={inputCls("expenses")} />
            {errorMsg("expenses")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Warranty <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input {...field("warranty")} placeholder="e.g. 1 Year" className={inputCls("warranty")} />
            {errorMsg("warranty")}
          </div>

        </div>
      
      </div>

      {/* ── Section 4: Shipping ───────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Shipping
        </p>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" {...field("weight")} placeholder="0.25" className={inputCls("weight")} />
            {errorMsg("weight")}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Length (cm) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" {...field("length")} placeholder="30" className={inputCls("length")} />
            {errorMsg("length")}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Width (cm) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" {...field("width")} placeholder="20" className={inputCls("width")} />
            {errorMsg("width")}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Height (cm) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" {...field("height")} placeholder="5" className={inputCls("height")} />
            {errorMsg("height")}
          </div>
        </div>
      </div>

      {/* ── Section 5: Tax & Compliance ──────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tax & Compliance</p>
        <div className="grid grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              HSN Code <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input {...field("hsn_code")} placeholder="6-digit HSN" className={inputCls("hsn_code")} />
            {errorMsg("hsn_code")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              GST % <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <select value={formData.gst_percent ?? ""} onChange={(e) => onChange({ gst_percent: e.target.value })} className={inputCls("gst_percent")}>
              <option value="">— Select —</option>
              {GST_PERCENTS.map(g => <option key={g} value={g}>{g}%</option>)}
            </select>
            {errorMsg("gst_percent")}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              GST Type <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <select value={formData.gst_type || ""} onChange={(e) => onChange({ gst_type: e.target.value })} className={inputCls("gst_type")}>
              <option value="">— Select —</option>
              {GST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errorMsg("gst_type")}
          </div>

        </div>
      </div>

      {/* ── Section 6: Status, Threshold & Remarks ───────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Threshold <span className="text-red-500">*</span></label>
          <input type="number" {...field("low_stock_threshold")} placeholder="10" className={inputCls("low_stock_threshold")} />
          {errorMsg("low_stock_threshold")}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
          <input {...field("remarks")} placeholder="Optional notes" className={inputCls("remarks")} />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <button
            type="button"
            onClick={() => onChange({ is_active: !formData.is_active })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.is_active ? "bg-green-500" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formData.is_active ? "translate-x-4" : "translate-x-1"}`} />
          </button>
          <span className={`text-xs font-medium ${formData.is_active ? "text-green-600" : "text-gray-400"}`}>
            {formData.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* ── Section 7: Images with Delete + Replace ───────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Images <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </p>

        {allImages.length > 0 && (
          <div className="flex gap-3 flex-wrap mb-3">
            {allImages.map((img, i) => {
              const isExisting = i < existingImages.length;
              const imgSrc = getImageSrc(img, isExisting, !isExisting);
              const imageId = isExisting ? img.image_id : null;
              const isPrimary = i === 0;
              
              return (
                <div key={isExisting ? imageId || i : `new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 group transition-all" style={{ borderColor: isPrimary ? '#F7A221' : '#e5e7eb' }}>
                  {isPrimary && (
                    <div className="absolute top-0 left-0 w-full bg-[#F7A221]/90 text-black text-[9px] font-bold text-center py-0.5 z-10">
                      ★ PRIMARY
                    </div>
                  )}
                  
                  <img src={imgSrc} alt={`preview-${i}`} className="w-full h-full object-cover" />
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => {
                          const reordered = setPrimaryImage(allImages, i);
                          if (isExisting) {
                            const newKeep = setPrimaryImage(existingImages, i);
                            onChange({ imagesToKeep: newKeep, newImages: newImages });
                          } else {
                            const newIdx = i - existingImages.length;
                            const reorderedNew = setPrimaryImage(newImages, newIdx);
                            onChange({ imagesToKeep: existingImages, newImages: reorderedNew });
                          }
                        }}
                        className="px-2 py-0.5 bg-[#F7A221] text-black text-xs rounded font-medium hover:bg-[#e89510]"
                      >
                        Set as Primary
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(i, isExisting, imageId)}
                        className="w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        title="Delete image"
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReplaceClick(i, isExisting, imageId)}
                        className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-blue-600"
                        title="Replace image"
                      >
                        ↻
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="hidden"
        />
        
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleReplaceFileChange}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-40 transition-colors"
        >
          + Upload Images
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Hover over image to see Delete (×) and Replace (↻) buttons
        </p>
      </div>

    </div>
  );
}
// down code is not updated by the new price updates use upper updated and working code 
// // TABS/INVENTORY/ProductShared/ProductFormBody.jsx
// //
// // Pure presentational component.
// // Renders all product-level fields matching backend schema.
// // Used by both ProductAddForm and ProductEditForm.
// // Image upload included with Delete + Replace buttons.

// import React, { useRef } from "react";
// import { useDispatch } from "react-redux";
// import { useGetVendorsQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Vendor_api/vendorApi";
// import { useGetCategoriesQuery } from "../../../../REDUX_FEATURES/REDUX_SLICES/Category_api/categoryApi";
// import {
//   addProductImages,
//   removeProductImage,
//   replaceProductImage,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";

// const GST_TYPES     = ["CGST_SGST", "IGST", "EXEMPT"];
// const GST_PERCENTS  = ["0", "5", "12", "18", "28"];
// const UOM_OPTIONS   = ["PCS", "KG", "GM", "LTR", "BOX", "PACKET", "DOZEN", "MTR"];

// export default function ProductFormBody({ formData, onChange, formErrors }) {
//   const dispatch = useDispatch();
//   const fileInputRef = useRef(null);
//   const replaceFileInputRef = useRef(null);
//   const [pendingReplaceIndex, setPendingReplaceIndex] = React.useState(null);
//   const [pendingReplaceIsExisting, setPendingReplaceIsExisting] = React.useState(null);

//   // ── Vendor dropdown ────────────────────────────────────────────────────────
//   const { data: vendorData, isLoading: vendorsLoading } = useGetVendorsQuery({ page: 1, limit: 100 });
//   const vendors = vendorData?.vendors || [];

//   // ── Category dropdown ──────────────────────────────────────────────────────
//   const { data: categoryData, isLoading: categoriesLoading } = useGetCategoriesQuery({ is_active: true, limit: 100 });
//   const categories = categoryData?.categories || [];

//   const inputCls = (name) =>
//     `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
//       formErrors?.[name] ? "border-red-400" : "border-gray-300"
//     }`;

//   const errorMsg = (name) =>
//     formErrors?.[name] ? <p className="text-xs text-red-500 mt-1">{formErrors[name]}</p> : null;

//   const field = (name) => ({
//     value: formData[name] ?? "",
//     onChange: (e) => onChange({ [name]: e.target.value }),
//   });

//   // ── Image handling with Delete + Replace ────────────────────────────────────
//   const getImageSrc = (img, isExisting, isNew) => {
//     if (isExisting && img?.url) return img.url;
//     if (isNew && img instanceof File) return URL.createObjectURL(img);
//     if (typeof img === "string") return img;
//     if (img?.url) return img.url;
//     return "";
//   };

//   const handleImageChange = (e) => {
//     const files = Array.from(e.target.files || []);
//     if (files.length > 0) {
//       dispatch(addProductImages(files));
//     }
//     e.target.value = "";
//   };

//   const handleReplaceClick = (index, isExisting, imageId = null) => {
//     setPendingReplaceIndex(index);
//     setPendingReplaceIsExisting(isExisting);
//     replaceFileInputRef.current?.click();
//   };

//   const handleReplaceFileChange = (e) => {
//     const file = e.target.files?.[0];
//     if (file && pendingReplaceIndex !== null) {
//       dispatch(replaceProductImage({
//         index: pendingReplaceIndex,
//         isExisting: pendingReplaceIsExisting,
//         imageId: pendingReplaceIsExisting ? formData.imagesToKeep?.[pendingReplaceIndex]?.image_id : null,
//         file: file,
//       }));
//     }
//     setPendingReplaceIndex(null);
//     setPendingReplaceIsExisting(null);
//     e.target.value = "";
//   };

//   const handleDelete = (index, isExisting, imageId = null) => {
//     if (window.confirm("Delete this image?")) {
//       dispatch(removeProductImage({ index, isExisting, imageId }));
//     }
//   };

//   // Build combined image list for preview
//   const existingImages = formData.imagesToKeep || [];
//   const newImages = formData.newImages || [];
//   const allImages = [...existingImages, ...newImages];

//     // Swap logic for primary image (index 0 = primary)
//   const setPrimaryImage = (images, index) => {
//     if (index === 0) return images;
//     const reordered = [...images];
//     const [selected] = reordered.splice(index, 1);
//     reordered.unshift(selected);
//     return reordered;
//   };

//   return (
//     <div className="space-y-6 text-gray-700">

//       {/* ── Section 1: Basic Info ─────────────────────────────────────────── */}
//       <div>
//         <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</p>
//         <div className="grid grid-cols-2 gap-4">

//           <div>
//             <label className="block text-xs font-medium text-gray-700 mb-1">
//               Product Code <span className="text-red-500">*</span>
//             </label>
//             <input {...field("product_code")} placeholder="e.g. 8878" className={inputCls("product_code")} />
//             <p className="text-xs text-gray-400 mt-1">Unique per warehouse. Variants get 8878-1, 8878-2…</p>
//             {errorMsg("product_code")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               Product Name <span className="text-red-500">*</span>
//             </label>
//             <input {...field("name")} placeholder="e.g. Cotton Shirt" className={inputCls("name")} />
//             {errorMsg("name")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               Title (SEO) <span className="text-gray-400 text-xs font-normal">(optional)</span>
//             </label>
//             <input {...field("title")} placeholder="e.g. Premium Cotton Shirt - Best Quality" className={inputCls("title")} />
//             <p className="text-xs text-gray-400 mt-1">Used for search engines and meta tags</p>
//             {errorMsg("title")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Brand Name</label>
//             <input {...field("brand_name")} placeholder="e.g. Nestle" className={inputCls("brand_name")} />
//             {errorMsg("brand_name")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               Unit of Measure <span className="text-red-500">*</span>
//             </label>
//             <select value={formData.unit_of_measure || ""} onChange={(e) => onChange({ unit_of_measure: e.target.value })} className={inputCls("unit_of_measure")}>
//               <option value="">— Select UOM —</option>
//               {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
//             </select>
//             {errorMsg("unit_of_measure")}
//           </div>

//           <div className="col-span-2">
//             <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
//             <textarea {...field("description")} rows={2} placeholder="Product features, details, etc." className={`${inputCls("description")} resize-none`} />
//           </div>

//         </div>
//       </div>

//       {/* ── Section 2: Vendor & Category ─────────────────────────────────── */}
//       <div>
//         <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Classification</p>
//         <div className="grid grid-cols-2 gap-4">

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               Primary Vendor <span className="text-red-500">*</span>
//             </label>
//             {vendorsLoading ? (
//               <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">Loading vendors…</div>
//             ) : (
//               <select value={formData.primary_vendor_id || ""} onChange={(e) => onChange({ primary_vendor_id: e.target.value })} className={inputCls("primary_vendor_id")}>
//                 <option value="">— Select Vendor —</option>
//                 {vendors.map(v => (
//                   <option key={v.vendor_id} value={v.vendor_id}>{v.company_name}{v.city ? ` — ${v.city}` : ""}</option>
//                 ))}
//               </select>
//             )}
//             {errorMsg("primary_vendor_id")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               Category <span className="text-red-500">*</span>
//             </label>
//             {categoriesLoading ? (
//               <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-400">Loading categories…</div>
//             ) : (
//               <select value={formData.category_id || ""} onChange={(e) => onChange({ category_id: e.target.value })} className={inputCls("category_id")}>
//                 <option value="">— Select Category —</option>
//                 {categories.map(c => (
//                   <option key={c.category_id} value={c.category_id}>{c.name}</option>
//                 ))}
//               </select>
//             )}
//             {errorMsg("category_id")}
//           </div>

//         </div>
//       </div>

//       {/* ── Section 3: Prices (Variant 0 / defaults) ─────────────────────── */}
//       <div>
//         <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
//           Prices — Variant 0 (defaults)
//         </p>
//         <div className="grid grid-cols-4 gap-4">

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               MRP <span className="text-red-500">*</span>
//             </label>
//             <input type="number" {...field("mrp")} placeholder="₹" className={inputCls("mrp")} />
//             {errorMsg("mrp")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               Wholesale Price <span className="text-red-500">*</span>
//             </label>
//             <input type="number" {...field("wholesale_price")} placeholder="₹" className={inputCls("wholesale_price")} />
//             {errorMsg("wholesale_price")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               Retail Price <span className="text-red-500">*</span>
//             </label>
//             <input type="number" {...field("retail_price")} placeholder="₹" className={inputCls("retail_price")} />
//             {errorMsg("retail_price")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Online Price</label>
//             <input type="number" {...field("online_price")} placeholder="₹" className={inputCls("online_price")} />
//             {errorMsg("online_price")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Cost</label>
//             <input type="number" {...field("purchase_cost")} placeholder="₹" className={inputCls("purchase_cost")} />
//           </div>

//         </div>
//       </div>

//       {/* ── Section 4: Shipping ───────────────────────────────────────────── */}
//       <div>
//         <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
//           Shipping <span className="text-gray-400 font-normal normal-case">(for e-commerce sync)</span>
//         </p>
//         <div className="grid grid-cols-4 gap-4">
//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
//             <input type="number" step="0.01" {...field("weight")} placeholder="0.25" className={inputCls("weight")} />
//           </div>
//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Length (cm)</label>
//             <input type="number" {...field("length")} placeholder="30" className={inputCls("length")} />
//           </div>
//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Width (cm)</label>
//             <input type="number" {...field("width")} placeholder="20" className={inputCls("width")} />
//           </div>
//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">Height (cm)</label>
//             <input type="number" {...field("height")} placeholder="5" className={inputCls("height")} />
//           </div>
//         </div>
//       </div>

//       {/* ── Section 5: Tax & Compliance ──────────────────────────────────── */}
//       <div>
//         <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tax & Compliance</p>
//         <div className="grid grid-cols-3 gap-4">

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               HSN Code <span className="text-red-500">*</span>
//             </label>
//             <input {...field("hsn_code")} placeholder="6-digit HSN" className={inputCls("hsn_code")} />
//             {errorMsg("hsn_code")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               GST % <span className="text-red-500">*</span>
//             </label>
//             <select value={formData.gst_percent || ""} onChange={(e) => onChange({ gst_percent: e.target.value })} className={inputCls("gst_percent")}>
//               {GST_PERCENTS.map(g => <option key={g} value={g}>{g}%</option>)}
//             </select>
//             {errorMsg("gst_percent")}
//           </div>

//           <div>
//             <label className="block text-xs font-medium text-gray-600 mb-1">
//               GST Type <span className="text-red-500">*</span>
//             </label>
//             <select value={formData.gst_type || ""} onChange={(e) => onChange({ gst_type: e.target.value })} className={inputCls("gst_type")}>
//               {GST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
//             </select>
//             {errorMsg("gst_type")}
//           </div>

//         </div>
//       </div>

//       {/* ── Section 6: Status & Remarks ──────────────────────────────────── */}
//       <div className="grid grid-cols-2 gap-4">
//         <div>
//           <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
//           <input {...field("remarks")} placeholder="Optional notes" className={inputCls("remarks")} />
//         </div>
//         <div className="flex items-center gap-3 pt-5">
//           <label className="text-xs font-medium text-gray-600">Status</label>
//           <button
//             type="button"
//             onClick={() => onChange({ is_active: !formData.is_active })}
//             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.is_active ? "bg-green-500" : "bg-gray-300"}`}
//           >
//             <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formData.is_active ? "translate-x-4" : "translate-x-1"}`} />
//           </button>
//           <span className={`text-xs font-medium ${formData.is_active ? "text-green-600" : "text-gray-400"}`}>
//             {formData.is_active ? "Active" : "Inactive"}
//           </span>
//         </div>
//       </div>

//       {/* ── Section 7: Images with Delete + Replace ───────────────────────── */}
//       <div>
//         <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
//           Images <span className="text-gray-400 font-normal normal-case">(optional — max 4)</span>
//         </p>

//         {allImages.length > 0 && (
//           <div className="flex gap-3 flex-wrap mb-3">
//             {allImages.map((img, i) => {
//     const isExisting = i < existingImages.length;
//     const imgSrc = getImageSrc(img, isExisting, !isExisting);
//     const imageId = isExisting ? img.image_id : null;
//     const isPrimary = i === 0;
    
//     return (
//       <div key={isExisting ? imageId || i : `new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 group transition-all" style={{ borderColor: isPrimary ? '#F7A221' : '#e5e7eb' }}>
//         {/* Primary Badge */}
//         {isPrimary && (
//           <div className="absolute top-0 left-0 w-full bg-[#F7A221]/90 text-black text-[9px] font-bold text-center py-0.5 z-10">
//             ★ PRIMARY
//           </div>
//         )}
        
//         <img src={imgSrc} alt={`preview-${i}`} className="w-full h-full object-cover" />
        
//         {/* Overlay buttons */}
//         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
//           {!isPrimary && (
//             <button
//               type="button"
//               onClick={() => {
//                 const reordered = setPrimaryImage(allImages, i);
//                 // Update images based on type
//                 if (isExisting) {
//                   // For existing images, we need to reorder imagesToKeep
//                   const newKeep = setPrimaryImage(existingImages, i);
//                   onChange({ imagesToKeep: newKeep, newImages: newImages });
//                 } else {
//                   // For new images, reorder newImages array
//                   const newIdx = i - existingImages.length;
//                   const reorderedNew = setPrimaryImage(newImages, newIdx);
//                   onChange({ imagesToKeep: existingImages, newImages: reorderedNew });
//                 }
//               }}
//               className="px-2 py-0.5 bg-[#F7A221] text-black text-xs rounded font-medium hover:bg-[#e89510]"
//             >
//               Set as Primary
//             </button>
//           )}
//           <div className="flex gap-2">
//             <button
//               type="button"
//               onClick={() => handleDelete(i, isExisting, imageId)}
//               className="w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
//               title="Delete image"
//             >
//               ×
//             </button>
//             <button
//               type="button"
//               onClick={() => handleReplaceClick(i, isExisting, imageId)}
//               className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-blue-600"
//               title="Replace image"
//             >
//               ↻
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   })}
//           </div>
//         )}

//         <input
//           ref={fileInputRef}
//           type="file"
//           accept="image/*"
//           multiple
//           onChange={handleImageChange}
//           className="hidden"
//         />
        
//         <input
//           ref={replaceFileInputRef}
//           type="file"
//           accept="image/*"
//           onChange={handleReplaceFileChange}
//           className="hidden"
//         />
        
//         <button
//           type="button"
//           onClick={() => fileInputRef.current?.click()}
//           disabled={allImages.length >= 4}
//           className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-40 transition-colors"
//         >
//           + Upload Images
//         </button>
//         <p className="text-xs text-gray-400 mt-2">
//           Hover over image to see Delete (×) and Replace (↻) buttons
//         </p>
//       </div>

//     </div>
//   );
// }