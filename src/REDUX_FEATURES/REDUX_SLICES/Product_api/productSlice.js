// REDUX_SLICES/Product_api/productSlice.js

import { createSlice } from "@reduxjs/toolkit";
import { normalizeUnitOfMeasure } from "../../../constants/unitOfMeasure.constants";

// ── Empty forms ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  product_code: "",
  name: "",
  title: "",
  description: "",
  brand_name: "",
  primary_vendor_id: "",
  category_id: "",
  hsn_code: "",
  gst_percent: "18",
  gst_type: "CGST_SGST",
  unit_of_measure: "",
  mrp: "",
  special_price: "",
  wholesale_price: "",
  purchase_price: "",
  expenses: "",
  warranty: "",
  online_price: "",
  purchase_cost: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  low_stock_threshold: "10",
  remarks: "",
  is_active: true,
  // IMAGE TRACKING FOR EDIT MODE
  imagesToKeep: [],
  imagesToDelete: [],
  newImages: [],
};

const EMPTY_VARIANT_FORM = {
  attributes: [{ key: "", value: "" }],
  mrp: "",
  special_price: "",
  wholesale_price: "",
  purchase_price: "",
  expenses: "",
  warranty: "",
  online_price: "",
  purchase_cost: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  low_stock_threshold: "10",
  remarks: "",
  // IMAGE TRACKING FOR VARIANT EDIT MODE
  imagesToKeep: [],
  imagesToDelete: [],
  newImages: [],
  is_active: true,
  variant_id: null,
  variant_code: null,
  system_barcode: null,
};

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState = {
  selectedProductIds: [],
  showArchiveTab: false,
  archiveSelectedProductIds: [],
  showAddForm: false,
  showEditForm: false,
  showVariantModal: false,
  showViewModal: false,
  selectedProduct: null,
  formData: { ...EMPTY_FORM },
  formErrors: {},
  variants: [],
  editingVariantIndex: null,
  variantForm: { ...EMPTY_VARIANT_FORM },
  variantErrors: {},
  search: "",
  categoryFilter: "",
  activeFilter: "",
  currentPage: 1,
  pageSize: 20,
  isSubmitting: false,
};

// ── Helper: extract image objects with ids from a variant ─────────────────────
const extractImagesWithIds = (variant) => {
  if (!variant?.images || variant.images.length === 0) return [];
  return variant.images.map(img => ({
    image_id: img.image_id || null,
    url: typeof img === "string" ? img : img?.url,
    sort_order: img.sort_order || 0,
  })).filter(img => img.url);
};

// ── Helper: get first image URL for thumbnail ─────────────────────────────────
export const getVariantThumbnail = (variant) => {
  if (!variant?.images || variant.images.length === 0) return null;
  const first = variant.images[0];
  return typeof first === "string" ? first : first?.url || null;
};

// ── Helper: build formData from a product object ──────────────────────────────
const buildFormDataFromProduct = (p) => {
  const primaryVariant =
    p.primary_variant ||
    p.variants?.find(v => v.is_default) ||
    p.variants?.[0] ||
    {};

  const imagesWithIds = extractImagesWithIds(primaryVariant);

  return {
    product_code: p.product_code || "",
    name: p.name || "",
    title: p.title || "",
    description: p.description || "",
    brand_name: p.brand_name || "",
    primary_vendor_id: p.primary_vendor_id || "",
    category_id: p.category_id || "",
    hsn_code: p.hsn_code || "",
    gst_percent: String(p.gst_percent ?? "18"),
    gst_type: p.gst_type || "CGST_SGST",
    unit_of_measure: normalizeUnitOfMeasure(p.unit_of_measure) || "Pcs",
    mrp: String(primaryVariant.mrp ?? p.mrp ?? ""),
    special_price: String(primaryVariant.special_price ?? p.special_price ?? ""),
    wholesale_price: String(primaryVariant.wholesale_price ?? p.wholesale_price ?? ""),
    purchase_price: String(primaryVariant.purchase_price ?? p.purchase_price ?? ""),
    expenses: String(primaryVariant.expenses ?? p.expenses ?? ""),
    warranty: primaryVariant.warranty ?? p.warranty ?? "",
    online_price: String(primaryVariant.online_price ?? p.online_price ?? ""),
    purchase_cost: String(primaryVariant.purchase_cost ?? p.purchase_cost ?? ""),
    weight: String(primaryVariant.weight ?? ""),
    length: String(primaryVariant.length ?? ""),
    width: String(primaryVariant.width ?? ""),
    height: String(primaryVariant.height ?? ""),
    low_stock_threshold: String(
      primaryVariant.low_stock_threshold
        ?? primaryVariant.stocks?.[0]?.low_stock_threshold
        ?? "10"
    ),
    remarks: p.remarks || "",
    is_active: p.is_active ?? true,
    imagesToKeep: imagesWithIds,
    imagesToDelete: [],
    newImages: [],
  };
};

