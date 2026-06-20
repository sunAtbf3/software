/** Backend enum values — do not change without API migration */
export const CUSTOMER_TYPES = {
  GST: "GST",
  WALK_IN: "WALK_IN",
};

export const isGstCustomerType = (customerType) => customerType === CUSTOMER_TYPES.GST;

export const getCustomerTypeLabel = (customerType) => {
  if (customerType === CUSTOMER_TYPES.GST) return "GST Customer";
  return "Walk-in Customer";
};
