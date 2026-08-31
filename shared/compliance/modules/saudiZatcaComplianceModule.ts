/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 / SAUDI-TAX-PROFILE-1
 * Saudi/ZATCA compliance module — architectural boundary.
 * Tax Profile readiness is evaluated separately; Tax Invoice/IRN/QR remain deferred.
 */

import type { ComplianceModule } from "../complianceModuleContract";

export const saudiZatcaComplianceModule: ComplianceModule = {
  id: "saudi_zatca",
  applicable: (ctx) => ctx.countryCode === "SA",
  /** SA restaurants require a Saudi Tax Profile before future compliance artifacts. */
  profileRequired: (ctx) => ctx.countryCode === "SA",
  async onProductionCollectionFactCommitted() {
    // Boundary hook only — Tax Invoice programs implement artifact behavior.
  },
};