// ── Helper: build variants array (index 1+) from product ─────────────────────
const buildVariantsFromProduct = (p) => {
  const allVariants = p.variants || [];
  return allVariants.slice(1).map(v => ({
    variant_id: v.variant_id,
    variant_code: v.variant_code,
    system_barcode: v.system_barcode,
    attributes: v.attributes || [],
    mrp: v.mrp,
    special_price: v.special_price,
    wholesale_price: v.wholesale_price,
    purchase_price: v.purchase_price,
    expenses: v.expenses,
    warranty: v.warranty || "",
    online_price: v.online_price,
    purchase_cost: v.purchase_cost,
    weight: v.weight,
    length: v.length,
    width: v.width,
    height: v.height,
    low_stock_threshold: v.low_stock_threshold || 10,
    remarks: v.remarks || "",
    imagesToKeep: extractImagesWithIds(v),
    imagesToDelete: [],
    newImages: [],
    is_active: v.is_active !== false,
  }));
};

// ── Helper: reset image tracking for form ─────────────────────────────────────
const resetFormImageTracking = (state) => {
  state.formData.imagesToKeep = [];
  state.formData.imagesToDelete = [];
  state.formData.newImages = [];
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {

    // ── Add Form ──────────────────────────────────────────────────────────────
    openAddForm: (state) => {
      state.showAddForm = true;
      state.formData = { ...EMPTY_FORM };
      state.formErrors = {};
      state.variants = [];
      state.editingVariantIndex = null;
      resetFormImageTracking(state);
    },
    closeAddForm: (state) => {
      state.showAddForm = false;
      state.formData = { ...EMPTY_FORM };
      state.formErrors = {};
      state.variants = [];
      state.editingVariantIndex = null;
      resetFormImageTracking(state);
    },

    // ── Edit Form ─────────────────────────────────────────────────────────────
    openEditForm: (state, action) => {
      const p = action.payload;
      state.showEditForm = true;
      state.selectedProduct = p;
      state.formData = buildFormDataFromProduct(p);
      state.variants = buildVariantsFromProduct(p);
      state.formErrors = {};
      state.editingVariantIndex = null;
    },

    syncFormDataFromDetail: (state, action) => {
      const p = action.payload;
      state.selectedProduct = p;
      state.formData = buildFormDataFromProduct(p);
      state.variants = buildVariantsFromProduct(p);
    },

    closeEditForm: (state) => {
      state.showEditForm = false;
      state.selectedProduct = null;
      state.formData = { ...EMPTY_FORM };
      state.formErrors = {};
      state.variants = [];
      state.editingVariantIndex = null;
      resetFormImageTracking(state);
    },

    // ── View Modal ────────────────────────────────────────────────────────────
    openViewModal: (state, action) => {
      state.showViewModal = true;
      state.selectedProduct = action.payload;
    },
    closeViewModal: (state) => {
      state.showViewModal = false;
      state.selectedProduct = null;
    },

    // ── Product Form Updates ──────────────────────────────────────────────────
    updateFormData: (state, action) => {
      const payload = action.payload;
      if (payload && typeof payload === "object") {
        state.formData = { ...state.formData, ...payload };
        const field = Object.keys(payload)[0];
        if (field && state.formErrors[field]) {
          delete state.formErrors[field];
        }
      }
    },
    setFormErrors: (state, action) => {
      state.formErrors = action.payload;
    },
    clearFormErrors: (state) => {
      state.formErrors = {};
    },

    // ── Image Management for Product Form ────────────────────────────────────
    addProductImages: (state, action) => {
      const files = action.payload;
      const currentNew = state.formData.newImages || [];
      const totalExisting = (state.formData.imagesToKeep || []).length;
      const availableSlots = 4 - totalExisting - currentNew.length;
      const toAdd = files.slice(0, availableSlots);
      state.formData.newImages = [...currentNew, ...toAdd];
    },
    removeProductImage: (state, action) => {
      const { index, isExisting, imageId, url } = action.payload;
      if (isExisting && imageId) {
        state.formData.imagesToDelete.push({ image_id: imageId, url });
        state.formData.imagesToKeep = state.formData.imagesToKeep.filter(
          (img, i) => i !== index
        );
      } else {
        const newIdx = index - (state.formData.imagesToKeep?.length || 0);
        if (newIdx >= 0) {
          state.formData.newImages = state.formData.newImages.filter((_, i) => i !== newIdx);
        }
      }
    },
    replaceProductImage: (state, action) => {
      const { index, isExisting, imageId, file } = action.payload;
      if (isExisting && imageId) {
        state.formData.imagesToDelete.push({ image_id: imageId });
        state.formData.imagesToKeep = state.formData.imagesToKeep.filter(
          (_, i) => i !== index
        );
        state.formData.newImages.push(file);
      } else {
        const newIdx = index - (state.formData.imagesToKeep?.length || 0);
        if (newIdx >= 0) {
          state.formData.newImages[newIdx] = file;
        }
      }
    },

    // ── Variant Modal — open blank (add flow) ─────────────────────────────────
    openVariantModal: (state) => {
      state.showVariantModal = true;
      state.editingVariantIndex = null;
      state.variantForm = {
        ...EMPTY_VARIANT_FORM,
        imagesToKeep: [],
        imagesToDelete: [],
        newImages: [],
      };
      state.variantErrors = {};
    },

    openVariantModalForEdit: (state, action) => {
      const { index } = action.payload;
      const existing = state.variants[index];
      state.showVariantModal = true;
      state.editingVariantIndex = index;
      state.variantErrors = {};
      if (existing) {
        state.variantForm = {
          variant_id: existing.variant_id || null,
          variant_code: existing.variant_code || null,
          system_barcode: existing.system_barcode || null,
          attributes: existing.attributes?.length > 0
            ? existing.attributes
            : [{ key: "", value: "" }],
          mrp: String(existing.mrp ?? ""),
          special_price: String(existing.special_price ?? ""),
          wholesale_price: String(existing.wholesale_price ?? ""),
          purchase_price: String(existing.purchase_price ?? ""),
          expenses: String(existing.expenses ?? ""),
          warranty: existing.warranty || "",
          online_price: String(existing.online_price ?? ""),
          purchase_cost: String(existing.purchase_cost ?? ""),
          weight: String(existing.weight ?? ""),
          length: String(existing.length ?? ""),
          width: String(existing.width ?? ""),
          height: String(existing.height ?? ""),
          low_stock_threshold: String(existing.low_stock_threshold ?? "10"),
          remarks: existing.remarks || "",
          imagesToKeep: existing.imagesToKeep || [],
          imagesToDelete: existing.imagesToDelete || [],
          newImages: existing.newImages || [],
          is_active: existing.is_active !== false,
        };
      }
    },

    openVariantModalWithData: (state, action) => {
      const { index = 0, ...v } = action.payload;
      state.showVariantModal = true;
      state.editingVariantIndex = index;
      state.variantErrors = {};
      state.variantForm = {
        variant_id: v.variant_id || null,
        variant_code: v.variant_code || null,
        system_barcode: v.system_barcode || null,
        attributes: v.attributes?.length > 0 ? v.attributes : [{ key: "", value: "" }],
        mrp: String(v.mrp ?? ""),
        special_price: String(v.special_price ?? ""),
        wholesale_price: String(v.wholesale_price ?? ""),
        purchase_price: String(v.purchase_price ?? ""),
        expenses: String(v.expenses ?? ""),
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
      };
    },

    closeVariantModal: (state) => {
      state.showVariantModal = false;
      state.editingVariantIndex = null;
      state.variantForm = { ...EMPTY_VARIANT_FORM };
      state.variantErrors = {};
    },

    // ── Variant Form Updates ──────────────────────────────────────────────────
    updateVariantForm: (state, action) => {
      const payload = action.payload;
      if (payload && typeof payload === "object") {
        state.variantForm = { ...state.variantForm, ...payload };
        const field = Object.keys(payload)[0];
        if (field && state.variantErrors[field]) {
          delete state.variantErrors[field];
        }
      }
    },
    updateVariantAttribute: (state, action) => {
      const { index, key, value } = action.payload;
      const attrs = [...(state.variantForm.attributes || [])];
      attrs[index] = { key, value };
      state.variantForm.attributes = attrs;
    },
    addVariantAttributeRow: (state) => {
      state.variantForm.attributes = [
        ...(state.variantForm.attributes || []),
        { key: "", value: "" },
      ];
    },
    removeVariantAttributeRow: (state, action) => {
      const idx = action.payload;
      state.variantForm.attributes = state.variantForm.attributes.filter((_, i) => i !== idx);
    },
    setVariantErrors: (state, action) => {
      state.variantErrors = action.payload;
    },
    clearVariantErrors: (state) => {
      state.variantErrors = {};
    },

    // ── Variant Image Management ────────────────────────────────────────────
    addVariantImages: (state, action) => {
      const files = action.payload;
      const currentNew = state.variantForm.newImages || [];
      const totalExisting = (state.variantForm.imagesToKeep || []).length;
      const availableSlots = 4 - totalExisting - currentNew.length;
      const toAdd = files.slice(0, availableSlots);
      state.variantForm.newImages = [...currentNew, ...toAdd];
    },
    removeVariantImage: (state, action) => {
      const { index, isExisting, imageId } = action.payload;
      if (isExisting && imageId) {
        state.variantForm.imagesToDelete.push({ image_id: imageId });
        state.variantForm.imagesToKeep = state.variantForm.imagesToKeep.filter(
          (_, i) => i !== index
        );
      } else {
        const newIdx = index - (state.variantForm.imagesToKeep?.length || 0);
        if (newIdx >= 0) {
          state.variantForm.newImages = state.variantForm.newImages.filter((_, i) => i !== newIdx);
        }
      }
    },
    replaceVariantImage: (state, action) => {
      const { index, isExisting, imageId, file } = action.payload;
      if (isExisting && imageId) {
        state.variantForm.imagesToDelete.push({ image_id: imageId });
        state.variantForm.imagesToKeep = state.variantForm.imagesToKeep.filter(
          (_, i) => i !== index
        );
        state.variantForm.newImages.push(file);
      } else {
        const newIdx = index - (state.variantForm.imagesToKeep?.length || 0);
        if (newIdx >= 0) {
          state.variantForm.newImages[newIdx] = file;
        }
      }
    },

    // ── Variants Array ────────────────────────────────────────────────────────
    saveVariantToList: (state, action) => {
      const variant = action.payload;
      if (state.editingVariantIndex !== null) {
        state.variants[state.editingVariantIndex] = variant;
      } else {
        state.variants.push(variant);
      }
      state.showVariantModal = false;
      state.editingVariantIndex = null;
      state.variantForm = { ...EMPTY_VARIANT_FORM };
      state.variantErrors = {};
    },
    removeVariantFromList: (state, action) => {
      state.variants = state.variants.filter((_, i) => i !== action.payload);
    },
    updateVariantInList: (state, action) => {
      const { index, variant } = action.payload;
      if (index !== undefined && state.variants[index]) {
        state.variants[index] = variant;
      }
    },

    // ── Filters & Pagination ──────────────────────────────────────────────────
    setSearch: (state, action) => {
      state.search = action.payload;
      state.currentPage = 1;
    },
    setCategoryFilter: (state, action) => {
      state.categoryFilter = action.payload;
      state.currentPage = 1;
    },
    setActiveFilter: (state, action) => {
      state.activeFilter = action.payload;
      state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
      state.currentPage = 1;
    },
    resetFilters: (state) => {
      state.search = "";
      state.categoryFilter = "";
      state.activeFilter = "";
      state.currentPage = 1;
    },

    // ── Submitting ────────────────────────────────────────────────────────────
    setSubmitting: (state, action) => {
      state.isSubmitting = action.payload;
    },

    // ── Bulk Selection Reducers ─────────────────────────────────────
    setSelectedProductIds: (state, action) => {
      state.selectedProductIds = action.payload;
    },
    clearSelectedProducts: (state) => {
      state.selectedProductIds = [];
    },
    toggleSelectAll: (state, action) => {
      state.selectedProductIds = action.payload;
    },

    // ── Archive Tab Reducers ──────────────────────────────────────────────
    setShowArchiveTab: (state, action) => {
      state.showArchiveTab = action.payload;
      state.selectedProductIds = [];
      state.archiveSelectedProductIds = [];
    },
    setArchiveSelectedProductIds: (state, action) => {
      state.archiveSelectedProductIds = action.payload;
    },
    clearArchiveSelectedProducts: (state) => {
      state.archiveSelectedProductIds = [];
    },
  },
});

