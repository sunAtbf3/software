/** Backend enum values — do not change without API migration */
export const BILL_TYPES = {
  WITH_GST: "GST_INVOICE",
  WITHOUT_GST: "NON_GST_INVOICE",
  ESTIMATE: "ESTIMATE_INVOICE",
  NON_LISTED: "NON_LISTED_BILL",
};

export const getBillTypeLabel = (billType) => {
  if (billType === BILL_TYPES.WITH_GST) return "GST Tax Invoice";
  if (billType === BILL_TYPES.ESTIMATE) return "Estimate";
  if (billType === BILL_TYPES.NON_LISTED) return "Non-Listed Bill";
  return "Non-GST Bill";
};

export const isWithGstBill = (billType) => billType === BILL_TYPES.WITH_GST;

export const isEstimateBill = (billType) => billType === BILL_TYPES.ESTIMATE;

export const isNonListedBill = (billType) => billType === BILL_TYPES.NON_LISTED;
