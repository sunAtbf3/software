/** Backend TransferBillType enum values */
export const TRANSFER_BILL_TYPES = {
  GST: "GST_INVOICE",
  NON_GST: "NON_GST_INVOICE",
  RECEIPT: "ESTIMATE_INVOICE",
};

export const getTransferBillTypeLabel = (billType) => {
  if (billType === TRANSFER_BILL_TYPES.GST) return "GST Invoice";
  if (billType === TRANSFER_BILL_TYPES.RECEIPT) return "Receipt";
  return "Non-GST Invoice";
};

export const getTransferBillTypeShortLabel = (billType) => {
  if (billType === TRANSFER_BILL_TYPES.GST) return "GST";
  if (billType === TRANSFER_BILL_TYPES.RECEIPT) return "Receipt";
  return "Non-GST";
};