export const {
  openAddForm, closeAddForm,
  openEditForm, closeEditForm,
  openViewModal, closeViewModal,
  syncFormDataFromDetail,
  updateFormData, setFormErrors, clearFormErrors,
  addProductImages, removeProductImage, replaceProductImage,
  openVariantModal,
  openVariantModalForEdit,
  openVariantModalWithData,
  closeVariantModal,
  updateVariantForm,
  updateVariantAttribute, addVariantAttributeRow, removeVariantAttributeRow,
  setVariantErrors, clearVariantErrors,
  addVariantImages, removeVariantImage, replaceVariantImage,
  saveVariantToList, removeVariantFromList, updateVariantInList,
  setSearch, setCategoryFilter, setActiveFilter,
  setCurrentPage, setPageSize, resetFilters,
  setSubmitting,
  setSelectedProductIds,
  clearSelectedProducts,
  toggleSelectAll,
  setShowArchiveTab,
  setArchiveSelectedProductIds,
  clearArchiveSelectedProducts,
} = productSlice.actions;

export default productSlice.reducer;
// down code is not updated by the new price updates use upper updated and working code 
// // REDUX_SLICES/Product_api/productSlice.js

// import { createSlice } from "@reduxjs/toolkit";

// // ── Empty forms ───────────────────────────────────────────────────────────────

