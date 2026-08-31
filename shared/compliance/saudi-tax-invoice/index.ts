/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Shared Tax Invoice domain surface (Saudi Compliance).
 */

export {
  SAUDI_TAX_INVOICE_PROGRAM_ID,
  SAUDI_TAX_INVOICE_DOCUMENT_KINDS,
  SAUDI_TAX_INVOICE_STATUSES,
  SAUDI_TAX_INVOICE_PARTY_MODELS,
  SAUDI_TAX_INVOICE_FORMS,
  SAUDI_TAX_INVOICE_CLASSIFICATION_POLICY_STATUSES,
  type SaudiTaxInvoiceDocumentKind,
  type SaudiTaxInvoiceStatus,
  type SaudiTaxInvoicePartyModel,
  type SaudiTaxInvoiceForm,
  type SaudiTaxInvoiceClassificationPolicyStatus,
  type SaudiTaxInvoiceClassification,
  type SaudiTaxInvoiceSellerSnapshot,
  type SaudiTaxInvoiceBuyerSnapshot,
  type SaudiTaxInvoiceOrderLineSnapshot,
  type SaudiTaxInvoiceLinesSnapshot,
  type SaudiTaxInvoiceMonetarySnapshot,
  type SaudiTaxInvoicePaymentSnapshot,
  type SaudiTaxInvoice,
  type EnsureSaudiTaxInvoiceInput,
  type EnsureSaudiTaxInvoiceResult,
} from "./saudiTaxInvoiceContract";

export {
  classifySaudiTaxInvoiceFoundation,
  type SaudiTaxInvoiceClassificationInput,
} from "./saudiTaxInvoiceClassification";

export {
  canTransitionSaudiTaxInvoiceStatus,
  assertSaudiTaxInvoiceStatusTransition,
  isSaudiTaxInvoiceSnapshotImmutable,
} from "./saudiTaxInvoiceState";

export {
  SAUDI_PHASE1_QR_TAGS,
  buildSaudiPhase1QrPayloadBase64,
  decodeSaudiPhase1QrPayloadBase64,
  type SaudiPhase1QrFields,
} from "./saudiPhase1QrTlv";

export {
  formatSaudiTaxInvoiceNumber,
  SAUDI_TAX_INVOICE_NUMBER_PAD,
} from "./saudiTaxInvoiceNumbering";

export {
  SAUDI_TAX_INVOICE_PHASE1_PROGRAM_ID,
  saudiPhase1InvoiceTitles,
  isSimplifiedTaxInvoiceForm,
  buildSaudiPhase1Document,
  type SaudiPhase1Document,
  type SaudiPhase1InvoiceTitles,
} from "./saudiPhase1Document";
