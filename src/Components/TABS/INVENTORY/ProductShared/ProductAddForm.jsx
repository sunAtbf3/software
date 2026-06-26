
// TABS/INVENTORY/ProductShared/ProductAddForm.jsx

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useCreateProductMutation,
  useCreateProductWithImagesMutation,
  useUploadVariantImagesMutation,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
import {
  closeAddForm,
  updateFormData,
  setFormErrors,
  clearFormErrors,
  openVariantModal,
  openVariantModalForEdit,
  removeVariantFromList,
  setSubmitting,
  saveVariantToList,
  updateVariantInList,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
import ProductFormBody from "./ProductFormBody";
import VariantModal from "./VariantModal";

const toNumber = (val, defaultVal = 0) => {
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
};

// Helper to check if any images exist (product-level or any variant)
const hasAnyImages = (formData, variants) => {
  const productHasImages = (formData.newImages || []).length > 0;
  const variantHasImages = (variants || []).some(v => (v.newImages || []).length > 0);
  return productHasImages || variantHasImages;
};

// ── Helper to remove null/undefined values from variant ─────────────────────────
const cleanVariantPayload = (variant) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(variant)) {
    // Skip null values, but keep 0, false, "", and undefined (undefined will be omitted by JSON.stringify)
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// ── Build complete variants array (main variant + extra variants) ─────────────
const buildCompleteVariantsArray = (formData, extraVariants) => {
  // Main variant (variant 0) - prices from formData
  const mainVariant = {
    attributes: [],
    mrp: toNumber(formData.mrp),
    special_price: toNumber(formData.special_price),
    purchase_price: formData.purchase_price ? toNumber(formData.purchase_price) : undefined,
    expenses: toNumber(formData.expenses),
    online_price: formData.online_price ? toNumber(formData.online_price) : undefined,
    purchase_cost: formData.purchase_cost ? toNumber(formData.purchase_cost) : undefined,
    weight: formData.weight ? toNumber(formData.weight) : undefined,
    length: formData.length ? toNumber(formData.length) : undefined,
    width: formData.width ? toNumber(formData.width) : undefined,
    height: formData.height ? toNumber(formData.height) : undefined,
    low_stock_threshold: formData.low_stock_threshold ? toNumber(formData.low_stock_threshold) : 10,
    remarks: formData.remarks?.trim() || undefined,
    is_active: formData.is_active !== false,
  };
  
  const cleanedExtraVariants = extraVariants.map(({ newImages, imagesToKeep, imagesToDelete, ...rest }) => {
    const variant = {
      ...rest,
      mrp: toNumber(rest.mrp),
      special_price: toNumber(rest.special_price),
      purchase_price: rest.purchase_price ? toNumber(rest.purchase_price) : undefined,
      expenses: toNumber(rest.expenses),
      online_price: rest.online_price ? toNumber(rest.online_price) : undefined,
      purchase_cost: rest.purchase_cost ? toNumber(rest.purchase_cost) : undefined,
      weight: rest.weight ? toNumber(rest.weight) : undefined,
      length: rest.length ? toNumber(rest.length) : undefined,
      width: rest.width ? toNumber(rest.width) : undefined,
      height: rest.height ? toNumber(rest.height) : undefined,
    };
    // Remove null values to prevent backend validator rejection
    return cleanVariantPayload(variant);
  });
  
  return [mainVariant, ...cleanedExtraVariants];
};

// Build Base Payload (same for JSON or FormData)
const buildBasePayload = (formData, extraVariants) => {
  const base = {
    product_code: formData.product_code.trim().toUpperCase(),
    name: formData.name.trim(),
    title: formData.title?.trim() || undefined,
  };

  if (formData.primary_vendor_id) base.primary_vendor_id = formData.primary_vendor_id;
  if (formData.category_id) base.category_id = formData.category_id;
  if (formData.hsn_code?.trim()) base.hsn_code = formData.hsn_code.trim();
  if (formData.gst_percent !== "" && formData.gst_percent != null) {
    base.gst_percent = toNumber(formData.gst_percent);
  }
  if (formData.gst_type) base.gst_type = formData.gst_type;
  if (formData.unit_of_measure) base.unit_of_measure = formData.unit_of_measure;
  
  if (formData.description?.trim())  base.description = formData.description.trim();
  if (formData.brand_name?.trim())   base.brand_name = formData.brand_name.trim();
  if (formData.remarks?.trim())      base.remarks = formData.remarks.trim();
  base.is_active = formData.is_active;
  
  base.variants = buildCompleteVariantsArray(formData, extraVariants);
  
  return base;
};

// Build FormData for multipart request
const buildMultipartFormData = (formData, extraVariants, basePayload) => {
  const multipartForm = new FormData();
  
  multipartForm.append("data", JSON.stringify(basePayload));
  
  const productImages = formData.newImages || [];
  productImages.forEach((file) => {
    if (file instanceof File) {
      multipartForm.append("variant_images_0", file);
    }
  });
  
  extraVariants.forEach((variant, idx) => {
    const variantIndex = idx + 1;
    const variantImages = variant.newImages || [];
    variantImages.forEach((img) => {
      if (img instanceof File) {
        multipartForm.append(`variant_images_${variantIndex}`, img);
      }
    });
  });
  
  return multipartForm;
};

export default function ProductAddForm({ formData, formErrors, variants, showVariantModal, variantForm, variantErrors, editingVariantIndex, onSave }) {
  const dispatch = useDispatch();
  const [createProductJson, { isLoading: isLoadingJson }] = useCreateProductMutation();
  const [createProductMulti, { isLoading: isLoadingMulti }] = useCreateProductWithImagesMutation();
  const [uploadVariantImages] = useUploadVariantImagesMutation();
  
  const isLoading = isLoadingJson || isLoadingMulti;

  const validate = () => {
    const errors = {};
    if (!formData.product_code?.trim())      errors.product_code = "Product code is required";
    if (!formData.name?.trim())              errors.name = "Product name is required";
    if (!formData.mrp || toNumber(formData.mrp) <= 0)
      errors.mrp = "MRP is required and must be > 0";
    if (!formData.special_price || toNumber(formData.special_price) <= 0)
      errors.special_price = "Special price is required";
    if (formData.purchase_price && toNumber(formData.purchase_price) < 0)
      errors.purchase_price = "Purchase price cannot be negative";
    if (formData.expenses === "" || formData.expenses == null || toNumber(formData.expenses) < 0)
      errors.expenses = "Expenses is required";
    if (!formData.weight || toNumber(formData.weight) <= 0)
      errors.weight = "Weight is required";
    if (!formData.length || toNumber(formData.length) <= 0)
      errors.length = "Length is required";
    if (!formData.width || toNumber(formData.width) <= 0)
      errors.width = "Width is required";
    if (!formData.height || toNumber(formData.height) <= 0)
      errors.height = "Height is required";
    return errors;
  };

  const handleSave = async () => {
    dispatch(clearFormErrors());
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      dispatch(setFormErrors(errors));
      return;
    }

    dispatch(setSubmitting(true));
    
    try {
      const basePayload = buildBasePayload(formData, variants);
      const hasImages = hasAnyImages(formData, variants);
      
      let created;
      
      if (hasImages) {
        const multipartForm = buildMultipartFormData(formData, variants, basePayload);
        created = await createProductMulti({ formData: multipartForm }).unwrap();
      } else {
        created = await createProductJson(basePayload).unwrap();
      }
      
      if (!hasImages && ((formData.newImages || []).length > 0 || variants.some(v => (v.newImages || []).length > 0))) {
        const productImages = formData.newImages || [];
        if (productImages.length > 0 && created?.variants?.[0]?.variant_id) {
          const fd = new FormData();
          productImages.forEach(f => {
            if (f instanceof File) fd.append("images", f);
          });
          await uploadVariantImages({
            productId: created.product_id,
            variantId: created.variants[0].variant_id,
            formData: fd,
          }).unwrap().catch(() => {});
        }
        
        if (variants.length > 0) {
          for (let i = 0; i < variants.length; i++) {
            const imgs = variants[i].newImages || [];
            const variantId = created?.variants?.[i + 1]?.variant_id;
            if (imgs.length > 0 && variantId) {
              const fd = new FormData();
              imgs.forEach(img => {
                if (img instanceof File) fd.append("images", img);
              });
              await uploadVariantImages({
                productId: created.product_id,
                variantId,
                formData: fd,
              }).unwrap().catch(() => {});
            }
          }
        }
      }
      
      onSave();
    } catch (err) {
      if (err?.data?.errors?.length) {
        const be = {};
        err.data.errors.forEach(({ field, message }) => { be[field] = message; });
        dispatch(setFormErrors(be));
      } else {
        dispatch(setFormErrors({ general: err?.data?.message || "Failed to create product" }));
      }
    } finally {
      dispatch(setSubmitting(false));
    }
  };


  const handleVariantModalSave = (variantPayload) => {
    if (editingVariantIndex !== null && editingVariantIndex >= 0) {
      dispatch(updateVariantInList({ index: editingVariantIndex, variant: variantPayload }));
    } else {
      dispatch(saveVariantToList(variantPayload));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Add New Product</h3>
              <p className="text-xs text-gray-400 mt-0.5">Fill product details — add extra variants below</p>
            </div>
            <button onClick={() => dispatch(closeAddForm())} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">✕</button>
          </div>

          {formErrors?.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <p className="text-sm text-red-600">{formErrors.general}</p>
            </div>
          )}

          <ProductFormBody
            formData={formData}
            onChange={(data) => dispatch(updateFormData(data))}
            formErrors={formErrors}
          />

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Extra Variants</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Prices above = Variant 0 (default). Add more variants here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => dispatch(openVariantModal())}
                className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 cursor-pointer"
              >
                + Add Variant
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                No extra variants — product will be created as single variant
              </div>
            ) : (
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-gray-500">V{i + 1}</span>
                      <div>
                        {v.attributes?.length > 0 && (
                          <p className="text-xs font-medium text-gray-700">
                            {v.attributes.map(a => `${a.key}: ${a.value}`).join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          MRP ₹{v.mrp} · SP ₹{v.special_price} · PP ₹{v.purchase_price} · Exp ₹{v.expenses}
                        </p>
                        {v.weight && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Shipping: {v.weight}kg · {v.length}x{v.width}x{v.height}cm
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => dispatch(openVariantModalForEdit({ index: i }))}
                        className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch(removeVariantFromList(i))}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => dispatch(closeAddForm())} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? "Creating…" : `Create Product${variants.length > 0 ? ` (${variants.length + 1} variants)` : ""}`}
            </button>
          </div>

        </div>
    </div>
</div>

      {showVariantModal && (
        <VariantModal
          variantForm={variantForm}
          variantErrors={variantErrors}
          editingVariantIndex={editingVariantIndex}
          onSaveOverride={handleVariantModalSave}
        />
      )}
    </>
  );
}
// upper code get upadted by the new price updates 