// const EMPTY_FORM = {
//   product_code: "",
//   name: "",
//   title: "",
//   description: "",
//   brand_name: "",
//   primary_vendor_id: "",
//   category_id: "",
//   hsn_code: "",
//   gst_percent: "18",
//   gst_type: "CGST_SGST",
//   unit_of_measure: "PCS",
//   mrp: "",
//   wholesale_price: "",
//   retail_price: "",
//   online_price: "",
//   purchase_cost: "",
//   weight: "",
//   length: "",
//   width: "",
//   height: "",
//   remarks: "",
//   is_active: true,
//   // IMAGE TRACKING FOR EDIT MODE (FIX ISSUE 1 & 2)
//   imagesToKeep: [],      // { image_id, url, sort_order }
//   imagesToDelete: [],      // { image_id }
//   newImages: [],      // File objects
// };

// const EMPTY_VARIANT_FORM = {
//   attributes: [{ key: "", value: "" }],
//   mrp: "",
//   wholesale_price: "",
//   retail_price: "",
//   online_price: "",
//   purchase_cost: "",
//   weight: "",
//   length: "",
//   width: "",
//   height: "",
//   low_stock_threshold: "10",
//   remarks: "",
//   // IMAGE TRACKING FOR VARIANT EDIT MODE
//   imagesToKeep: [],
//   imagesToDelete: [],
//   newImages: [],
//   is_active: true,
//   // These three are null in add flow, populated in edit flow
//   variant_id: null,
//   variant_code: null,
//   system_barcode: null,
// };

