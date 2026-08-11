import { shopConfigRepository, customerRepository, shopStockRepository } from "../db/repositories/dataRepository";
import { maskAccountNumber } from "../../utils/shopBank";
import { BILL_TYPES } from "../../constants/billingBillTypes";
import { buildUpiQrForBill } from "../../utils/upiQr";

const pickDefault = (rows) =>
  rows?.find((row) => row.is_default) || rows?.[0] || null;

const resolveGstConfig = (bundle, bill) => {
  if (bill.gst_config) return bill.gst_config;
  const configs = bundle?.gst_configs || [];
  if (bill.gst_config_id) {
    return configs.find((c) => c.gst_config_id === bill.gst_config_id) || pickDefault(configs);
  }
  return pickDefault(configs);
};

const resolveBankAccount = (bundle, bill, gstConfig) => {
  if (bill.bank_account) return bill.bank_account;
  const accounts = bundle?.bank_accounts || [];
  if (bill.bank_account_id) {
    const match = accounts.find((a) => a.bank_account_id === bill.bank_account_id);
    if (match) return formatBankForDocument(match);
  }
  if (bill.bill_type !== BILL_TYPES.WITH_GST) return null;

  const linked = gstConfig
    ? accounts.filter((a) => a.gst_config_id === gstConfig.gst_config_id)
    : accounts;
  const picked = pickDefault(linked.length ? linked : accounts);
  return picked ? formatBankForDocument(picked) : null;
};

const formatBankForDocument = (row) => ({
  bank_account_id: row.bank_account_id,
  account_holder_name: row.account_holder_name,
  bank_name: row.bank_name,
  branch_name: row.branch_name,
  account_number: row.account_number || null,
  account_number_masked: row.account_number_masked || maskAccountNumber(row.account_number),
  ifsc_code: row.ifsc_code,
  upi_id: row.upi_id,
});

const enrichItemFromStock = async (item) => {
  const stock = item.variant_id ? await shopStockRepository.getByVariantId(item.variant_id) : null;
  const mrp = item.mrp_unit_price ?? item.mrp ?? stock?.mrp ?? item.unit_price;
  const hsn = item.hsn_code ?? stock?.hsn_code ?? item.variant?.product?.hsn_code ?? "";
  const gstPercent = item.gst_percent ?? stock?.gst_percent ?? 0;
  const gstType = item.gst_type ?? stock?.gst_type ?? "CGST_SGST";
  const brandName =
    item.variant?.product?.brand_name ||
    item.product?.brand_name ||
    item.brand_name ||
    stock?.brand_name ||
    "";
  const warranty =
    item.variant?.warranty ||
    item.product?.warranty ||
    item.warranty ||
    stock?.warranty ||
    "";
  const variantAttributes =
    item.variant?.attributes ??
    item.variant_attributes ??
    stock?.variant?.attributes ??
    null;
  const name =
    item.variant?.product?.name ||
    item.product?.name ||
    item.manual_item_name ||
    item.item_name ||
    item.product_name ||
    stock?.product_name ||
    item.variant?.sku ||
    "Item";

  return {
    ...item,
    mrp_unit_price: mrp,
    special_unit_price:
      item.special_unit_price ??
      item.special_price ??
      stock?.special_price ??
      item.variant?.special_price ??
      null,
    combo_applied: item.combo_applied === true,
    combo_unit_price: item.combo_applied === true ? (item.combo_unit_price ?? item.unit_price) : null,
    hsn_code: hsn,
    gst_percent: gstPercent,
    gst_type: gstType,
    tax_amount: item.tax_amount ?? item.gst_amount ?? 0,
    variant: {
      ...(item.variant || {}),
      sku: item.variant?.sku || stock?.system_barcode || stock?.sku,
      mrp,
      special_price:
        item.variant?.special_price ??
        item.special_unit_price ??
        stock?.special_price ??
        null,
      warranty,
      attributes: variantAttributes,
      product: {
        ...(item.variant?.product || {}),
        name,
        brand_name: brandName,
        hsn_code: hsn,
      },
    },
  };
};

const resolveCustomer = async (bill) => {
  if (bill.customer && (bill.customer.address || bill.customer.state_code)) {
    return bill.customer;
  }

  if (bill.customer_id) {
    const stored = await customerRepository.getById(bill.customer_id);
    if (stored) {
      return {
        customer_id: stored.customer_id,
        name: stored.name,
        mobile: stored.mobile,
        gstin: stored.gstin,
        address: stored.address,
        city: stored.city,
        state_code: stored.state_code,
        pincode: stored.pincode,
      };
    }
  }

  return {
    name: bill.customer_name,
    mobile: bill.customer_mobile,
    gstin: bill.customer_gstin,
    address: bill.customer?.address,
    city: bill.customer?.city,
    state_code: bill.place_of_supply_state_code || bill.customer?.state_code,
    pincode: bill.customer?.pincode,
  };
};

/**
 * Normalize a local or API bill into the shape expected by BillInvoiceDocument / server PDF.
 */
export const prepareBillForDocument = async (bill) => {
  if (!bill) throw new Error("Bill is required");

  const bundle = await shopConfigRepository.getConfigBundle();
  const shop = bill.shop || bundle?.shop || {};
  const gstConfig = resolveGstConfig(bundle, bill);
  const bankAccount = resolveBankAccount(bundle, bill, gstConfig);
  const customer = await resolveCustomer(bill);

  const items = await Promise.all((bill.items || []).map(enrichItemFromStock));

  const taxableAmount =
    bill.taxable_amount != null ? bill.taxable_amount : bill.subtotal ?? 0;

  const prepared = {
    ...bill,
    bill_number: bill.server_bill_number || bill.bill_number,
    shop,
    gst_config: gstConfig,
    bank_account: bankAccount,
    customer,
    customer_name: bill.customer_name || customer?.name || "Walk-in Customer",
    customer_mobile: bill.customer_mobile || customer?.mobile || null,
    customer_gstin: bill.customer_gstin || customer?.gstin || null,
    place_of_supply_state_code:
      bill.place_of_supply_state_code || customer?.state_code || null,
    items,
    subtotal: bill.subtotal ?? 0,
    taxable_amount: taxableAmount,
    gst_amount: bill.gst_amount ?? 0,
    total_amount: bill.total_amount ?? bill.total ?? 0,
    discount: bill.discount ?? 0,
    created_at: bill.created_at || new Date().toISOString(),
  };

  const upi_payment = await buildUpiQrForBill(prepared, bankAccount, { width: 140 });
  if (upi_payment) {
    prepared.upi_payment = upi_payment;
  }

  return prepared;
};