// // TABS/INVENTORY/ProductShared/ProductAddForm.jsx

// import React from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   useCreateProductMutation,
//   useCreateProductWithImagesMutation,
//   useUploadVariantImagesMutation,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
// import {
//   closeAddForm,
//   updateFormData,
//   setFormErrors,
//   clearFormErrors,
//   openVariantModal,
//   openVariantModalForEdit,
//   removeVariantFromList,
//   setSubmitting,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
// import ProductFormBody from "./ProductFormBody";
// import VariantModal from "./VariantModal";

// // Helper to check if any images exist (product-level or any variant)
// const hasAnyImages = (formData, variants) => {
//   const productHasImages = (formData.newImages || []).length > 0;
//   const variantHasImages = (variants || []).some(v => (v.newImages || []).length > 0);
//   return productHasImages || variantHasImages;
// };

// // ── Build complete variants array (main variant + extra variants) ─────────────
// const buildCompleteVariantsArray = (formData, extraVariants) => {
//   const mainVariant = {
//     attributes: [],
//     mrp: Number(formData.mrp),
//     wholesale_price: Number(formData.wholesale_price),
//     retail_price: Number(formData.retail_price),
//     online_price: formData.online_price ? Number(formData.online_price) : undefined,
//     purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : undefined,
//     weight: formData.weight ? Number(formData.weight) : undefined,
//     length: formData.length ? Number(formData.length) : undefined,
//     width: formData.width ? Number(formData.width) : undefined,
//     height: formData.height ? Number(formData.height) : undefined,
//     low_stock_threshold: formData.low_stock_threshold ? Number(formData.low_stock_threshold) : 10,
//     remarks: formData.remarks?.trim() || undefined,
//     is_active: formData.is_active !== false,
//   };
  
