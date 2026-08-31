/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Saudi/ZATCA compliance module — architectural boundary only.
 * Tax Profile, Tax Invoice, IRN, QR, VAT, and ZATCA integration are deferred programs.
 */

import type { ComplianceModule } from "../complianceModuleContract";

export const saudiZatcaComplianceModule: ComplianceModule = {
  id: "saudi_zatca",
  applicable: (ctx) => ctx.countryCode === "SA",
  profileRequired: () => false,
  async onProductionCollectionFactCommitted() {
    // Boundary hook only — Saudi Tax Profile / Tax Invoice programs implement behavior.
  },
};
