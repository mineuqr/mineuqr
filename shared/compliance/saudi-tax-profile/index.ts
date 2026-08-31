/**
 * SAUDI-TAX-PROFILE-1
 * Saudi Tax Profile shared surface.
 */

export {
  SAUDI_TAX_PROFILE_PROGRAM_ID,
  SAUDI_TAX_PROFILE_READINESS_STATES,
  SAUDI_VAT_NUMBER_VALIDATION_OUTCOMES,
  SAUDI_VAT_REGISTRATION_STATUSES,
  type SaudiTaxProfile,
  type SaudiTaxProfileFields,
  type SaudiTaxProfileReadiness,
  type SaudiTaxProfileUpsertInput,
  type SaudiTaxProfileView,
  type SaudiVatNumberValidationOutcome,
  type SaudiVatRegistrationStatus,
} from "./saudiTaxProfileContract";

export { evaluateSaudiTaxProfileReadiness } from "./saudiTaxProfileReadiness";

export {
  SAUDI_VAT_NUMBER_STRUCTURAL_LENGTH,
  normalizeSaudiVatNumberInput,
  validateSaudiVatNumberStructure,
} from "./saudiVatNumberValidation";
