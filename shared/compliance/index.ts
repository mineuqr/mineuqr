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
