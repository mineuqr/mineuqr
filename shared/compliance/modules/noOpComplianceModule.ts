/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Safe default when no country-specific compliance module is implemented.
 */

import type { ComplianceModule } from "../complianceModuleContract";

export const noOpComplianceModule: ComplianceModule = {
  id: "noop",
  applicable: () => false,
  profileRequired: () => false,
  async onProductionCollectionFactCommitted() {
    // Intentionally no-op — preserves global behavior for unsupported countries.
  },
};
