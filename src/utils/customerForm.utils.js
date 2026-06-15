/** Client-side validation for customer create / edit forms. */
export const validateCustomerForm = (form, { requireMobile = true } = {}) => {
    const errors = {};

    if (requireMobile) {
        if (!form.mobile?.trim()) errors.mobile = "Mobile number is required";
        else if (String(form.mobile).trim().length !== 10) errors.mobile = "Mobile number must be 10 digits";
    }

    if (!form.name?.trim()) errors.name = "Customer name is required";
    if (!form.address?.trim()) errors.address = "Address is required";
    if (!form.city?.trim()) errors.city = "City is required";
    if (!form.state_code?.trim()) errors.state_code = "State is required";
    const pin = String(form.pincode || "").trim();
    if (!pin) errors.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(pin)) errors.pincode = "Pincode must be 6 digits";

    const gst = String(form.gst_number || "").trim();
    if (gst && gst.length !== 15) {
        errors.gst_number = "GST number must be 15 characters when provided";
    }

    return errors;
};

/** Trim required fields; drop empty optional fields before API submit. */
export const buildCustomerSubmitPayload = (form, { isUpdate = false } = {}) => {
    const payload = {
        mobile: form.mobile?.trim(),
        name: form.name?.trim(),
        address: form.address?.trim(),
        city: form.city?.trim(),
        state_code: form.state_code?.trim(),
        pincode: String(form.pincode || "").trim(),
    };

    const email = form.email?.trim();
    if (email) payload.email = email;

    const gst = form.gst_number?.trim();
    if (gst) {
        payload.gst_number = gst;
    } else if (isUpdate) {
        payload.gst_number = null;
    }

    const remarks = form.remarks?.trim();
    if (remarks) payload.remarks = remarks;

    if (form.credit_limit != null && form.credit_limit !== "") {
        payload.credit_limit = form.credit_limit;
    }

    return payload;
};

export const hasCustomerFormErrors = (errors) => Object.keys(errors).length > 0;
