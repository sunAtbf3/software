
// TABS/INVENTORY/ProductShared/ProductEditForm.jsx

import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useUpdateProductMutation,
  useUpdateVariantMutation,
  useCreateVariantMutation,
  useUploadVariantImagesMutation,
  useSyncVariantImagesMutation,
  useGetProductByIdQuery,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
import {
  closeEditForm,
  updateFormData,
  setFormErrors,
  clearFormErrors,
  openVariantModal,
  openVariantModalWithData,
  syncFormDataFromDetail,
  setSubmitting,
  saveVariantToList,
  updateVariantInList,
} from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
import ProductFormBody from "./ProductFormBody";
import { normalizeUnitOfMeasure } from "../../../../constants/unitOfMeasure.constants";
import { validateCatalogPricing } from "../../../../utils/productCatalogValidation";
import VariantModal    from "./VariantModal";

const toNumber = (val, defaultVal = 0) => {
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
};

export default function ProductEditForm({
  formData,
  formErrors,
  selectedProduct,
  showVariantModal,
  variantForm,
  variantErrors,
  editingVariantIndex,
  onSave,
}) {
  const dispatch = useDispatch();
  const { variants } = useSelector((state) => state.product);

  const [updateProduct,      { isLoading: isUpdating   }] = useUpdateProductMutation();
  const [updateVariant,      { isLoading: isUpdatingV  }] = useUpdateVariantMutation();
  const [createVariant,      { isLoading: isCreatingV  }] = useCreateVariantMutation();
  const [uploadVariantImages                             ] = useUploadVariantImagesMutation();
  const [syncVariantImages,  { isLoading: isSyncing    }] = useSyncVariantImagesMutation();

  const {
    data: productDetail,
    refetch: refetchDetail,
    isFetching: isFetchingDetail,
  } = useGetProductByIdQuery(selectedProduct?.product_id, {
    skip: !selectedProduct?.product_id,
  });

  const syncedProductIdRef = useRef(null);
  useEffect(() => {
    if (!productDetail) return;
    if (syncedProductIdRef.current === productDetail.product_id) return;
    syncedProductIdRef.current = productDetail.product_id;
    dispatch(syncFormDataFromDetail(productDetail));
  }, [productDetail, dispatch]);

  const validate = () => {
    const errors = {};
    if (!formData.name?.trim())          errors.name = "Product name is required";
    if (!formData.unit_of_measure)     errors.unit_of_measure = "Unit of measure is required";
    if (!formData.primary_vendor_id)     errors.primary_vendor_id = "Vendor is required";
    if (!formData.category_id)           errors.category_id = "Category is required";
    if (formData.low_stock_threshold === undefined || formData.low_stock_threshold === "" || toNumber(formData.low_stock_threshold) < 0)
      errors.low_stock_threshold = "Threshold is required";
    if (!formData.weight || toNumber(formData.weight) <= 0)
      errors.weight = "Weight is required";
    if (!formData.length || toNumber(formData.length) <= 0)
      errors.length = "Length is required";
    if (!formData.width || toNumber(formData.width) <= 0)
      errors.width = "Width is required";
    if (!formData.height || toNumber(formData.height) <= 0)
      errors.height = "Height is required";

    const applyPriceValidation = (prices, label, { mapToFormFields = false } = {}) => {
      const priceError = validateCatalogPricing(prices, label);
      if (!priceError) return;
      if (mapToFormFields) {
        if (priceError.includes("MRP")) errors.mrp = priceError.replace(`${label}: `, "");
        else if (priceError.includes("Special price")) errors.special_price = priceError.replace(`${label}: `, "");
        else if (priceError.includes("Wholesale price")) errors.wholesale_price = priceError.replace(`${label}: `, "");
        else if (priceError.includes("Purchase price")) errors.purchase_price = priceError.replace(`${label}: `, "");
        else if (priceError.includes("Expenses")) errors.expenses = priceError.replace(`${label}: `, "");
        else if (!errors.general) errors.general = priceError;
      } else if (!errors.general) {
        errors.general = priceError;
      }
    };

    applyPriceValidation(formData, "Primary variant", { mapToFormFields: true });
    variants.forEach((v, i) => applyPriceValidation(v, `Variant ${i + 2}`));

    return errors;
  };

  const handleSyncVariantImages = async (productId, variantId, imagesToKeep, imagesToDelete, newImages) => {
    if (!variantId) return;
    
    const keepImageIds = imagesToKeep.map(img => img.image_id).filter(Boolean);
    
    if (keepImageIds.length === 0 && imagesToDelete.length === 0 && newImages.length === 0) {
      return;
    }
    
    const fd = new FormData();
    fd.append("keep_image_ids", JSON.stringify(keepImageIds));
    newImages.forEach(file => {
      if (file instanceof File) fd.append("images", file);
    });
    
    await syncVariantImages({ productId, variantId, formData: fd }).unwrap();
  };

  const handleUpdateProduct = async () => {
    dispatch(clearFormErrors());
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      dispatch(setFormErrors(errors));
      return;
    }

    dispatch(setSubmitting(true));
    try {
      const payload = {
        productId:         selectedProduct.product_id,
        name:              formData.name.trim(),
        title:             formData.title?.trim() || undefined,
        description:       formData.description?.trim()   || undefined,
        brand_name:        formData.brand_name?.trim()    || undefined,
        primary_vendor_id: formData.primary_vendor_id || null,
        category_id:       formData.category_id || null,
        hsn_code:          formData.hsn_code?.trim() || "",
        gst_percent:       formData.gst_percent !== "" && formData.gst_percent != null
          ? toNumber(formData.gst_percent)
          : 0,
        gst_type:          formData.gst_type || "EXEMPT",
        unit_of_measure:   normalizeUnitOfMeasure(formData.unit_of_measure) || "",
        mrp:               toNumber(formData.mrp),
        special_price:     toNumber(formData.special_price),
        wholesale_price:   toNumber(formData.wholesale_price),
        purchase_price:    formData.purchase_price ? toNumber(formData.purchase_price) : 0,
        expenses:          toNumber(formData.expenses),
        warranty:          String(formData.warranty || "").trim() || undefined,
        online_price:      formData.online_price  ? toNumber(formData.online_price)  : undefined,
        purchase_cost:     formData.purchase_cost ? toNumber(formData.purchase_cost) : undefined,
        weight:            formData.weight        ? toNumber(formData.weight)        : undefined,
        length:            formData.length        ? toNumber(formData.length)        : undefined,
        width:             formData.width         ? toNumber(formData.width)         : undefined,
        height:            formData.height        ? toNumber(formData.height)        : undefined,
        remarks:           formData.remarks?.trim() || undefined,
        is_active:         formData.is_active,
        apply_prices_to_variants: false,
      };

      await updateProduct(payload).unwrap();

      // 2. Sync primary variant (Variant 0) — prices, shipping, threshold, images
      const primaryVariantId = productDetail?.primary_variant?.variant_id || productDetail?.variants?.[0]?.variant_id;
      if (primaryVariantId) {
        await updateVariant({
          productId: selectedProduct.product_id,
          variantId: primaryVariantId,
          mrp: toNumber(formData.mrp),
          special_price: toNumber(formData.special_price),
          wholesale_price: toNumber(formData.wholesale_price),
          purchase_price: formData.purchase_price ? toNumber(formData.purchase_price) : 0,
          expenses: toNumber(formData.expenses),
          warranty: String(formData.warranty || "").trim() || undefined,
          online_price: formData.online_price ? toNumber(formData.online_price) : undefined,
          purchase_cost: formData.purchase_cost ? toNumber(formData.purchase_cost) : undefined,
          weight: formData.weight ? toNumber(formData.weight) : undefined,
          length: formData.length ? toNumber(formData.length) : undefined,
          width: formData.width ? toNumber(formData.width) : undefined,
          height: formData.height ? toNumber(formData.height) : undefined,
          low_stock_threshold: toNumber(formData.low_stock_threshold, 10),
          remarks: formData.remarks?.trim() || undefined,
          is_active: formData.is_active,
        }).unwrap();

        await handleSyncVariantImages(
          selectedProduct.product_id,
          primaryVariantId,
          formData.imagesToKeep || [],
          formData.imagesToDelete || [],
          formData.newImages || []
        );
      }

      // 3. Save all extra variants from Redux state
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        
        if (v.variant_id) {
          await updateVariant({
            productId: selectedProduct.product_id,
            variantId: v.variant_id,
            attributes: v.attributes || [],
            mrp: toNumber(v.mrp),
            special_price: toNumber(v.special_price),
            wholesale_price: toNumber(v.wholesale_price),
            purchase_price: toNumber(v.purchase_price),
            expenses: toNumber(v.expenses),
            warranty: String(v.warranty || "").trim() || undefined,
            online_price: v.online_price ? toNumber(v.online_price) : undefined,
            purchase_cost: v.purchase_cost ? toNumber(v.purchase_cost) : undefined,
            weight: v.weight ? toNumber(v.weight) : undefined,
            length: v.length ? toNumber(v.length) : undefined,
            width: v.width ? toNumber(v.width) : undefined,
            height: v.height ? toNumber(v.height) : undefined,
            low_stock_threshold: v.low_stock_threshold ? toNumber(v.low_stock_threshold) : undefined,
            remarks: v.remarks || undefined,
            is_active: v.is_active !== false,
          }).unwrap();
          
          await handleSyncVariantImages(
            selectedProduct.product_id,
            v.variant_id,
            v.imagesToKeep || [],
            v.imagesToDelete || [],
            v.newImages || []
          );
        } else {
          const created = await createVariant({
            productId: selectedProduct.product_id,
            attributes: v.attributes || [],
            mrp: toNumber(v.mrp),
            special_price: toNumber(v.special_price),
            wholesale_price: toNumber(v.wholesale_price),
            purchase_price: toNumber(v.purchase_price),
            expenses: toNumber(v.expenses),
            warranty: String(v.warranty || "").trim() || undefined,
            online_price: v.online_price ? toNumber(v.online_price) : undefined,
            purchase_cost: v.purchase_cost ? toNumber(v.purchase_cost) : undefined,
            weight: v.weight ? toNumber(v.weight) : undefined,
            length: v.length ? toNumber(v.length) : undefined,
            width: v.width ? toNumber(v.width) : undefined,
            height: v.height ? toNumber(v.height) : undefined,
            low_stock_threshold: v.low_stock_threshold ? toNumber(v.low_stock_threshold) : 10,
            remarks: v.remarks || undefined,
            is_active: v.is_active !== false,
          }).unwrap();
          
          if ((v.newImages || []).length > 0 && created?.variant_id) {
            const fd = new FormData();
            v.newImages.forEach(f => {
              if (f instanceof File) fd.append("images", f);
            });
            await uploadVariantImages({
              productId: selectedProduct.product_id,
              variantId: created.variant_id,
              formData: fd,
            }).unwrap().catch(() => {});
          }
        }
      }

      syncedProductIdRef.current = null;
      await refetchDetail();
      onSave();
    } catch (err) {
      if (err?.data?.errors?.length) {
        const be = {};
        err.data.errors.forEach(({ field, message }) => { be[field] = message; });
        dispatch(setFormErrors(be));
      } else {
        dispatch(setFormErrors({ general: err?.data?.message || "Failed to update product" }));
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

  const allVariants = productDetail?.variants || [];
  const existingVariants = allVariants.slice(1);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black/40" />

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Edit Product</h3>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {selectedProduct?.product_code} — {selectedProduct?.name}
              </p>
            </div>
            <button
              onClick={() => dispatch(closeEditForm())}
              className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          {isFetchingDetail && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-blue-600">Loading full product details…</span>
            </div>
          )}

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

          <div className="flex justify-end">
            <button
              onClick={handleUpdateProduct}
              disabled={isUpdating || isFetchingDetail}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
            >
              {isUpdating ? "Saving…" : "Save Product Changes"}
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Extra Variants ({variants.length})
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Prices above = Variant 0 (primary). Manage extra variants here.
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
                No extra variants — only the primary variant exists
              </div>
            ) : (
              <div className="space-y-2">
                {variants.map((v, i) => {
                  const thumbUrl = v.imagesToKeep?.[0]?.url || null;
                  return (
                    <div
                      key={v.variant_id || i}
                      className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt="variant thumb"
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {v.variant_code && (
                              <span className="text-xs font-mono text-gray-400">{v.variant_code}</span>
                            )}
                            {v.system_barcode && (
                              <span className="text-xs font-mono text-gray-300">{v.system_barcode}</span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${v.is_active !== false ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                              {v.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {v.attributes?.length > 0 && (
                            <p className="text-xs font-medium text-gray-700 mt-0.5">
                              {v.attributes.map(a => `${a.key}: ${a.value}`).join(", ")}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            MRP ₹{v.mrp?.toLocaleString()} · SP ₹{v.special_price?.toLocaleString()} · WP ₹{v.wholesale_price?.toLocaleString()} · PP ₹{v.purchase_price?.toLocaleString()} · Exp ₹{v.expenses?.toLocaleString()} · {v.warranty || "—"}
                          </p>
                          {((v.imagesToKeep?.length || 0) + (v.newImages?.length || 0)) > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {(v.imagesToKeep?.length || 0) + (v.newImages?.length || 0)} image(s)
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          dispatch(openVariantModalWithData({
                            index: i,
                            variant_id: v.variant_id || null,
                            variant_code: v.variant_code || null,
                            system_barcode: v.system_barcode || null,
                            attributes: v.attributes?.length > 0 ? v.attributes : [{ key: "", value: "" }],
                            mrp: String(v.mrp ?? ""),
                            special_price: String(v.special_price ?? ""),
                            wholesale_price: String(v.wholesale_price ?? ""),
                            purchase_price: String(v.purchase_price ?? ""),
                            expenses: String(v.expenses ?? ""),
                            warranty: v.warranty || "",
                            online_price: String(v.online_price ?? ""),
                            purchase_cost: String(v.purchase_cost ?? ""),
                            weight: String(v.weight ?? ""),
                            length: String(v.length ?? ""),
                            width: String(v.width ?? ""),
                            height: String(v.height ?? ""),
                            low_stock_threshold: String(v.low_stock_threshold ?? "10"),
                            remarks: v.remarks || "",
                            imagesToKeep: v.imagesToKeep || [],
                            imagesToDelete: v.imagesToDelete || [],
                            newImages: v.newImages || [],
                            is_active: v.is_active !== false,
                          }));
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium flex-shrink-0 ml-3"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              onClick={() => dispatch(closeEditForm())}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Close
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
// down code is not updated by the new price updates use upper updated and working code 
// // TABS/INVENTORY/ProductShared/ProductEditForm.jsx

// import React, { useEffect, useRef } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   useUpdateProductMutation,
//   useUpdateVariantMutation,
//   useCreateVariantMutation,
//   useUploadVariantImagesMutation,
//   useSyncVariantImagesMutation,
//   useGetProductByIdQuery,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productApi";
// import {
//   closeEditForm,
//   updateFormData,
//   setFormErrors,
//   clearFormErrors,
//   openVariantModal,
//   openVariantModalWithData,
//   syncFormDataFromDetail,
//   setSubmitting,
//   saveVariantToList,
//   updateVariantInList,
// } from "../../../../REDUX_FEATURES/REDUX_SLICES/Product_api/productSlice";
// import ProductFormBody from "./ProductFormBody";
// import VariantModal    from "./VariantModal";

// export default function ProductEditForm({
//   formData,
//   formErrors,
//   selectedProduct,
//   showVariantModal,
//   variantForm,
//   variantErrors,
//   editingVariantIndex,
//   onSave,
// }) {
//   const dispatch = useDispatch();
//   const { variants } = useSelector((state) => state.product);

//   const [updateProduct,      { isLoading: isUpdating   }] = useUpdateProductMutation();
//   const [updateVariant,      { isLoading: isUpdatingV  }] = useUpdateVariantMutation();
//   const [createVariant,      { isLoading: isCreatingV  }] = useCreateVariantMutation();
//   const [uploadVariantImages                             ] = useUploadVariantImagesMutation();
//   const [syncVariantImages,  { isLoading: isSyncing    }] = useSyncVariantImagesMutation(); // ← ADD THIS

//   const {
//     data: productDetail,
//     refetch: refetchDetail,
//     isFetching: isFetchingDetail,
//   } = useGetProductByIdQuery(selectedProduct?.product_id, {
//     skip: !selectedProduct?.product_id,
//   });

//   const syncedProductIdRef = useRef(null);
//   useEffect(() => {
//     if (!productDetail) return;
//     if (syncedProductIdRef.current === productDetail.product_id) return;
//     syncedProductIdRef.current = productDetail.product_id;
//     dispatch(syncFormDataFromDetail(productDetail));
//   }, [productDetail, dispatch]);

//   const validate = () => {
//     const errors = {};
//     if (!formData.name?.trim())          errors.name = "Product name is required";
//     if (!formData.primary_vendor_id)     errors.primary_vendor_id = "Vendor is required";
//     if (!formData.category_id)           errors.category_id = "Category is required";
//     if (!formData.hsn_code?.trim())      errors.hsn_code = "HSN code is required";
//     if (!formData.unit_of_measure)       errors.unit_of_measure = "Unit of measure is required";
//     if (!formData.mrp || Number(formData.mrp) <= 0)
//       errors.mrp = "MRP is required and must be > 0";
//     if (!formData.wholesale_price || Number(formData.wholesale_price) <= 0)
//       errors.wholesale_price = "Wholesale price is required";
//     if (!formData.retail_price || Number(formData.retail_price) <= 0)
//       errors.retail_price = "Retail price is required";
//     return errors;
//   };

//   // ── Handle image sync for a variant using PUT with keep_image_ids ───────────
//    // ── Handle image sync for a variant using PUT with keep_image_ids ───────────
//   const handleSyncVariantImages = async (productId, variantId, imagesToKeep, imagesToDelete, newImages) => {
//     if (!variantId) return;
    
//     const keepImageIds = imagesToKeep.map(img => img.image_id).filter(Boolean);
    
//     if (keepImageIds.length === 0 && imagesToDelete.length === 0 && newImages.length === 0) {
//       return;
//     }
    
//     const fd = new FormData();
//     fd.append("keep_image_ids", JSON.stringify(keepImageIds));
//     newImages.forEach(file => {
//       if (file instanceof File) fd.append("images", file);
//     });
    
//     await syncVariantImages({ productId, variantId, formData: fd }).unwrap();
//   };

//   const handleUpdateProduct = async () => {
//     dispatch(clearFormErrors());
//     const errors = validate();
//     if (Object.keys(errors).length > 0) {
//       dispatch(setFormErrors(errors));
//       return;
//     }

//     dispatch(setSubmitting(true));
//     try {
//       // 1. Update product-level fields
//       const payload = {
//         productId:         selectedProduct.product_id,
//         name:              formData.name.trim(),
//         title:             formData.title?.trim() || undefined,
//         description:       formData.description?.trim()   || undefined,
//         brand_name:        formData.brand_name?.trim()    || undefined,
//         primary_vendor_id: formData.primary_vendor_id     || undefined,
//         category_id:       formData.category_id           || undefined,
//         hsn_code:          formData.hsn_code.trim(),
//         gst_percent:       Number(formData.gst_percent),
//         gst_type:          formData.gst_type,
//         unit_of_measure:   formData.unit_of_measure,
//         mrp:               Number(formData.mrp),
//         wholesale_price:   Number(formData.wholesale_price),
//         retail_price:      Number(formData.retail_price),
//         online_price:      formData.online_price  ? Number(formData.online_price)  : undefined,
//         purchase_cost:     formData.purchase_cost ? Number(formData.purchase_cost) : undefined,
//         weight:            formData.weight        ? Number(formData.weight)        : undefined,
//         length:            formData.length        ? Number(formData.length)        : undefined,
//         width:             formData.width         ? Number(formData.width)         : undefined,
//         height:            formData.height        ? Number(formData.height)        : undefined,
//         remarks:           formData.remarks?.trim() || undefined,
//         is_active:         formData.is_active,
//         apply_prices_to_variants: false,
//       };

//       await updateProduct(payload).unwrap();

//       // 2. Handle primary variant images
//       const primaryVariantId = productDetail?.primary_variant?.variant_id || productDetail?.variants?.[0]?.variant_id;
//       if (primaryVariantId) {
//         await handleSyncVariantImages(
//           selectedProduct.product_id,
//           primaryVariantId,
//           formData.imagesToKeep || [],
//           formData.imagesToDelete || [],
//           formData.newImages || []
//         );
//       }

//       // 3. Save all extra variants from Redux state (batch save - FIX ISSUE 3)
//       for (let i = 0; i < variants.length; i++) {
//         const v = variants[i];
        
//         if (v.variant_id) {
//           // Update existing variant
//           await updateVariant({
//             productId: selectedProduct.product_id,
//             variantId: v.variant_id,
//             attributes: v.attributes || [],
//             mrp: Number(v.mrp),
//             wholesale_price: Number(v.wholesale_price),
//             retail_price: Number(v.retail_price),
//             online_price: v.online_price ? Number(v.online_price) : undefined,
//             purchase_cost: v.purchase_cost ? Number(v.purchase_cost) : undefined,
//             weight: v.weight ? Number(v.weight) : undefined,
//             length: v.length ? Number(v.length) : undefined,
//             width: v.width ? Number(v.width) : undefined,
//             height: v.height ? Number(v.height) : undefined,
//             low_stock_threshold: v.low_stock_threshold ? Number(v.low_stock_threshold) : undefined,
//             remarks: v.remarks || undefined,
//             is_active: v.is_active !== false,
//           }).unwrap();
          
//           // Sync images for this variant
//           await handleSyncVariantImages(
//             selectedProduct.product_id,
//             v.variant_id,
//             v.imagesToKeep || [],
//             v.imagesToDelete || [],
//             v.newImages || []
//           );
//         } else {
//           // Create new variant
//           const created = await createVariant({
//             productId: selectedProduct.product_id,
//             attributes: v.attributes || [],
//             mrp: Number(v.mrp),
//             wholesale_price: Number(v.wholesale_price),
//             retail_price: Number(v.retail_price),
//             online_price: v.online_price ? Number(v.online_price) : undefined,
//             purchase_cost: v.purchase_cost ? Number(v.purchase_cost) : undefined,
//             weight: v.weight ? Number(v.weight) : undefined,
//             length: v.length ? Number(v.length) : undefined,
//             width: v.width ? Number(v.width) : undefined,
//             height: v.height ? Number(v.height) : undefined,
//             low_stock_threshold: v.low_stock_threshold ? Number(v.low_stock_threshold) : 10,
//             remarks: v.remarks || undefined,
//             is_active: v.is_active !== false,
//           }).unwrap();
          
//           // Upload images for new variant
//           if ((v.newImages || []).length > 0 && created?.variant_id) {
//             const fd = new FormData();
//             v.newImages.forEach(f => {
//               if (f instanceof File) fd.append("images", f);
//             });
//             await uploadVariantImages({
//               productId: selectedProduct.product_id,
//               variantId: created.variant_id,
//               formData: fd,
//             }).unwrap().catch(() => {});
//           }
//         }
//       }

//       syncedProductIdRef.current = null;
//       await refetchDetail();
//       onSave();
//     } catch (err) {
//       if (err?.data?.errors?.length) {
//         const be = {};
//         err.data.errors.forEach(({ field, message }) => { be[field] = message; });
//         dispatch(setFormErrors(be));
//       } else {
//         dispatch(setFormErrors({ general: err?.data?.message || "Failed to update product" }));
//       }
//     } finally {
//       dispatch(setSubmitting(false));
//     }
//   };

//   // ── VariantModal save handler for ADD/EDIT in edit mode (batch save) ────────
//   const handleVariantModalSave = (variantPayload) => {
//     // Instead of calling API immediately, save to Redux state (batch save)
//     if (editingVariantIndex !== null && editingVariantIndex >= 0) {
//       // Update existing variant in Redux
//       dispatch(updateVariantInList({ index: editingVariantIndex, variant: variantPayload }));
//     } else {
//       // Add new variant to Redux list
//       dispatch(saveVariantToList(variantPayload));
//     }
//   };

//   const allVariants = productDetail?.variants || [];
//   const existingVariants = allVariants.slice(1);

//   return (
//     <>
//       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//         <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">

//           <div className="flex items-center justify-between">
//             <div>
//               <h3 className="text-base font-semibold text-gray-800">Edit Product</h3>
//               <p className="text-xs text-gray-400 mt-0.5 font-mono">
//                 {selectedProduct?.product_code} — {selectedProduct?.name}
//               </p>
//             </div>
//             <button
//               onClick={() => dispatch(closeEditForm())}
//               className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
//             >
//               ✕
//             </button>
//           </div>

//           {isFetchingDetail && (
//             <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
//               <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
//               <span className="text-xs text-blue-600">Loading full product details…</span>
//             </div>
//           )}

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

//           <div className="flex justify-end">
//             <button
//               onClick={handleUpdateProduct}
//               disabled={isUpdating || isFetchingDetail}
//               className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
//             >
//               {isUpdating ? "Saving…" : "Save Product Changes"}
//             </button>
//           </div>

//           <div className="border-t border-gray-100 pt-4">
//             <div className="flex items-center justify-between mb-3">
//               <div>
//                 <p className="text-sm font-semibold text-gray-700">
//                   Extra Variants ({variants.length})
//                 </p>
//                 <p className="text-xs text-gray-400 mt-0.5">
//                   Prices above = Variant 0 (primary). Manage extra variants here.
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
//                 No extra variants — only the primary variant exists
//               </div>
//             ) : (
//               <div className="space-y-2">
//                 {variants.map((v, i) => {
//                   const thumbUrl = v.imagesToKeep?.[0]?.url || null;
//                   return (
//                     <div
//                       key={v.variant_id || i}
//                       className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
//                     >
//                       <div className="flex items-center gap-3">
//                         {thumbUrl ? (
//                           <img
//                             src={thumbUrl}
//                             alt="variant thumb"
//                             className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0"
//                           />
//                         ) : (
//                           <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
//                             <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                                 d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
//                               />
//                             </svg>
//                           </div>
//                         )}
//                         <div>
//                           <div className="flex items-center gap-2 flex-wrap">
//                             {v.variant_code && (
//                               <span className="text-xs font-mono text-gray-400">{v.variant_code}</span>
//                             )}
//                             {v.system_barcode && (
//                               <span className="text-xs font-mono text-gray-300">{v.system_barcode}</span>
//                             )}
//                             <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${v.is_active !== false ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
//                               {v.is_active !== false ? "Active" : "Inactive"}
//                             </span>
//                           </div>
//                           {v.attributes?.length > 0 && (
//                             <p className="text-xs font-medium text-gray-700 mt-0.5">
//                               {v.attributes.map(a => `${a.key}: ${a.value}`).join(", ")}
//                             </p>
//                           )}
//                           <p className="text-xs text-gray-500 mt-0.5">
//                             MRP ₹{v.mrp?.toLocaleString()} · WS ₹{v.wholesale_price?.toLocaleString()} · Retail ₹{v.retail_price?.toLocaleString()}
//                           </p>
//                           {((v.imagesToKeep?.length || 0) + (v.newImages?.length || 0)) > 0 && (
//                             <p className="text-xs text-gray-400 mt-0.5">
//                               {(v.imagesToKeep?.length || 0) + (v.newImages?.length || 0)} image(s)
//                             </p>
//                           )}
//                         </div>
//                       </div>

//                       <button
//                         type="button"
//                         onClick={() => {
//                           dispatch(openVariantModalWithData({
//                             variant_id: v.variant_id || null,
//                             variant_code: v.variant_code || null,
//                             system_barcode: v.system_barcode || null,
//                             attributes: v.attributes?.length > 0 ? v.attributes : [{ key: "", value: "" }],
//                             mrp: String(v.mrp ?? ""),
//                             wholesale_price: String(v.wholesale_price ?? ""),
//                             retail_price: String(v.retail_price ?? ""),
//                             online_price: String(v.online_price ?? ""),
//                             purchase_cost: String(v.purchase_cost ?? ""),
//                             weight: String(v.weight ?? ""),
//                             length: String(v.length ?? ""),
//                             width: String(v.width ?? ""),
//                             height: String(v.height ?? ""),
//                             low_stock_threshold: String(v.low_stock_threshold ?? "10"),
//                             remarks: v.remarks || "",
//                             imagesToKeep: v.imagesToKeep || [],
//                             imagesToDelete: v.imagesToDelete || [],
//                             newImages: v.newImages || [],
//                             is_active: v.is_active !== false,
//                           }));
//                         }}
//                         className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium flex-shrink-0 ml-3"
//                       >
//                         Edit
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>

//           <div className="flex justify-end pt-2 border-t border-gray-100">
//             <button
//               onClick={() => dispatch(closeEditForm())}
//               className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
//             >
//               Close
//             </button>
//           </div>

//         </div>
//       </div>

//       {showVariantModal && (
//         <VariantModal
//           variantForm={variantForm}
//           variantErrors={variantErrors}
//           editingVariantIndex={editingVariantIndex}
//           onSaveOverride={handleVariantModalSave}
//         />
//       )}
//     </>
//   );
// }
