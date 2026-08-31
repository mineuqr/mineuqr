/**
 * SAUDI-TAX-PROFILE-1
 * Saudi Tax Profile domain contract — restaurant-level seller tax configuration.
 * Not a Tax Invoice. Not Customer. Not ZATCA/Fatoora integration.
 */

export const SAUDI_TAX_PROFILE_PROGRAM_ID = "SAUDI-TAX-PROFILE-1" as const;

export const SAUDI_VAT_REGISTRATION_STATUSES = [
  "unknown",
  "not_registered",
  "registered",
] as const;

export type SaudiVatRegistrationStatus =
  (typeof SAUDI_VAT_REGISTRATION_STATUSES)[number];

export const SAUDI_TAX_PROFILE_READINESS_STATES = [
  "NOT_CONFIGURED",
  "INCOMPLETE",
  "READY",
] as const;

export type SaudiTaxProfileReadiness =
  (typeof SAUDI_TAX_PROFILE_READINESS_STATES)[number];

/**
 * Structural VAT number outcome only.
 * Does not call ZATCA and does not implement undocumented checksum rules.
 */
export const SAUDI_VAT_NUMBER_VALIDATION_OUTCOMES = [
  "empty",
  "malformed",
  "structurally_valid",
] as const;

export type SaudiVatNumberValidationOutcome =
  (typeof SAUDI_VAT_NUMBER_VALIDATION_OUTCOMES)[number];

/**
 * Mutable profile fields. Future Tax Invoice issuance must snapshot seller
 * identity fields at artifact creation time — profile edits must not rewrite history.
 */
export type SaudiTaxProfileFields = Readonly<{
  legalName: string;
  vatRegistrationStatus: SaudiVatRegistrationStatus;
  /** Required for READY when status is registered. */
  vatNumber: string | null;
  /** Seller registered address for future Phase 1 invoice fields. */
  registeredAddress: string | null;
}>;

export type SaudiTaxProfile = SaudiTaxProfileFields &
  Readonly<{
    id: number;
    restaurantId: number;
    /** Immutable jurisdiction stamp — always SA for this table. */
    countryCode: "SA";
    createdAt: string;
    updatedAt: string;
  }>;

export type SaudiTaxProfileUpsertInput = Readonly<{
  restaurantId: number;
  legalName: string;
  vatRegistrationStatus: SaudiVatRegistrationStatus;
  vatNumber?: string | null;
  registeredAddress?: string | null;
}>;

export type SaudiTaxProfileView = Readonly<{
  applicable: boolean;
  readiness: SaudiTaxProfileReadiness;
  profile: SaudiTaxProfile | null;
  vatNumberValidation: SaudiVatNumberValidationOutcome;
}>;