// // ── Initial state ─────────────────────────────────────────────────────────────

// const initialState = {

//   // ── Bulk Selection ─────────────────────────────────────────────
//   selectedProductIds: [],

//   // ── Archive Tab State ─────────────────────────────────────────────────
//   showArchiveTab: false,   // ADD THIS
//   archiveSelectedProductIds: [], // ADD THIS
//   // ── Modal flags
//   showAddForm: false,
//   showEditForm: false,
//   showVariantModal: false,
//   showViewModal: false,

//   // ── Selected product (for edit/view)
//   selectedProduct: null,

//   // ── Product-level form
//   formData: { ...EMPTY_FORM },
//   formErrors: {},

//   // ── Variants array (extra variants index 1+ stored here before submit in add flow)
//   variants: [],
//   editingVariantIndex: null,

//   // ── Variant form (inside VariantModal)
//   variantForm: { ...EMPTY_VARIANT_FORM },
//   variantErrors: {},

//   // ── Filters & Pagination
//   search: "",
//   categoryFilter: "",
//   activeFilter: "",
//   currentPage: 1,
//   pageSize: 20,

//   // ── Submitting
//   isSubmitting: false,
// };

// // ── Helper: extract image objects with ids from a variant ─────────────────────
// const extractImagesWithIds = (variant) => {
//   if (!variant?.images || variant.images.length === 0) return [];
//   return variant.images.map(img => ({
//     image_id: img.image_id || null,
//     url: typeof img === "string" ? img : img?.url,
//     sort_order: img.sort_order || 0,
//   })).filter(img => img.url);
// };

// // ── Helper: get first image URL for thumbnail ─────────────────────────────────
// export const getVariantThumbnail = (variant) => {
//   if (!variant?.images || variant.images.length === 0) return null;
//   const first = variant.images[0];
//   return typeof first === "string" ? first : first?.url || null;
// };

// // ── Helper: build formData from a product object ──────────────────────────────
// const buildFormDataFromProduct = (p) => {
//   const primaryVariant =
//     p.primary_variant ||
//     p.variants?.find(v => v.is_default) ||
//     p.variants?.[0] ||
//     {};

//   const imagesWithIds = extractImagesWithIds(primaryVariant);

//   return {
//     product_code: p.product_code || "",
//     name: p.name || "",
//     title: p.title || "",
//     description: p.description || "",
//     brand_name: p.brand_name || "",
//     primary_vendor_id: p.primary_vendor_id || "",
//     category_id: p.category_id || "",
//     hsn_code: p.hsn_code || "",
//     gst_percent: String(p.gst_percent ?? "18"),
//     gst_type: p.gst_type || "CGST_SGST",
//     unit_of_measure: p.unit_of_measure || "PCS",
//     mrp: String(primaryVariant.mrp ?? p.mrp ?? ""),
//     wholesale_price: String(primaryVariant.wholesale_price ?? p.wholesale_price ?? ""),
//     retail_price: String(primaryVariant.retail_price ?? p.retail_price ?? ""),
//     online_price: String(primaryVariant.online_price ?? p.online_price ?? ""),
//     purchase_cost: String(primaryVariant.purchase_cost ?? p.purchase_cost ?? ""),
//     weight: String(primaryVariant.weight ?? ""),
//     length: String(primaryVariant.length ?? ""),
//     width: String(primaryVariant.width ?? ""),
//     height: String(primaryVariant.height ?? ""),
//     remarks: p.remarks || "",
//     is_active: p.is_active ?? true,
//     // IMAGE TRACKING FIELDS
//     imagesToKeep: imagesWithIds,
//     imagesToDelete: [],
//     newImages: [],
//   };
// };

// // ── Helper: build variants array (index 1+) from product ─────────────────────
// const buildVariantsFromProduct = (p) => {
//   const allVariants = p.variants || [];
//   return allVariants.slice(1).map(v => ({
//     variant_id: v.variant_id,
//     variant_code: v.variant_code,
//     system_barcode: v.system_barcode,
//     attributes: v.attributes || [],
//     mrp: v.mrp,
//     wholesale_price: v.wholesale_price,
//     retail_price: v.retail_price,
//     online_price: v.online_price,
//     purchase_cost: v.purchase_cost,
//     weight: v.weight,
//     length: v.length,
//     width: v.width,
//     height: v.height,
//     low_stock_threshold: v.low_stock_threshold || 10,
//     remarks: v.remarks || "",
//     // IMAGE TRACKING FOR VARIANTS
//     imagesToKeep: extractImagesWithIds(v),
//     imagesToDelete: [],
//     newImages: [],
//     is_active: v.is_active !== false,
//   }));
// };

