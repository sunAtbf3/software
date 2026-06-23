import React from "react";
import { getStateName } from "../../constants/indianStateCodes";
import { BILL_TYPES } from "../../constants/billingBillTypes";
import {
  fmtNum,
  fmtMoney,
  fmtDate,
  displayVal,
  lineMrp,
  lineSpecialTotal,
  calcMrpDiscount,
  buildTaxSummaryFromLines,
  getTaxRatePercents,
  formatCityStateLabel,
  amountInWords,
} from "../../utils/billDocumentUtils";
import { maskAccountNumber } from "../../utils/shopBank";
import "./billInvoice.styles.css";

const shopGstin = (bill) => bill.gst_config?.gst_number?.trim() || "";

const LabelValue = ({ label, value, className = "" }) => (
  <div className={`bi-field ${className}`}>
    <span className="bi-label">{label} : </span>
    <span>{displayVal(value)}</span>
  </div>
);

export default function BillInvoiceDocument({ bill }) {
  if (!bill) return null;

  const billType = bill.bill_type || BILL_TYPES.WITHOUT_GST;
  const isNonListed = billType === BILL_TYPES.NON_LISTED;
  const isNonGst = billType === BILL_TYPES.WITHOUT_GST || isNonListed;
  const isEstimate = billType === BILL_TYPES.ESTIMATE;
  const shop = bill.shop || {};
  const items = bill.items || [];
  const gst = shopGstin(bill);
  const legalName = bill.gst_config?.legal_name?.trim() || shop.shop_name || "";
  const mrpDiscount = calcMrpDiscount(items);
  const gstSplit = buildTaxSummaryFromLines(items);
  const taxRates = getTaxRatePercents(items, gstSplit.tax_mode);
  const cust = bill.customer || {};
  const showStateCode = !isNonGst && !isNonListed;
  const posName = displayVal(
    formatCityStateLabel(cust.city, cust.state_code || bill.place_of_supply_state_code, {
      withCode: showStateCode,
    })
  );
  const dispatchName = displayVal(
    formatCityStateLabel(shop.city, shop.state_code, { withCode: showStateCode })
  );
  const showBankDetails = !isNonGst && !isEstimate && Boolean(bill.bank_account);

  const custCity = [cust.city, getStateName(cust.state_code), cust.pincode]
    .filter(Boolean)
    .join(", ");

  const custState = (() => {
    const stateCode = cust.state_code || bill.place_of_supply_state_code;
    if (!stateCode) return "";
    const code = String(stateCode).trim().padStart(2, "0").slice(-2);
    return `${getStateName(code)} (${code})`;
  })();

  const bank = bill.bank_account;
  const bankRows = bank
    ? [
        ["Account Holder Name", displayVal(bank.account_holder_name)],
        ["Bank Name", displayVal(bank.bank_name)],
        [
          "Account No.",
          bank.account_number
            ? maskAccountNumber(bank.account_number)
            : bank.account_number_masked || "",
        ],
        ["IFSC Code", displayVal(bank.ifsc_code)],
        ["Branch", displayVal(bank.branch_name)],
        ...(bank.upi_id ? [["UPI ID", displayVal(bank.upi_id)]] : []),
      ]
    : [];

  return (
    <div className="bill-invoice-doc">
      {!isNonGst && (
        <div className="bi-top-row">
          <LabelValue label="GSTIN" value={gst} />
          <div className="bi-copy-note">Original / Duplicate / Triplicate</div>
        </div>
      )}

      {!isNonGst && <div className="bi-title">GST INVOICE</div>}
      {isNonListed && <div className="bi-title">NON-LISTED BILL</div>}

      {isEstimate ? (
        <div className="bi-shop-name">Receipt</div>
      ) : (
        <>
          <div className="bi-shop-name">{shop.shop_name || "Shop"}</div>
          <div className="bi-center-line">
            <span className="bi-label">Shop ID : </span>
            {displayVal(shop.shop_code)}
            <span className="bi-label"> | Shop Name : </span>
            {displayVal(legalName)}
          </div>
          {[shop.address, shop.city, shop.pincode].filter(Boolean).length > 0 && (
            <div className="bi-center-line">
              {[shop.address, shop.city, shop.pincode].filter(Boolean).join(", ")}
            </div>
          )}
          <div className="bi-center-line">
            <span className="bi-label">Phone : </span>
            {displayVal(shop.phone)}
            <span className="bi-label"> | Email : </span>
            {displayVal(shop.email)}
          </div>
        </>
      )}

      <div className="bi-divider" />

      <div className="bi-info-box">
        <div className="bi-info-col">
          <div className="bi-label bi-underline">Bill To :</div>
          <LabelValue label="M/S" value={bill.customer_name || "Walk-in Customer"} />
          {cust.address && <div className="bi-field">{cust.address}</div>}
          {custCity && <div className="bi-field">{custCity}</div>}
          <LabelValue label="Mobile" value={bill.customer_mobile} />
          {!isNonGst && (
            <>
              <LabelValue label="GSTIN" value={bill.customer_gstin} />
              <LabelValue label="State" value={custState} />
            </>
          )}
        </div>
        <div className="bi-info-col">
          <LabelValue label="Invoice No" value={bill.bill_number} />
          <LabelValue label="Date" value={fmtDate(bill.created_at)} />
          <LabelValue label="E-Way Bill No" value="" />
          <LabelValue label="Place of Supply" value={posName} />
          <LabelValue label="Place of Dispatch" value={dispatchName} />
          <LabelValue label="Transport" value="" />
          <div className="bi-pay-box">
            <span className="bi-label">Mode of Payment : </span>
            {displayVal(bill.payment_method)}
          </div>
        </div>
      </div>

      <table className="bi-table">
        <thead>
          <tr>
            {(isNonGst
              ? ["S.No.", "Product Name", "Qty", "MRP", "Special Price", "Total"]
              : ["S.No.", "Product Name", "HSN Code", "Qty", "MRP", "Special Price", "Total"]
            ).map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const name =
              item.variant?.product?.name ||
              item.product?.name ||
              item.manual_item_name ||
              item.item_name ||
              item.product_name ||
              item.variant?.sku ||
              "Item";
            const cells = isNonGst
              ? [
                  idx + 1,
                  name,
                  item.quantity,
                  fmtNum(lineMrp(item)),
                  fmtNum(item.unit_price),
                  fmtNum(lineSpecialTotal(item)),
                ]
              : [
                  idx + 1,
                  name,
                  displayVal(item.hsn_code),
                  item.quantity,
                  fmtNum(lineMrp(item)),
                  fmtNum(item.unit_price),
                  fmtNum(lineSpecialTotal(item)),
                ];
            return (
              <tr key={item.variant_id || idx}>
                {cells.map((cell, cellIdx) => (
                  <td key={cellIdx}>{cell}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={`bi-fin-box${showBankDetails ? "" : " single-col"}`}>
        {showBankDetails && (
          <div className="bi-fin-col">
            <div className="bi-label bi-underline">Bank Details</div>
            {bankRows.map(([label, value]) => (
              <LabelValue key={label} label={label} value={value} />
            ))}
            {bill.upi_payment?.qr_data_url && (
              <div className="bi-upi-qr">
                <div className="bi-label">Scan to Pay (UPI)</div>
                <img
                  src={bill.upi_payment.qr_data_url}
                  alt={`UPI QR ₹${bill.upi_payment.amount}`}
                  className="bi-upi-qr-img"
                />
                <div className="bi-upi-qr-amt">{fmtMoney(bill.upi_payment.amount)}</div>
                <div className="bi-upi-qr-id">{displayVal(bill.upi_payment.upi_id)}</div>
              </div>
            )}
          </div>
        )}
        <div className="bi-fin-col">
          <div className="bi-total-row">
            <span className="bi-label">Sub Total</span>
            <span>{fmtNum(bill.subtotal)}</span>
          </div>
          <div className="bi-total-row">
            <span className="bi-label">Discount</span>
            <span>- {fmtNum(mrpDiscount)}</span>
          </div>
          {!isNonGst && (
            <>
              <div className="bi-total-row">
                <span className="bi-label">Total Amount</span>
                <span>{fmtNum(bill.taxable_amount)}</span>
              </div>
              {gstSplit.tax_mode === "CGST_SGST" && gstSplit.cgst > 0 && (
                <div className="bi-total-row">
                  <span>
                    <span className="bi-add-label">Add</span>
                    {` : CGST (${taxRates.cgstPercent}%)`}
                  </span>
                  <span>+ {fmtNum(gstSplit.cgst)}</span>
                </div>
              )}
              {gstSplit.tax_mode === "CGST_SGST" && gstSplit.sgst > 0 && (
                <div className="bi-total-row">
                  <span>
                    <span className="bi-add-label">Add</span>
                    {` : SGST (${taxRates.sgstPercent}%)`}
                  </span>
                  <span>+ {fmtNum(gstSplit.sgst)}</span>
                </div>
              )}
              {gstSplit.igst > 0 && (
                <div className="bi-total-row">
                  <span>
                    <span className="bi-add-label">Add</span>
                    {` : IGST (${taxRates.igstPercent}%)`}
                  </span>
                  <span>+ {fmtNum(gstSplit.igst)}</span>
                </div>
              )}
              {bill.gst_amount > 0 && (
                <div className="bi-total-row">
                  <span className="bi-label">{`Total Tax Amount (${taxRates.totalPercent}%)`}</span>
                  <span>{fmtNum(bill.gst_amount)}</span>
                </div>
              )}
            </>
          )}
          <div className="bi-total-row bi-grand">
            <span>Total Payable Amount</span>
            <span>{fmtMoney(bill.total_amount)}</span>
          </div>
        </div>
      </div>

      <div className="bi-words-box">
        <div className="bi-label">Total Amount (in words) :</div>
        <div>{amountInWords(bill.total_amount)}</div>
      </div>

      {!isEstimate && (
        <>
          <div className="bi-decl-box">
            <div className="bi-label">Declaration :</div>
            <div style={{ fontSize: "7pt" }}>
              We declare that this invoice shows the actual price of the goods described and that all
              particulars are true and correct.
            </div>
          </div>

          <div className="bi-foot-box">
            <div>
              {isNonGst ? (
                <>
                  <div className="bi-label">Note:</div>
                  <div style={{ fontSize: "7pt" }}>
                    1. Keep the bill for warranty or guarantee purpose.
                  </div>
                </>
              ) : (
                <>
                  <div className="bi-label">Terms &amp; Conditions :</div>
                  <div style={{ fontSize: "7pt" }}>
                    <div>1. E. &amp; O.E.</div>
                    <div>2. Subject to local jurisdiction only.</div>
                    <div>3. Keep the bill for warranty or guarantee purpose.</div>
                  </div>
                </>
              )}
            </div>
            <div className="bi-foot-right">
              <div className="bi-label">{`For ${shop.shop_name || "Shop"}`}</div>
              <div className="bi-stamp">Shop Seal / Stamp</div>
              <div className="bi-sign-line">Authorised Signatory</div>
            </div>
          </div>
        </>
      )}

      <div className="bi-footer-note">This is a computer generated invoice.</div>
    </div>
  );
}
