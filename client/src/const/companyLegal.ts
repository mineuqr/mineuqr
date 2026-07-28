/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1
 * Post-Atlas legal entity registry — do not publish until formation is complete
 * and MINEUQR_PUBLISH_COMPANY_LEGAL is explicitly enabled.
 *
 * Fill fields after company registration (Stripe Atlas / local formation).
 * Never invent values for public display.
 */
export type CompanyLegalIdentity = {
  /** Registered legal company name */
  legalName: string | null;
  /** Incorporation jurisdiction (e.g. "Delaware, USA") */
  jurisdiction: string | null;
  /** Registered mailing / principal address */
  registeredAddress: string | null;
  /** Company / registration number when applicable */
  registrationNumber: string | null;
  /** EIN, VAT, or other tax identifier */
  taxId: string | null;
  /** Formal business contact email (may differ from support) */
  businessContactEmail: string | null;
};

/**
 * Populate after company formation. Keep null until verified.
 */
export const MINEUQR_COMPANY_LEGAL: CompanyLegalIdentity = {
  legalName: null,
  jurisdiction: null,
  registeredAddress: null,
  registrationNumber: null,
  taxId: null,
  businessContactEmail: null,
};

/**
 * Must remain false until legal identity is verified and approved for public display.
 * Enabling without real values still yields null from getPublicCompanyLegal().
 */
export const MINEUQR_PUBLISH_COMPANY_LEGAL = false;

/** Public-safe legal identity, or null when not ready to show. */
export function getPublicCompanyLegal(): CompanyLegalIdentity | null {
  if (!MINEUQR_PUBLISH_COMPANY_LEGAL) return null;
  const { legalName, jurisdiction } = MINEUQR_COMPANY_LEGAL;
  if (!legalName?.trim() || !jurisdiction?.trim()) return null;
  return MINEUQR_COMPANY_LEGAL;
}