// // ── Helper: reset image tracking for form ─────────────────────────────────────
// const resetFormImageTracking = (state) => {
//   state.formData.imagesToKeep = [];
//   state.formData.imagesToDelete = [];
//   state.formData.newImages = [];
// };

// // ── Slice ─────────────────────────────────────────────────────────────────────

// const productSlice = createSlice({
//   name: "product",
//   initialState,
//   reducers: {

//     // ── Add Form ──────────────────────────────────────────────────────────────
//     openAddForm: (state) => {
//       state.showAddForm = true;
//       state.formData = { ...EMPTY_FORM };
//       state.formErrors = {};
//       state.variants = [];
//       state.editingVariantIndex = null;
//       resetFormImageTracking(state);
//     },
//     closeAddForm: (state) => {
//       state.showAddForm = false;
//       state.formData = { ...EMPTY_FORM };
//       state.formErrors = {};
//       state.variants = [];
//       state.editingVariantIndex = null;
//       resetFormImageTracking(state);
//     },

//     // ── Edit Form ─────────────────────────────────────────────────────────────
//     openEditForm: (state, action) => {
//       const p = action.payload;
//       state.showEditForm = true;
//       state.selectedProduct = p;
//       state.formData = buildFormDataFromProduct(p);
//       state.variants = buildVariantsFromProduct(p);
//       state.formErrors = {};
//       state.editingVariantIndex = null;
//     },

//     syncFormDataFromDetail: (state, action) => {
//       const p = action.payload;
//       state.selectedProduct = p;
//       state.formData = buildFormDataFromProduct(p);
//       state.variants = buildVariantsFromProduct(p);
//     },

//     closeEditForm: (state) => {
//       state.showEditForm = false;
//       state.selectedProduct = null;
//       state.formData = { ...EMPTY_FORM };
//       state.formErrors = {};
//       state.variants = [];
//       state.editingVariantIndex = null;
//       resetFormImageTracking(state);
//     },

//     // ── View Modal ────────────────────────────────────────────────────────────
//     openViewModal: (state, action) => {
//       state.showViewModal = true;
//       state.selectedProduct = action.payload;
//     },
//     closeViewModal: (state) => {
//       state.showViewModal = false;
//       state.selectedProduct = null;
//     },

//     // ── Product Form Updates ──────────────────────────────────────────────────
//     updateFormData: (state, action) => {
//       const payload = action.payload;
//       if (payload && typeof payload === "object") {
//         state.formData = { ...state.formData, ...payload };
//         const field = Object.keys(payload)[0];
//         if (field && state.formErrors[field]) {
//           delete state.formErrors[field];
//         }
//       }
//     },
//     setFormErrors: (state, action) => {
//       state.formErrors = action.payload;
//     },
//     clearFormErrors: (state) => {
//       state.formErrors = {};
//     },

//     // ── Image Management for Product Form (FIX ISSUE 1 & 2) ────────────────────
//     addProductImages: (state, action) => {
//       const files = action.payload;
//       const currentNew = state.formData.newImages || [];
//       const totalExisting = (state.formData.imagesToKeep || []).length;
//       const availableSlots = 4 - totalExisting - currentNew.length;
//       const toAdd = files.slice(0, availableSlots);
//       state.formData.newImages = [...currentNew, ...toAdd];
//     },
//     removeProductImage: (state, action) => {
//       const { index, isExisting, imageId, url } = action.payload;
//       if (isExisting && imageId) {
//         // Move to delete list
//         state.formData.imagesToDelete.push({ image_id: imageId, url });
//         state.formData.imagesToKeep = state.formData.imagesToKeep.filter(
//           (img, i) => i !== index
//         );
//       } else {
//         // Remove from new images
//         const newIdx = index - (state.formData.imagesToKeep?.length || 0);
//         if (newIdx >= 0) {
//           state.formData.newImages = state.formData.newImages.filter((_, i) => i !== newIdx);
//         }
//       }
//     },
//     replaceProductImage: (state, action) => {
//       const { index, isExisting, imageId, file } = action.payload;
//       if (isExisting && imageId) {
//         // Mark existing for deletion and add new file
//         state.formData.imagesToDelete.push({ image_id: imageId });
//         state.formData.imagesToKeep = state.formData.imagesToKeep.filter(
//           (_, i) => i !== index
//         );
//         state.formData.newImages.push(file);
//       } else {
//         // Replace in new images
//         const newIdx = index - (state.formData.imagesToKeep?.length || 0);
//         if (newIdx >= 0) {
//           state.formData.newImages[newIdx] = file;
//         }
//       }
//     },

