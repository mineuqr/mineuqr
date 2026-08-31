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
