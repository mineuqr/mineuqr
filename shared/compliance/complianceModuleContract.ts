/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Country compliance module contract. Observers only — not financial authority.
 */

import type {
  ProductionCollectionFactCommittedEvent,
  RefundCommittedEvent,
} from "./complianceEvents";

export const COMPLIANCE_MODULE_IDS = [
  "noop",
  "saudi_zatca",
] as const;

export type ComplianceModuleId = (typeof COMPLIANCE_MODULE_IDS)[number];

export type ComplianceModuleContext = Readonly<{
  restaurantId: number;
  countryCode: string;
}>;

/**
 * Compliance modules observe authoritative global events.
 * They MUST NOT create or mutate Collection Facts, PAID, tenders, or payment state.
 */
export type ComplianceModule = Readonly<{
  id: ComplianceModuleId;
  applicable: (ctx: ComplianceModuleContext) => boolean;
  /** Whether a country tax profile must exist before compliance artifacts (future). */
  profileRequired: (ctx: ComplianceModuleContext) => boolean;
  onProductionCollectionFactCommitted: (
    event: ProductionCollectionFactCommittedEvent
  ) => Promise<void>;
  onRefundCommitted?: (event: RefundCommittedEvent) => Promise<void>;
}>;
