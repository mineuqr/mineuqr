/**
 * REFUND-CF-ANCHOR-1 — original Cashier sale identity.
 *
 * Collection Fact is the original-sale anchor for production Cashier sales.
 * SR remains refund/document/history persistence and the legacy non-CF path.
 * This module does not persist, does not create Collection Facts, and is not a ledger.
 */

import { COLLECTION_FACT_PRODUCTION_PURPOSE } from "../../payment/collection-fact/collectionFactContract";
import { RefundIdentityViolationError } from "./refundErrors";
import { formatRefundMoney, parseRefundMoney } from "./refundMoney";

export const REFUND_CF_ANCHOR_PROGRAM_ID = "REFUND-CF-ANCHOR-1" as const;

export type RefundOriginalSaleAnchorKind =
  | "collection_fact"
  | "legacy_settlement_record";

export type RefundProductionFactCandidate = Readonly<{
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

export type CollectionFactRefundAnchor = Readonly<{
  kind: "collection_fact";
  collectionFactId: string;
  paymentIntentId: string;
  orderId: number;
  restaurantId: number;
  checkId: number;
  originalCollectedAmount: string;
  currencyCode: string;
  tenders: readonly Readonly<{ paymentMethod: string; amount: string }>[];
  committedAt: string;
  businessDay: string;
  actorId: string | null;
  terminalId: string | null;
  orderingChannel: string;
}>;

export type LegacySettlementRefundAnchor = Readonly<{
  kind: "legacy_settlement_record";
  restaurantId: number;
  checkId: number;
  reason: "no_production_collection_fact";
}>;

export type RefundOriginalSaleAnchor =
  | CollectionFactRefundAnchor
  | LegacySettlementRefundAnchor;

export class AmbiguousRefundOriginalSaleError extends RefundIdentityViolationError {
  constructor(message: string) {
    super(message);
    this.name = "AmbiguousRefundOriginalSaleError";
  }
}

function belongsToCheckSale(
  fact: RefundProductionFactCandidate,
  input: { checkId: number; orderIds: readonly number[] }
): boolean {
  if (fact.checkId != null && fact.checkId === input.checkId) return true;
  return input.orderIds.includes(fact.orderId);
}

function assertProductionFactIdentity(
  fact: RefundProductionFactCandidate
): void {
  if (!fact.collectionFactId.trim()) {
    throw new RefundIdentityViolationError(
      "RF-CF-ANCHOR-02: production Collection Fact missing collectionFactId"
    );
  }
  if (!Number.isInteger(fact.orderId) || fact.orderId <= 0) {
    throw new RefundIdentityViolationError(
      "RF-CF-ANCHOR-02: production Collection Fact missing orderId"
    );
  }
  if (!fact.paymentIntentId.trim()) {
    throw new RefundIdentityViolationError(
      "RF-CF-ANCHOR-02: production Collection Fact missing paymentIntentId"
    );
  }
}

/**
 * Resolve the original-sale anchor for a Check-scoped refund request.
 *
 * Production CF unique → CF-backed.
 * Zero production CFs → explicit legacy SR path (not a lookup error).
 * Two or more production CFs → fail closed.
 * Isolated/non-production facts never become the original sale.
 */
export function resolveRefundOriginalSaleAnchor(input: {
  restaurantId: number;
  checkId: number;
  orderIds: readonly number[];
  facts: readonly RefundProductionFactCandidate[];
}): RefundOriginalSaleAnchor {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new RefundIdentityViolationError(
      "RF-CF-ANCHOR-02: restaurantId required"
    );
  }
  if (!Number.isInteger(input.checkId) || input.checkId <= 0) {
    throw new RefundIdentityViolationError("RF-CF-ANCHOR-02: checkId required");
  }

  for (const fact of input.facts) {
    if (fact.restaurantId !== input.restaurantId) {
      throw new RefundIdentityViolationError(
        "RF-CF-ANCHOR-03: Collection Fact restaurant does not match refund restaurant"
      );
    }
  }

  const production: RefundProductionFactCandidate[] = [];
  const seen = new Set<string>();
  for (const fact of input.facts) {
    if (fact.purpose !== COLLECTION_FACT_PRODUCTION_PURPOSE) continue;
    if (!belongsToCheckSale(fact, input)) continue;
    assertProductionFactIdentity(fact);
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
    throw new AmbiguousRefundOriginalSaleError(
      `RF-CF-ANCHOR-01: ${production.length} production Collection Facts for check=${input.checkId} — fail closed`
    );
  }

  const fact = production[0]!;
  const originalCollectedAmount = formatRefundMoney(
    parseRefundMoney(fact.amount)
  );

  return {
    kind: "collection_fact",
    collectionFactId: fact.collectionFactId,
    paymentIntentId: fact.paymentIntentId,
    orderId: fact.orderId,
    restaurantId: fact.restaurantId,
    checkId: input.checkId,
    originalCollectedAmount,
    currencyCode: fact.currencyCode,
    tenders: fact.tenders,
    committedAt: fact.committedAt,
    businessDay: fact.businessDay,
    actorId: fact.actorId,
    terminalId: fact.terminalId,
    orderingChannel: fact.orderingChannel,
  };
}

export function isCollectionFactRefundAnchor(
  anchor: RefundOriginalSaleAnchor
): anchor is CollectionFactRefundAnchor {
  return anchor.kind === "collection_fact";
}
