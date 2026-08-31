/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Centralized country → compliance module registry.
 * This is the ONLY place where country routing to compliance modules is defined.
 */

import type { ComplianceModule } from "./complianceModuleContract";
import { normalizeCountryCode } from "./countryCode";
import { noOpComplianceModule } from "./modules/noOpComplianceModule";
import { saudiZatcaComplianceModule } from "./modules/saudiZatcaComplianceModule";

const SAUDI_ZATCA_COUNTRY = "SA" as const;

/** Resolve the compliance module for an authoritative restaurant country code. */
export function resolveComplianceModule(
  countryCode: string | null | undefined
): ComplianceModule {
  const normalized = normalizeCountryCode(countryCode);
  if (normalized === SAUDI_ZATCA_COUNTRY) {
    return saudiZatcaComplianceModule;
  }
  return noOpComplianceModule;
}
