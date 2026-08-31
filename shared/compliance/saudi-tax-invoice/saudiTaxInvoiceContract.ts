/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Internal Tax Invoice domain contracts — Saudi Compliance ownership.
 * Not ZATCA API. Not Fatoora. Not IRN. Not QR. Not VAT engine.
 */

export const SAUDI_TAX_INVOICE_PROGRAM_ID =
  "SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1" as const;

export const SAUDI_TAX_INVOICE_DOCUMENT_KINDS = ["tax_invoice"] as const;
export type SaudiTaxInvoiceDocumentKind =
  (typeof SAUDI_TAX_INVOICE_DOCUMENT_KINDS)[number];

export const SAUDI_TAX_INVOICE_STATUSES = [
  "blocked_profile",
  "generated",
  "failed",
  "retryable",
] as const;
export type SaudiTaxInvoiceStatus = (typeof SAUDI_TAX_INVOICE_STATUSES)[number];

export const SAUDI_TAX_INVOICE_PARTY_MODELS = [
  "b2c",
  "b2b",
  "b2g",
  "unclassified",
] as const;
export type SaudiTaxInvoicePartyModel =
  (typeof SAUDI_TAX_INVOICE_PARTY_MODELS)[number];

export const SAUDI_TAX_INVOICE_FORMS = [
  "simplified_tax_invoice",
  "standard_tax_invoice",
  "undetermined",
] as const;
export type SaudiTaxInvoiceForm = (typeof SAUDI_TAX_INVOICE_FORMS)[number];

export const SAUDI_TAX_INVOICE_CLASSIFICATION_POLICY_STATUSES = [
  "platform_invariant",
  "needs_official_confirmation",
] as const;
export type SaudiTaxInvoiceClassificationPolicyStatus =
  (typeof SAUDI_TAX_INVOICE_CLASSIFICATION_POLICY_STATUSES)[number];

export type SaudiTaxInvoiceClassification = Readonly<{
  partyModel: SaudiTaxInvoicePartyModel;
  invoiceForm: SaudiTaxInvoiceForm;
  rationaleCode: string;
  policyStatus: SaudiTaxInvoiceClassificationPolicyStatus;
  blockingIssues: readonly string[];
  notes: string;
}>;

export type SaudiTaxInvoiceSellerSnapshot = Readonly<{
  kind: "not_configured" | "incomplete" | "ready";
  profileId: number | null;
  legalName: string | null;
  vatRegistrationStatus: string | null;
  vatNumber: string | null;
  registeredAddress: string | null;
}>;

export type SaudiTaxInvoiceBuyerSnapshot = Readonly<
  | {
      kind: "anonymous_cash";
      customerId: null;
      displayName: null;
      customerType: null;
      phone: null;
      email: null;
      address: null;
      taxNumber: null;
    }
  | {
      kind: "customer";
      customerId: number;
      displayName: string;
      customerType: "individual" | "business";
      phone: string | null;
      email: string | null;
      address: string | null;
      taxNumber: string | null;
    }
>;

export type SaudiTaxInvoiceOrderLineSnapshot = Readonly<{
  sourceOrderItemId: number;
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  unitPrice: string;
  lineAmount: string;
  notes: string | null;
  modifiers: readonly string[] | null;
}>;

export type SaudiTaxInvoiceLinesSnapshot = Readonly<{
  source: "order_items_plus_collection_fact_composition";
  orderLines: readonly SaudiTaxInvoiceOrderLineSnapshot[];
  collectionFactComposition: readonly Readonly<{
    sequence: number;
    description: string;
    netAmount: string;
    taxAmount: string;
    originOrderId: number | null;
  }>[];
  /** OQ-VAT-1 — VAT line SSOT vs Collection Fact remains deferred. */
  vatLineSsot: "deferred_oq_vat_1";
}>;

export type SaudiTaxInvoiceMonetarySnapshot = Readonly<{
  source: "collection_fact";
  subtotal: string;
  discountAmount: string;
  /** Copied from Collection Fact — not Saudi VAT engine output. */
  taxAmount: string;
  amount: string;
  currencyCode: string;
  taxAmountMeaning: "collection_fact_copy_not_saudi_vat_engine";
  oqVat1: "deferred";
}>;

export type SaudiTaxInvoicePaymentSnapshot = Readonly<{
  source: "collection_fact";
  tenders: readonly Readonly<{
    paymentMethod: string;
    amount: string;
  }>[];
}>;

export type SaudiTaxInvoice = Readonly<{
  id: number;
  taxInvoiceId: string;
  restaurantId: number;
  orderId: number;
  collectionFactId: string;
  documentKind: SaudiTaxInvoiceDocumentKind;
  status: SaudiTaxInvoiceStatus;
  partyModel: SaudiTaxInvoicePartyModel;
  invoiceForm: SaudiTaxInvoiceForm;
  classificationRationaleCode: string;
  classification: SaudiTaxInvoiceClassification;
  sellerSnapshot: SaudiTaxInvoiceSellerSnapshot;
  buyerSnapshot: SaudiTaxInvoiceBuyerSnapshot;
  linesSnapshot: SaudiTaxInvoiceLinesSnapshot;
  monetarySnapshot: SaudiTaxInvoiceMonetarySnapshot;
  paymentSnapshot: SaudiTaxInvoicePaymentSnapshot;
  sourceCustomerId: number | null;
  profileReadinessAtIssuance: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  attemptCount: number;
  issuedAt: string | null;
  /** Phase 1 human invoice number (immutable once assigned). */
  invoiceNumber: string | null;
  invoiceSequence: number | null;
  issueTimestampIso: string | null;
  qrPayloadBase64: string | null;
  phase1Document: unknown | null;
  createdAt: string;
  updatedAt: string;
}>;

export type EnsureSaudiTaxInvoiceInput = Readonly<{
  collectionFactId: string;
  restaurantId: number;
  countryCode: string;
  orderId: number;
  committedAt: string;
  commitOutcome: "created" | "replayed";
  cashierInvoiceNumber?: string | null;
}>;

export type EnsureSaudiTaxInvoiceResult = Readonly<{
  outcome: "created" | "replayed" | "upgraded";
  taxInvoice: SaudiTaxInvoice;
}>;