//   const cleanedExtraVariants = extraVariants.map(({ newImages, imagesToKeep, imagesToDelete, ...rest }) => rest);
  
//   return [mainVariant, ...cleanedExtraVariants];
// };

// // Build Base Payload (same for JSON or FormData)
// const buildBasePayload = (formData, extraVariants) => {
//   const base = {
//     product_code: formData.product_code.trim().toUpperCase(),
//     name: formData.name.trim(),
//     title: formData.title?.trim() || undefined,
//     primary_vendor_id: formData.primary_vendor_id,
//     category_id: formData.category_id,
//     hsn_code: formData.hsn_code.trim(),
//     gst_percent: Number(formData.gst_percent),
//     gst_type: formData.gst_type,
//     unit_of_measure: formData.unit_of_measure,
//   };
  
//   if (formData.description?.trim())  base.description = formData.description.trim();
//   if (formData.brand_name?.trim())   base.brand_name = formData.brand_name.trim();
//   if (formData.remarks?.trim())      base.remarks = formData.remarks.trim();
//   base.is_active = formData.is_active;
  
//   base.variants = buildCompleteVariantsArray(formData, extraVariants);
  
//   return base;
// };

// // Build FormData for multipart request
// const buildMultipartFormData = (formData, extraVariants, basePayload) => {
//   const multipartForm = new FormData();
  
