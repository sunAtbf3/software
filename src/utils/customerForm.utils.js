import { CUSTOMER_TYPES, isGstCustomerType } from "../constants/customerTypes";

/** Normalize API search payload to a customer list. */
export const normalizeCustomerSearchResults = (searchResults) => {
  if (!searchResults) return [];
  if (Array.isArray(searchResults)) return searchResults;
  if (searchResults.customer) return [searchResults.customer];
  if (Array.isArray(searchResults.customers)) return searchResults.customers;
  return [];
};

/** Find first customer from search response (billing mobile lookup). */
export const getCustomerFromSearch = (searchResults) => {
  if (!searchResults) return null;
  if (searchResults.customer !== undefined) return searchResults.customer;
  if (Array.isArray(searchResults)) return searchResults[0] || null;
  if (Array.isArray(searchResults.customers)) return searchResults.customers[0] || null;
  return null;
};

/** Client-side validation for customer create / edit / upgrade forms. */
export const validateCustomerForm = (form, { requireMobile = true, mode = "create" } = {}) => {
  const errors = {};
  const customerType = form.customer_type || CUSTOMER_TYPES.WALK_IN;
  const isGst = isGstCustomerType(customerType) || mode === "upgrade";

  if (requireMobile) {
    if (!form.mobile?.trim()) errors.mobile = "Mobile number is required";
    else if (String(form.mobile).trim().length !== 10) errors.mobile = "Mobile number must be 10 digits";
  }

  if (!form.name?.trim()) errors.name = "Customer name is required";

  if (isGst) {
    if (!form.company_name?.trim()) errors.company_name = "Company name is required";
    const gst = String(form.gst_number || "").trim();
    if (!gst) errors.gst_number = "GST number is required";
    else if (gst.length !== 15) errors.gst_number = "GST number must be 15 characters";
    if (!form.address?.trim()) errors.address = "Address is required";
    if (!form.city?.trim()) errors.city = "City is required";
    if (!form.state_code?.trim()) errors.state_code = "State is required";
    const pin = String(form.pincode || "").trim();
    if (!pin) errors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(pin)) errors.pincode = "Pincode must be 6 digits";
  }

  const email = String(form.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Invalid email address";
  }

  return errors;
};

/** Trim fields before API submit. */
export const buildCustomerSubmitPayload = (form, { isUpdate = false } = {}) => {
  const customerType = form.customer_type || CUSTOMER_TYPES.WALK_IN;
  const payload = {
    name: form.name?.trim(),
    customer_type: customerType,
  };

  if (!isUpdate) {
    payload.mobile = form.mobile?.trim();
  } else if (form.mobile?.trim()) {
    payload.mobile = form.mobile.trim();
  }

  const email = form.email?.trim();
  if (email) payload.email = email;

  if (isGstCustomerType(customerType)) {
    payload.company_name = form.company_name?.trim();
    payload.gst_number = form.gst_number?.trim().toUpperCase();
    payload.address = form.address?.trim();
    payload.city = form.city?.trim();
    payload.state_code = form.state_code?.trim();
    payload.pincode = String(form.pincode || "").trim();
  }

  const remarks = form.remarks?.trim();
  if (remarks) payload.remarks = remarks;

  if (form.credit_limit != null && form.credit_limit !== "") {
    payload.credit_limit = form.credit_limit;
  }

  return payload;
};

export const buildUpgradeGstPayload = (form) => ({
  company_name: form.company_name?.trim(),
  gst_number: form.gst_number?.trim().toUpperCase(),
  address: form.address?.trim(),
  city: form.city?.trim(),
  state_code: form.state_code?.trim(),
  pincode: String(form.pincode || "").trim(),
});

export const hasCustomerFormErrors = (errors) => Object.keys(errors).length > 0;
