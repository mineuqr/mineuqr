/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Canonical Phase 1 electronic document representation (structured + renderable).
 * Consumes immutable Tax Invoice snapshots — not live Customer/Product/Profile.
 */

import type {
  SaudiTaxInvoice,
  SaudiTaxInvoiceBuyerSnapshot,
  SaudiTaxInvoiceForm,
  SaudiTaxInvoiceLinesSnapshot,
  SaudiTaxInvoiceMonetarySnapshot,
  SaudiTaxInvoicePaymentSnapshot,
  SaudiTaxInvoiceSellerSnapshot,
} from "./saudiTaxInvoiceContract";

export const SAUDI_TAX_INVOICE_PHASE1_PROGRAM_ID =
  "SAUDI-TAX-INVOICE-PHASE-1" as const;

export type SaudiPhase1InvoiceTitles = Readonly<{
  ar: string;
  en: string;
}>;

export function saudiPhase1InvoiceTitles(
  form: SaudiTaxInvoiceForm
): SaudiPhase1InvoiceTitles {
  if (form === "standard_tax_invoice") {
    return { ar: "فاتورة ضريبية", en: "Tax Invoice" };
  }
  return { ar: "فاتورة ضريبية مبسطة", en: "Simplified Tax Invoice" };
}

export type SaudiPhase1Document = Readonly<{
  schemaVersion: 1;
  programId: typeof SAUDI_TAX_INVOICE_PHASE1_PROGRAM_ID;
  taxInvoiceId: string;
  invoiceNumber: string;
  invoiceForm: SaudiTaxInvoiceForm;
  titles: SaudiPhase1InvoiceTitles;
  issueTimestampIso: string;
  timezone: "Asia/Riyadh";
  qrRequired: boolean;
  qrPayloadBase64: string | null;
  seller: SaudiTaxInvoiceSellerSnapshot;
  buyer: SaudiTaxInvoiceBuyerSnapshot;
  lines: SaudiTaxInvoiceLinesSnapshot;
  monetary: SaudiTaxInvoiceMonetarySnapshot;
  payment: SaudiTaxInvoicePaymentSnapshot;
  /** Tax amounts are Collection Fact copies — not a Saudi VAT engine (OQ-VAT-1). */
  taxSource: "collection_fact_monetary_snapshot";
  buyerVatNumberDisplayed: string | null;
}>;

export function isSimplifiedTaxInvoiceForm(
  form: SaudiTaxInvoiceForm
): boolean {
  return form === "simplified_tax_invoice";
}

export function buildSaudiPhase1Document(input: {
  taxInvoice: SaudiTaxInvoice;
  invoiceNumber: string;
  issueTimestampIso: string;
  qrPayloadBase64: string | null;
}): SaudiPhase1Document {
  const { taxInvoice } = input;
  const qrRequired = isSimplifiedTaxInvoiceForm(taxInvoice.invoiceForm);
  const buyerVatNumberDisplayed =
    taxInvoice.invoiceForm === "standard_tax_invoice" &&
    taxInvoice.buyerSnapshot.kind === "customer" &&
    taxInvoice.buyerSnapshot.taxNumber
      ? taxInvoice.buyerSnapshot.taxNumber
      : null;

  return {
    schemaVersion: 1,
    programId: SAUDI_TAX_INVOICE_PHASE1_PROGRAM_ID,
    taxInvoiceId: taxInvoice.taxInvoiceId,
    invoiceNumber: input.invoiceNumber,
    invoiceForm: taxInvoice.invoiceForm,
    titles: saudiPhase1InvoiceTitles(taxInvoice.invoiceForm),
    issueTimestampIso: input.issueTimestampIso,
    timezone: "Asia/Riyadh",
    qrRequired,
    qrPayloadBase64: input.qrPayloadBase64,
    seller: taxInvoice.sellerSnapshot,
    buyer: taxInvoice.buyerSnapshot,
    lines: taxInvoice.linesSnapshot,
    monetary: taxInvoice.monetarySnapshot,
    payment: taxInvoice.paymentSnapshot,
    taxSource: "collection_fact_monetary_snapshot",
    buyerVatNumberDisplayed,
  };
}
