/**
 * SAUDI-TAX-PROFILE-1
 * Deterministic Tax Profile readiness — distinct from module applicability.
 *
 * countryCode = SA → Saudi module applicable.
 * READY → Tax Profile configuration complete for future Phase 1 programs.
 */

import type {
  SaudiTaxProfileFields,
  SaudiTaxProfileReadiness,
  SaudiVatNumberValidationOutcome,
} from "./saudiTaxProfileContract";
import { validateSaudiVatNumberStructure } from "./saudiVatNumberValidation";

function hasText(value: string | null | undefined): boolean {
  return value != null && value.trim().length > 0;
}

export function evaluateSaudiTaxProfileReadiness(
  profile: SaudiTaxProfileFields | null | undefined
): {
  readiness: SaudiTaxProfileReadiness;
  vatNumberValidation: SaudiVatNumberValidationOutcome;
} {
  if (profile == null) {
    return { readiness: "NOT_CONFIGURED", vatNumberValidation: "empty" };
  }

  const vatNumberValidation = validateSaudiVatNumberStructure(profile.vatNumber);
  const legalNameOk = hasText(profile.legalName);

  if (profile.vatRegistrationStatus === "unknown") {
    return {
      readiness: legalNameOk ? "INCOMPLETE" : "INCOMPLETE",
      vatNumberValidation,
    };
  }

  if (profile.vatRegistrationStatus === "not_registered") {
    // Non-VAT-registered: profile is configured once legal name is present.
    // Address/VAT number not required for this status.
    return {
      readiness: legalNameOk ? "READY" : "INCOMPLETE",
      vatNumberValidation,
    };
  }

  // registered — seller name, VAT number (structurally valid), and address required.
  const addressOk = hasText(profile.registeredAddress);
  const vatOk = vatNumberValidation === "structurally_valid";
  return {
    readiness:
      legalNameOk && addressOk && vatOk ? "READY" : "INCOMPLETE",
    vatNumberValidation,
  };
}