//   multipartForm.append("data", JSON.stringify(basePayload));
  
//   const productImages = formData.newImages || [];
//   productImages.forEach((file) => {
//     if (file instanceof File) {
//       multipartForm.append("variant_images_0", file);
//     }
//   });
  
//   extraVariants.forEach((variant, idx) => {
//     const variantIndex = idx + 1;
//     const variantImages = variant.newImages || [];
//     variantImages.forEach((img) => {
//       if (img instanceof File) {
//         multipartForm.append(`variant_images_${variantIndex}`, img);
//       }
//     });
//   });
  
//   return multipartForm;
// };

// export default function ProductAddForm({ formData, formErrors, variants, showVariantModal, variantForm, variantErrors, editingVariantIndex, onSave }) {
//   const dispatch = useDispatch();
//   const [createProductJson, { isLoading: isLoadingJson }] = useCreateProductMutation();
//   const [createProductMulti, { isLoading: isLoadingMulti }] = useCreateProductWithImagesMutation();
//   const [uploadVariantImages] = useUploadVariantImagesMutation();
  
//   const isLoading = isLoadingJson || isLoadingMulti;

//   const validate = () => {
//     const errors = {};
//     if (!formData.product_code?.trim())      errors.product_code = "Product code is required";
//     if (!formData.name?.trim())              errors.name = "Product name is required";
//     if (!formData.primary_vendor_id)         errors.primary_vendor_id = "Vendor is required";
//     if (!formData.category_id)               errors.category_id = "Category is required";
//     if (!formData.hsn_code?.trim())          errors.hsn_code = "HSN code is required";
//     if (!formData.unit_of_measure)           errors.unit_of_measure = "Unit of measure is required";
//     if (!formData.mrp || Number(formData.mrp) <= 0)
//       errors.mrp = "MRP is required and must be > 0";
//     if (!formData.wholesale_price || Number(formData.wholesale_price) <= 0)
//       errors.wholesale_price = "Wholesale price is required";
//     if (!formData.retail_price || Number(formData.retail_price) <= 0)
//       errors.retail_price = "Retail price is required";
//     return errors;
//   };

//   const handleSave = async () => {
//     dispatch(clearFormErrors());
//     const errors = validate();
//     if (Object.keys(errors).length > 0) {
//       dispatch(setFormErrors(errors));
//       return;
//     }

//     dispatch(setSubmitting(true));
    
//     try {
//       const basePayload = buildBasePayload(formData, variants);
//       const hasImages = hasAnyImages(formData, variants);
      
//       let created;
      
//       if (hasImages) {
//         const multipartForm = buildMultipartFormData(formData, variants, basePayload);
//         created = await createProductMulti({ formData: multipartForm }).unwrap();
//       } else {
//         created = await createProductJson(basePayload).unwrap();
//       }
      
//       if (!hasImages && ((formData.newImages || []).length > 0 || variants.some(v => (v.newImages || []).length > 0))) {
//         const productImages = formData.newImages || [];
//         if (productImages.length > 0 && created?.variants?.[0]?.variant_id) {
//           const fd = new FormData();
//           productImages.forEach(f => {
//             if (f instanceof File) fd.append("images", f);
//           });
//           await uploadVariantImages({
//             productId: created.product_id,
//             variantId: created.variants[0].variant_id,
//             formData: fd,
//           }).unwrap().catch(() => {});
//         }
        
