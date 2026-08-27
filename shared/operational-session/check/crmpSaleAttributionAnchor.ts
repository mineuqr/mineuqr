/**
 * CRMP-CF-ATTRIBUTION-1 — Collection Fact as the current Cashier sale attribution anchor.
 *
 * CRMP is an attribution/projection layer, not a financial ledger.
 * This module does not persist, does not create Collection Facts, and is not PAID.
 * Isolated/non-production facts never qualify. Ambiguity fails closed (no first-row selection).
 */

import { COLLECTION_FACT_PRODUCTION_PURPOSE } from "../payment/collection-fact/collectionFactContract";

export const CRMP_CF_ATTRIBUTION_PROGRAM_ID = "CRMP-CF-ATTRIBUTION-1" as const;

export type CrmpSaleAttributionAnchorKind =
  | "collection_fact"
  | "legacy_settlement_record";

export type CrmpProductionFactCandidate = Readonly<{
  collectionFactId: string;
  restaurantId: number;
  orderId: number;
  paymentIntentId: string;
  purpose: string;
  amount: string;
  discountAmount: string;
  currencyCode: string;
  tenders: readonly Readonly<{ paymentMethod: string; amount: string }>[];
  checkId: number | null;
  committedAt: string;
  businessDay: string;
  actorId: string | null;
  terminalId: string | null;
  orderingChannel: string;
}>;

export type CollectionFactCrmpAnchor = Readonly<{
  kind: "collection_fact";
  fact: CrmpProductionFactCandidate;
}>;

export type LegacySettlementCrmpAnchor = Readonly<{
  kind: "legacy_settlement_record";
  restaurantId: number;
  checkId: number;
  reason: "no_production_collection_fact";
}>;

export type AmbiguousCrmpSaleAttributionAnchor = Readonly<{
  kind: "ambiguous";
  restaurantId: number;
  checkId: number;
  collectionFactIds: readonly string[];
}>;

export type InvalidCrmpSaleAttributionAnchor = Readonly<{
  kind: "invalid";
  reason: string;
}>;

export type CrmpSaleAttributionAnchor =
  | CollectionFactCrmpAnchor
  | LegacySettlementCrmpAnchor
  | AmbiguousCrmpSaleAttributionAnchor
  | InvalidCrmpSaleAttributionAnchor;

function belongsToCheckSale(
  fact: CrmpProductionFactCandidate,
  input: { checkId: number; orderIds: readonly number[] }
): boolean {
  if (fact.checkId != null && fact.checkId === input.checkId) return true;
  return input.orderIds.includes(fact.orderId);
}

function productionFactIdentityGap(
  fact: CrmpProductionFactCandidate
): string | null {
  if (!fact.collectionFactId.trim()) {
    return "production Collection Fact missing collectionFactId";
  }
  if (!Number.isInteger(fact.orderId) || fact.orderId <= 0) {
    return "production Collection Fact missing orderId";
  }
  if (!fact.paymentIntentId.trim()) {
    return "production Collection Fact missing paymentIntentId";
  }
  return null;
}

/**
 * Resolve the current-sale CRMP attribution anchor for a Check-scoped sale.
 *
 * Production CF unique → CF-native attribution.
 * Zero production CFs → explicit legacy SR path.
 * Two or more production CFs → fail closed (no first/newest/oldest row selection).
 * Isolated/non-production facts never become the current sale.
 */
export function resolveCrmpSaleAttributionAnchor(input: {
  restaurantId: number;
  checkId: number;
  orderIds: readonly number[];
  facts: readonly CrmpProductionFactCandidate[];
}): CrmpSaleAttributionAnchor {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    return { kind: "invalid", reason: "restaurantId required" };
  }
  if (!Number.isInteger(input.checkId) || input.checkId <= 0) {
    return { kind: "invalid", reason: "checkId required" };
  }

  for (const fact of input.facts) {
    if (fact.restaurantId !== input.restaurantId) {
      return {
        kind: "invalid",
        reason: "Collection Fact restaurant does not match attribution restaurant",
      };
    }
  }

  const production: CrmpProductionFactCandidate[] = [];
  const seen = new Set<string>();
  for (const fact of input.facts) {
    if (fact.purpose !== COLLECTION_FACT_PRODUCTION_PURPOSE) continue;
    if (!belongsToCheckSale(fact, input)) continue;
    const identityGap = productionFactIdentityGap(fact);
    if (identityGap) {
      return { kind: "invalid", reason: identityGap };
    }
    if (seen.has(fact.collectionFactId)) continue;
    seen.add(fact.collectionFactId);
    production.push(fact);
  }

  if (production.length === 0) {
    return {
      kind: "legacy_settlement_record",
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      reason: "no_production_collection_fact",
    };
  }

  if (production.length > 1) {
    return {
      kind: "ambiguous",
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      collectionFactIds: production.map((fact) => fact.collectionFactId),
    };
  }

  return { kind: "collection_fact", fact: production[0]! };
}

export function isCollectionFactCrmpAnchor(
  anchor: CrmpSaleAttributionAnchor
): anchor is CollectionFactCrmpAnchor {
  return anchor.kind === "collection_fact";
}