//     // ── Variant Modal — open blank (add flow) ─────────────────────────────────
//     openVariantModal: (state) => {
//       state.showVariantModal = true;
//       state.editingVariantIndex = null;
//       state.variantForm = {
//         ...EMPTY_VARIANT_FORM,
//         imagesToKeep: [],
//         imagesToDelete: [],
//         newImages: [],
//       };
//       state.variantErrors = {};
//     },

//     openVariantModalForEdit: (state, action) => {
//       const { index } = action.payload;
//       const existing = state.variants[index];
//       state.showVariantModal = true;
//       state.editingVariantIndex = index;
//       state.variantErrors = {};
//       if (existing) {
//         state.variantForm = {
//           variant_id: existing.variant_id || null,
//           variant_code: existing.variant_code || null,
//           system_barcode: existing.system_barcode || null,
//           attributes: existing.attributes?.length > 0
//             ? existing.attributes
//             : [{ key: "", value: "" }],
//           mrp: String(existing.mrp ?? ""),
//           wholesale_price: String(existing.wholesale_price ?? ""),
//           retail_price: String(existing.retail_price ?? ""),
//           online_price: String(existing.online_price ?? ""),
//           purchase_cost: String(existing.purchase_cost ?? ""),
//           weight: String(existing.weight ?? ""),
//           length: String(existing.length ?? ""),
//           width: String(existing.width ?? ""),
//           height: String(existing.height ?? ""),
//           low_stock_threshold: String(existing.low_stock_threshold ?? "10"),
//           remarks: existing.remarks || "",
//           imagesToKeep: existing.imagesToKeep || [],
//           imagesToDelete: existing.imagesToDelete || [],
//           newImages: existing.newImages || [],
//           is_active: existing.is_active !== false,
//         };
//       }
//     },

//     openVariantModalWithData: (state, action) => {
//       const v = action.payload;
//       state.showVariantModal = true;
//       state.editingVariantIndex = 0;
//       state.variantErrors = {};
//       state.variantForm = {
//         variant_id: v.variant_id || null,
//         variant_code: v.variant_code || null,
//         system_barcode: v.system_barcode || null,
//         attributes: v.attributes?.length > 0 ? v.attributes : [{ key: "", value: "" }],
//         mrp: String(v.mrp ?? ""),
//         wholesale_price: String(v.wholesale_price ?? ""),
//         retail_price: String(v.retail_price ?? ""),
//         online_price: String(v.online_price ?? ""),
//         purchase_cost: String(v.purchase_cost ?? ""),
//         weight: String(v.weight ?? ""),
//         length: String(v.length ?? ""),
//         width: String(v.width ?? ""),
//         height: String(v.height ?? ""),
//         low_stock_threshold: String(v.low_stock_threshold ?? "10"),
//         remarks: v.remarks || "",
//         imagesToKeep: v.imagesToKeep || [],
//         imagesToDelete: v.imagesToDelete || [],
//         newImages: v.newImages || [],
//         is_active: v.is_active !== false,
//       };
//     },

//     closeVariantModal: (state) => {
//       state.showVariantModal = false;
//       state.editingVariantIndex = null;
//       state.variantForm = { ...EMPTY_VARIANT_FORM };
//       state.variantErrors = {};
//     },

//     // ── Variant Form Updates ──────────────────────────────────────────────────
//     updateVariantForm: (state, action) => {
//       const payload = action.payload;
//       if (payload && typeof payload === "object") {
//         state.variantForm = { ...state.variantForm, ...payload };
//         const field = Object.keys(payload)[0];
//         if (field && state.variantErrors[field]) {
//           delete state.variantErrors[field];
//         }
//       }
//     },
//     updateVariantAttribute: (state, action) => {
//       const { index, key, value } = action.payload;
//       const attrs = [...(state.variantForm.attributes || [])];
//       attrs[index] = { key, value };
//       state.variantForm.attributes = attrs;
//     },
//     addVariantAttributeRow: (state) => {
//       state.variantForm.attributes = [
//         ...(state.variantForm.attributes || []),
//         { key: "", value: "" },
//       ];
//     },
//     removeVariantAttributeRow: (state, action) => {
//       const idx = action.payload;
//       state.variantForm.attributes = state.variantForm.attributes.filter((_, i) => i !== idx);
//     },
//     setVariantErrors: (state, action) => {
//       state.variantErrors = action.payload;
//     },
//     clearVariantErrors: (state) => {
//       state.variantErrors = {};
//     },

