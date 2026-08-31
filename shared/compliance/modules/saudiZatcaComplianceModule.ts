/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 / SAUDI-TAX-PROFILE-1 /
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Saudi/ZATCA compliance module — architectural boundary.
 * Tax Invoice domain is registered from server (DB-backed); shared stays free of Financial Core ownership.
 */

import type {
  ComplianceModule,
} from "../complianceModuleContract";
import type { ProductionCollectionFactCommittedEvent } from "../complianceEvents";

export type SaudiTaxInvoiceDomainHandler = (
  event: ProductionCollectionFactCommittedEvent
) => Promise<void>;

let taxInvoiceDomainHandler: SaudiTaxInvoiceDomainHandler | null = null;

/** Server registers the Tax Invoice domain ensure path. Shared module remains the SA boundary. */
export function registerSaudiTaxInvoiceDomainHandler(
  handler: SaudiTaxInvoiceDomainHandler
): void {
  taxInvoiceDomainHandler = handler;
}

/** Test helper — clears domain handler registration. */
export function clearSaudiTaxInvoiceDomainHandlerForTests(): void {
  taxInvoiceDomainHandler = null;
}

export const saudiZatcaComplianceModule: ComplianceModule = {
  id: "saudi_zatca",
  applicable: (ctx) => ctx.countryCode === "SA",
  /** SA restaurants require a Saudi Tax Profile before compliance artifacts. */
  profileRequired: (ctx) => ctx.countryCode === "SA",
  async onProductionCollectionFactCommitted(event) {
    if (taxInvoiceDomainHandler) {
      await taxInvoiceDomainHandler(event);
    }
  },
};
