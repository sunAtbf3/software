import React, { Fragment } from "react";
import { getStateName } from "../../constants/indianStateCodes";
import { BILL_TYPES } from "../../constants/billingBillTypes";
import {
  fmtNum,
  fmtMoney,
  fmtDate,
  displayVal,
  truncateProductName,
  resolveLineProductName,
  resolveLineMeta,
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

export default function BillInvoiceDocument({ bill, printFormat: propPrintFormat }) {
  if (!bill) return null;

  const printFormat = propPrintFormat || (typeof window !== "undefined" && localStorage.getItem("vy_bill_print_format")) || "A4";

  const billType = bill.bill_type || BILL_TYPES.WITHOUT_GST;
  const isNonListed = billType === BILL_TYPES.NON_LISTED;
  const isEstimate = billType === BILL_TYPES.ESTIMATE;
  const isNonGst = billType === BILL_TYPES.WITHOUT_GST || isNonListed || isEstimate;
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

  // Bank details visibility logic: only if NOT non-gst, estimate, or non-listed
  const showBankDetails = !isNonGst && !isEstimate && !isNonListed && Boolean(bill.bank_account);

  const custCity = [cust.city, getStateName(cust.state_code), cust.pincode]
    .filter(Boolean)
    .join(", ");

  const custState = (() => {
    const stateCode = cust.state_code || bill.place_of_supply_state_code;
    if (!stateCode) return "";
    const code = String(stateCode).trim().padStart(2, "0").slice(-2);
    return `${getStateName(code)} (${code})`;
  })();

  // Customer display label logic: M/S for GST bills; empty/none for Non-GST/Estimate/Non-listed
  const isGstBill = billType === BILL_TYPES.WITH_GST;
  let customerDisplayName;
  let displayLabel;

  if (isGstBill) {
    displayLabel = "M/S";
    if (cust.company_name && cust.company_name.trim()) {
      customerDisplayName = cust.company_name.trim();
    } else if (bill.customer_name && bill.customer_name.trim()) {
      customerDisplayName = bill.customer_name.trim();
    } else {
      customerDisplayName = "Walk-in Customer";
    }
  } else {
    displayLabel = "";
    if (bill.customer_name && bill.customer_name.trim()) {
      customerDisplayName = bill.customer_name.trim();
    } else if (cust.name && cust.name.trim()) {
      customerDisplayName = cust.name.trim();
    } else {
      customerDisplayName = "Walk-in Customer";
    }
  }

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

  if (printFormat === "80mm") {
    return (
      <div className="bill-invoice-doc thermal">
        {/* Header Section (Centered) */}
        {isEstimate || isNonListed ? (
          <>
            <div className="bi-shop-name-receipt">Receipt</div>
            {bill.staff_code_value && (
              <div style={{ textAlign: "center", fontSize: "7.5pt", marginTop: "2px" }}>
                Billed By: {bill.staff_code_value}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bi-shop-name">{shop.shop_name || "Shop"}</div>
            {(shop.shop_code || legalName) && (
              <div className="bi-center-line">
                {[
                  shop.shop_code ? `Shop ID: ${shop.shop_code}` : null,
                  legalName ? `Shop Name: ${legalName}` : null,
                ].filter(Boolean).join(" | ")}
              </div>
            )}
            {shop.address && (
              <div className="bi-center-line">{shop.address}</div>
            )}
            {(shop.city || shop.pincode) && (
              <div className="bi-center-line">
                {[shop.city, shop.pincode].filter(Boolean).join(" - ")}
              </div>
            )}
            {shop.phone && (
              <div className="bi-center-line">Ph: {shop.phone}</div>
            )}
            {gst && (
              <div className="bi-center-line" style={{ fontWeight: "bold" }}>GSTIN: {gst}</div>
            )}
          </>
        )}

        <div className="bi-divider" />
        {!isEstimate && !isNonListed && (
          <>
            <div className="bi-title">
              {!isNonGst ? "GST INVOICE" : "INVOICE"}
            </div>
            {bill.staff_code_value && (
              <div style={{ textAlign: "center", fontSize: "7.5pt", marginBottom: "2px" }}>
                Billed By: {bill.staff_code_value}
              </div>
            )}
            <div className="bi-divider" />
          </>
        )}

        {/* Invoice details */}
        <div className="bi-flex-row">
          <span>Invoice No :</span>
          <span>{bill.bill_number}</span>
        </div>
        <div className="bi-flex-row">
          <span>Date :</span>
          <span>{fmtDate(bill.created_at)}</span>
        </div>
        <div className="bi-flex-row">
          <span>Payment :</span>
          <span>{bill.payment_method || "CASH"}</span>
        </div>

        <div className="bi-divider" />

        {/* Bill To */}
        <div className="bi-bill-to">
          <div className="bi-label">Bill To:</div>
          <div>{displayLabel ? `${displayLabel}: ${customerDisplayName}` : customerDisplayName}</div>
          {bill.customer_mobile && <div>Mob: {bill.customer_mobile}</div>}
          {!isNonGst && bill.customer_gstin && <div>GSTIN: {bill.customer_gstin}</div>}
        </div>

        <div className="bi-divider" />

        {/* Items Table */}
        <table className="bi-table-thermal">
          <thead>
            <tr>
              <th style={{ textAlign: "left", width: "42%" }}>Item</th>
              <th style={{ textAlign: "center", width: "13%" }}>Qty</th>
              <th style={{ textAlign: "right", width: "25%" }}>Spl.Price</th>
              <th style={{ textAlign: "right", width: "20%" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const name = truncateProductName(resolveLineProductName(item));
              const metaLines = resolveLineMeta(item, { isNonListed });
              return (
                <Fragment key={idx}>
                  <tr style={{ fontWeight: "bold" }}>
                    <td colSpan={4} style={{ paddingTop: "4px" }}>{name}</td>
                  </tr>
                  {metaLines.length > 0 && (
                    <tr>
                      <td colSpan={4} className="bi-item-meta">
                        {metaLines.join(" | ")}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: "1px dashed #eee" }}>
                    <td style={{ textAlign: "left" }}>MRP: ₹{fmtNum(lineMrp(item))}</td>
                    <td style={{ textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>₹{fmtNum(item.unit_price)}</td>
                    <td style={{ textAlign: "right" }}>₹{fmtNum(lineSpecialTotal(item))}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>

        <div className="bi-divider" />

        {/* Totals */}
        <div>
          <div className="bi-flex-row">
            <span>Subtotal</span>
            <span>₹{fmtNum(bill.subtotal)}</span>
          </div>
          {mrpDiscount > 0 && (
            <div className="bi-flex-row">
              <span>MRP Discount</span>
              <span>- ₹{fmtNum(mrpDiscount)}</span>
            </div>
          )}
          {!isNonGst && (
            <>
              <div className="bi-flex-row">
                <span>Taxable Amt</span>
                <span>₹{fmtNum(bill.taxable_amount)}</span>
              </div>
              {gstSplit.tax_mode === "CGST_SGST" && gstSplit.cgst > 0 && (
                <div className="bi-flex-row">
                  <span>CGST ({taxRates.cgstPercent}%)</span>
                  <span>+ ₹{fmtNum(gstSplit.cgst)}</span>
                </div>
              )}
              {gstSplit.tax_mode === "CGST_SGST" && gstSplit.sgst > 0 && (
                <div className="bi-flex-row">
                  <span>SGST ({taxRates.sgstPercent}%)</span>
                  <span>+ ₹{fmtNum(gstSplit.sgst)}</span>
                </div>
              )}
              {gstSplit.igst > 0 && (
                <div className="bi-flex-row">
                  <span>IGST ({taxRates.igstPercent}%)</span>
                  <span>+ ₹{fmtNum(gstSplit.igst)}</span>
                </div>
              )}
              {bill.gst_amount > 0 && (
                <div className="bi-flex-row">
                  <span>Total Tax</span>
                  <span>₹{fmtNum(bill.gst_amount)}</span>
                </div>
              )}
            </>
          )}
          {Number(bill.discount) > 0 && (
            <div className="bi-flex-row">
              <span>Extra Discount</span>
              <span>- ₹{fmtNum(bill.discount)}</span>
            </div>
          )}

          <div className="bi-divider" />
          <div className="bi-flex-row" style={{ fontSize: "9pt", fontWeight: "bold" }}>
            <span>TOTAL PAYABLE</span>
            <span>{fmtMoney(bill.total_amount)}</span>
          </div>
        </div>

        <div className="bi-divider" />

        {/* Amount in words */}
        <div style={{ textAlign: "center", fontStyle: "italic" }}>
          {amountInWords(bill.total_amount)}
        </div>

        <div className="bi-divider" />

        <div style={{ textAlign: "center", fontStyle: "italic", marginTop: "4px" }}>
          Thank you for shopping with us!
        </div>
      </div>
    );
  }

  return (
    <div className="bill-invoice-doc">
      {/* Top GSTIN and original note row for GST invoices only */}
      {!isNonGst && (
        <div className="bi-top-row">
          <LabelValue label="GSTIN" value={gst} />
          <div className="bi-copy-note">Original / Duplicate / Triplicate</div>
        </div>
      )}

      {/* Center header / title logic */}
      {!isNonGst && <div className="bi-title">GST INVOICE</div>}
      {bill.staff_code_value && (
        <div className="bi-center-line" style={{ fontSize: "8pt" }}>
          Billed By: {bill.staff_code_value}
        </div>
      )}

      {isEstimate || isNonListed ? (
        // Estimate and Non-listed bills show centered title "Receipt" and hide shop details entirely
        <div className="bi-shop-name-receipt">Receipt</div>
      ) : (
        // GST and Non-GST bills show shop details
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

      {/* Bill To & Invoice Info */}
      <div className="bi-info-box">
        <div className="bi-info-col">
          <div className="bi-label bi-underline">Bill To :</div>
          {displayLabel ? (
            <LabelValue label={displayLabel} value={customerDisplayName} />
          ) : (
            <div className="bi-field">{customerDisplayName}</div>
          )}
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

      {/* Product table with strict column width percentages to match backend PDFKit */}
      <table className="bi-table">
        <thead>
          <tr>
            {(isNonGst
              ? [
                { label: "S.No.", width: "5.35%" },
                { label: "Product Name", width: "41.3%" },
                { label: "Qty", width: "6.12%" },
                { label: "MRP", width: "13%" },
                { label: "Special Price", width: "14.5%" },
                { label: "Total", width: "19.73%" }
              ]
              : [
                { label: "S.No.", width: "5.35%" },
                { label: "Product Name", width: "32.12%" },
                { label: "HSN Code", width: "9.17%" },
                { label: "Qty", width: "6.12%" },
                { label: "MRP", width: "13%" },
                { label: "Special Price", width: "14.5%" },
                { label: "Total", width: "19.74%" }
              ]
            ).map((col) => (
              <th key={col.label} style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const name = truncateProductName(resolveLineProductName(item));
            const metaLines = resolveLineMeta(item, { isNonListed });
            const productNameCell = (
              <div className="bi-product-cell">
                <div>{name}</div>
                {metaLines.map((line) => (
                  <div key={line} className="bi-item-meta">{line}</div>
                ))}
              </div>
            );
            const cells = isNonGst
              ? [
                idx + 1,
                productNameCell,
                item.quantity,
                fmtNum(lineMrp(item)),
                fmtNum(item.unit_price),
                fmtNum(lineSpecialTotal(item)),
              ]
              : [
                idx + 1,
                productNameCell,
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

      {/* Totals & Optional Bank Details */}
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
          {mrpDiscount > 0 && (
            <div className="bi-total-row">
              <span className="bi-label">MRP Discount</span>
              <span>- {fmtNum(mrpDiscount)}</span>
            </div>
          )}
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
          {Number(bill.discount) > 0 && (
            <div className="bi-total-row">
              <span className="bi-label">Extra Discount</span>
              <span>- {fmtNum(bill.discount)}</span>
            </div>
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

      {/* Footer blocks: declaration, terms, note, signatures are hidden for Estimate and Non-Listed bills */}
      {!isEstimate && !isNonListed && (
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