//     // ── Variant Image Management (FIX ISSUE 1 & 2) ────────────────────────────
//     addVariantImages: (state, action) => {
//       const files = action.payload;
//       const currentNew = state.variantForm.newImages || [];
//       const totalExisting = (state.variantForm.imagesToKeep || []).length;
//       const availableSlots = 4 - totalExisting - currentNew.length;
//       const toAdd = files.slice(0, availableSlots);
//       state.variantForm.newImages = [...currentNew, ...toAdd];
//     },
//     removeVariantImage: (state, action) => {
//       const { index, isExisting, imageId } = action.payload;
//       if (isExisting && imageId) {
//         state.variantForm.imagesToDelete.push({ image_id: imageId });
//         state.variantForm.imagesToKeep = state.variantForm.imagesToKeep.filter(
//           (_, i) => i !== index
//         );
//       } else {
//         const newIdx = index - (state.variantForm.imagesToKeep?.length || 0);
//         if (newIdx >= 0) {
//           state.variantForm.newImages = state.variantForm.newImages.filter((_, i) => i !== newIdx);
//         }
//       }
//     },
//     replaceVariantImage: (state, action) => {
//       const { index, isExisting, imageId, file } = action.payload;
//       if (isExisting && imageId) {
//         state.variantForm.imagesToDelete.push({ image_id: imageId });
//         state.variantForm.imagesToKeep = state.variantForm.imagesToKeep.filter(
//           (_, i) => i !== index
//         );
//         state.variantForm.newImages.push(file);
//       } else {
//         const newIdx = index - (state.variantForm.imagesToKeep?.length || 0);
//         if (newIdx >= 0) {
//           state.variantForm.newImages[newIdx] = file;
//         }
//       }
//     },

//     // ── Variants Array ────────────────────────────────────────────────────────
//     saveVariantToList: (state, action) => {
//       const variant = action.payload;
//       if (state.editingVariantIndex !== null) {
//         state.variants[state.editingVariantIndex] = variant;
//       } else {
//         state.variants.push(variant);
//       }
//       state.showVariantModal = false;
//       state.editingVariantIndex = null;
//       state.variantForm = { ...EMPTY_VARIANT_FORM };
//       state.variantErrors = {};
//     },
//     removeVariantFromList: (state, action) => {
//       state.variants = state.variants.filter((_, i) => i !== action.payload);
//     },

//     // ── Update variant in edit mode (batch save) ──────────────────────────────
//     updateVariantInList: (state, action) => {
//       const { index, variant } = action.payload;
//       if (index !== undefined && state.variants[index]) {
//         state.variants[index] = variant;
//       }
//     },

//     // ── Filters & Pagination ──────────────────────────────────────────────────
//     setSearch: (state, action) => {
//       state.search = action.payload;
//       state.currentPage = 1;
//     },
//     setCategoryFilter: (state, action) => {
//       state.categoryFilter = action.payload;
//       state.currentPage = 1;
//     },
//     setActiveFilter: (state, action) => {
//       state.activeFilter = action.payload;
//       state.currentPage = 1;
//     },
//     setCurrentPage: (state, action) => {
//       state.currentPage = action.payload;
//     },
//     setPageSize: (state, action) => {
//       state.pageSize = action.payload;
//       state.currentPage = 1;
//     },
//     resetFilters: (state) => {
//       state.search = "";
//       state.categoryFilter = "";
//       state.activeFilter = "";
//       state.currentPage = 1;
//     },

//     // ── Submitting ────────────────────────────────────────────────────────────
//     setSubmitting: (state, action) => {
//       state.isSubmitting = action.payload;
//     },



//     // ── Bulk Selection Reducers ─────────────────────────────────────
//     setSelectedProductIds: (state, action) => {
//       state.selectedProductIds = action.payload;
//     },
//     clearSelectedProducts: (state) => {
//       state.selectedProductIds = [];
//     },
//     toggleSelectAll: (state, action) => {
//       state.selectedProductIds = action.payload;
//     },


//     // ── Archive Tab Reducers ──────────────────────────────────────────────
//     setShowArchiveTab: (state, action) => {
//       state.showArchiveTab = action.payload;
//       // Clear selections when switching tabs
//       state.selectedProductIds = [];
//       state.archiveSelectedProductIds = [];
//     },
//     setArchiveSelectedProductIds: (state, action) => {
//       state.archiveSelectedProductIds = action.payload;
//     },
//     clearArchiveSelectedProducts: (state) => {
//       state.archiveSelectedProductIds = [];
//     },
//   },
// });

// export const {
//   openAddForm, closeAddForm,
//   openEditForm, closeEditForm,
//   openViewModal, closeViewModal,
//   syncFormDataFromDetail,
//   updateFormData, setFormErrors, clearFormErrors,
//   addProductImages, removeProductImage, replaceProductImage,
//   openVariantModal,
//   openVariantModalForEdit,
//   openVariantModalWithData,
//   closeVariantModal,
//   updateVariantForm,
//   updateVariantAttribute, addVariantAttributeRow, removeVariantAttributeRow,
//   setVariantErrors, clearVariantErrors,
//   addVariantImages, removeVariantImage, replaceVariantImage,
//   saveVariantToList, removeVariantFromList, updateVariantInList,
//   setSearch, setCategoryFilter, setActiveFilter,
//   setCurrentPage, setPageSize, resetFilters,
//   setSubmitting,
//   setSelectedProductIds,
//   clearSelectedProducts,
//   toggleSelectAll,
//   setShowArchiveTab,
//   setArchiveSelectedProductIds,
//   clearArchiveSelectedProducts,
// } = productSlice.actions;

// export default productSlice.reducer;