//         if (variants.length > 0) {
//           for (let i = 0; i < variants.length; i++) {
//             const imgs = variants[i].newImages || [];
//             const variantId = created?.variants?.[i + 1]?.variant_id;
//             if (imgs.length > 0 && variantId) {
//               const fd = new FormData();
//               imgs.forEach(img => {
//                 if (img instanceof File) fd.append("images", img);
//               });
//               await uploadVariantImages({
//                 productId: created.product_id,
//                 variantId,
//                 formData: fd,
//               }).unwrap().catch(() => {});
//             }
//           }
//         }
//       }
      
//       onSave();
//     } catch (err) {
//       if (err?.data?.errors?.length) {
//         const be = {};
//         err.data.errors.forEach(({ field, message }) => { be[field] = message; });
//         dispatch(setFormErrors(be));
//       } else {
//         dispatch(setFormErrors({ general: err?.data?.message || "Failed to create product" }));
//       }
//     } finally {
//       dispatch(setSubmitting(false));
//     }
//   };

//   return (
//     <>
//       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//         <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">

//           <div className="flex items-center justify-between">
//             <div>
//               <h3 className="text-base font-semibold text-gray-800">Add New Product</h3>
//               <p className="text-xs text-gray-400 mt-0.5">Fill product details — add extra variants below</p>
//             </div>
//             <button onClick={() => dispatch(closeAddForm())} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">✕</button>
//           </div>

//           {formErrors?.general && (
//             <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
//               <p className="text-sm text-red-600">{formErrors.general}</p>
//             </div>
//           )}

//           <ProductFormBody
//             formData={formData}
//             onChange={(data) => dispatch(updateFormData(data))}
//             formErrors={formErrors}
//           />

//           <div className="border-t border-gray-100 pt-4">
//             <div className="flex items-center justify-between mb-3">
//               <div>
//                 <p className="text-sm font-semibold text-gray-700">Extra Variants</p>
//                 <p className="text-xs text-gray-400 mt-0.5">
//                   Prices above = Variant 0 (default). Add more variants here.
//                 </p>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => dispatch(openVariantModal())}
//                 className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 cursor-pointer"
//               >
//                 + Add Variant
//               </button>
//             </div>

//             {variants.length === 0 ? (
//               <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
//                 No extra variants — product will be created as single variant
//               </div>
//             ) : (
//               <div className="space-y-2">
//                 {variants.map((v, i) => (
//                   <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
//                     <div className="flex items-center gap-4">
//                       <span className="text-xs font-mono text-gray-500">V{i + 1}</span>
//                       <div>
//                         {v.attributes?.length > 0 && (
//                           <p className="text-xs font-medium text-gray-700">
//                             {v.attributes.map(a => `${a.key}: ${a.value}`).join(", ")}
//                           </p>
//                         )}
//                         <p className="text-xs text-gray-500 mt-0.5">
//                           MRP ₹{v.mrp} · WS ₹{v.wholesale_price} · Retail ₹{v.retail_price}
//                         </p>
//                         {v.weight && (
//                           <p className="text-xs text-gray-400 mt-0.5">
//                             Shipping: {v.weight}kg · {v.length}x{v.width}x{v.height}cm
//                           </p>
//                         )}
//                       </div>
//                     </div>
//                     <div className="flex gap-3">
//                       <button
//                         type="button"
//                         onClick={() => dispatch(openVariantModalForEdit({ index: i }))}
//                         className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
//                       >
//                         Edit
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => dispatch(removeVariantFromList(i))}
//                         className="text-xs text-red-500 hover:text-red-700 cursor-pointer font-medium"
//                       >
//                         Remove
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
//             <button onClick={() => dispatch(closeAddForm())} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
//               Cancel
//             </button>
//             <button
//               onClick={handleSave}
//               disabled={isLoading}
//               className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
//             >
//               {isLoading ? "Creating…" : `Create Product${variants.length > 0 ? ` (${variants.length + 1} variants)` : ""}`}
//             </button>
//           </div>

//         </div>
//       </div>

//       {showVariantModal && (
//         <VariantModal
//           variantForm={variantForm}
//           variantErrors={variantErrors}
//           editingVariantIndex={editingVariantIndex}
//         />
//       )}
//     </>
//   );
// }