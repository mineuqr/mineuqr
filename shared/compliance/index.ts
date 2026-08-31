/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Multi-country compliance layer — contract, registry, and module boundaries.
 */

export {
  COMPLIANCE_MODULE_IDS,
  type ComplianceModule,
  type ComplianceModuleContext,
  type ComplianceModuleId,
} from "./complianceModuleContract";

export type {
  ProductionCollectionFactCommittedEvent,
  RefundCommittedEvent,
} from "./complianceEvents";

export { normalizeCountryCode } from "./countryCode";
export { resolveComplianceModule } from "./resolveComplianceModule";
export { noOpComplianceModule } from "./modules/noOpComplianceModule";
export { saudiZatcaComplianceModule } from "./modules/saudiZatcaComplianceModule";
export {
  registerSaudiTaxInvoiceDomainHandler,
  clearSaudiTaxInvoiceDomainHandlerForTests,
  type SaudiTaxInvoiceDomainHandler,
} from "./modules/saudiZatcaComplianceModule";

export {
  SAUDI_TAX_PROFILE_PROGRAM_ID,
  SAUDI_TAX_PROFILE_READINESS_STATES,
  SAUDI_VAT_NUMBER_VALIDATION_OUTCOMES,
  SAUDI_VAT_NUMBER_STRUCTURAL_LENGTH,
  SAUDI_VAT_REGISTRATION_STATUSES,
  evaluateSaudiTaxProfileReadiness,
  normalizeSaudiVatNumberInput,
  validateSaudiVatNumberStructure,
  type SaudiTaxProfile,
  type SaudiTaxProfileFields,
  type SaudiTaxProfileReadiness,
  type SaudiTaxProfileUpsertInput,
  type SaudiTaxProfileView,
  type SaudiVatNumberValidationOutcome,
  type SaudiVatRegistrationStatus,
} from "./saudi-tax-profile";

export {
  SAUDI_TAX_INVOICE_PROGRAM_ID,
  SAUDI_TAX_INVOICE_DOCUMENT_KINDS,
  SAUDI_TAX_INVOICE_STATUSES,
  SAUDI_TAX_INVOICE_PARTY_MODELS,
  SAUDI_TAX_INVOICE_FORMS,
  SAUDI_TAX_INVOICE_CLASSIFICATION_POLICY_STATUSES,
  classifySaudiTaxInvoiceFoundation,
  canTransitionSaudiTaxInvoiceStatus,
  assertSaudiTaxInvoiceStatusTransition,
  isSaudiTaxInvoiceSnapshotImmutable,
  SAUDI_PHASE1_QR_TAGS,
  buildSaudiPhase1QrPayloadBase64,
  decodeSaudiPhase1QrPayloadBase64,
  formatSaudiTaxInvoiceNumber,
  SAUDI_TAX_INVOICE_NUMBER_PAD,
  SAUDI_TAX_INVOICE_PHASE1_PROGRAM_ID,
  SAUDI_PHASE_1_QR_POLICY,
  saudiPhase1InvoiceTitles,
  isSimplifiedTaxInvoiceForm,
  isStandardTaxInvoiceForm,
  saudiPhase1QrRequired,
  buildSaudiPhase1Document,
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
  type SaudiTaxInvoiceClassificationInput,
  type SaudiPhase1QrFields,
  type SaudiPhase1Document,
  type SaudiPhase1InvoiceTitles,
} from "./saudi-tax-invoice";
