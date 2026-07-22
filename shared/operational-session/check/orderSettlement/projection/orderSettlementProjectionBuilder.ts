/**
 * ORDER-SETTLEMENT-PROJECTION-1 — deterministic projection builders.
 *
 * Source: committed Order Settlement Write Model only.
 * Does NOT calculate money, validate invariants, or own lifecycle.
 */

import type { OrderSettlement } from "../orderSettlementContract";
import type { OrderSettlementDomainEvent } from "../orderSettlementEvents";
import {
  ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
  type OrderSettlementProjection,
  type OrderSettlementProjectionEventClaimKey,
} from "./orderSettlementProjectionContract";

/**
 * Deterministic revision from committed Write Model fields.
 * Identical Write Model ⇒ identical revision (ADR-021 replay safe).
 */
export function buildOrderSettlementProjectionRevision(
  settlement: OrderSettlement
): string {
  return [
    `v${ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION}`,
    settlement.restaurantId,
    settlement.checkId,
    settlement.orderId,
    settlement.status,
    settlement.orderTotalSnapshot,
    settlement.allocatedAmount,
    settlement.settledAmount,
    settlement.outstandingAmount,
    settlement.updatedAt,
  ].join("|");
}

function statusFlags(status: OrderSettlement["status"]) {
  return {
    isSettled: status === "settled",
    isComplimentary: status === "complimentary",
    isVoided: status === "voided",
    isRefunded: status === "refunded",
    isCancelled: status === "cancelled",
    isPartiallySettled: status === "partially_settled",
  };
}

function lastSettlementAt(settlement: OrderSettlement): string | null {
  return settlement.status === "pending" ? null : settlement.updatedAt;
}

/**
 * Build the canonical projection from a committed Order Settlement entity.
 */
export function buildOrderSettlementProjection(
  settlement: OrderSettlement
): OrderSettlementProjection {
  return {
    restaurantId: settlement.restaurantId,
    checkId: settlement.checkId,
    orderId: settlement.orderId,
    settlementStatus: settlement.status,
    allocatedAmount: settlement.allocatedAmount,
    settledAmount: settlement.settledAmount,
    outstandingAmount: settlement.outstandingAmount,
    orderTotalSnapshot: settlement.orderTotalSnapshot,
    ...statusFlags(settlement.status),
    lastSettlementAt: lastSettlementAt(settlement),
    createdAt: settlement.createdAt,
    updatedAt: settlement.updatedAt,
    projectionSchemaVersion: ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: buildOrderSettlementProjectionRevision(settlement),
  };
}

/** Map many committed settlements → projections (stable identity order). */
export function buildOrderSettlementProjections(
  settlements: readonly OrderSettlement[]
): readonly OrderSettlementProjection[] {
  return settlements
    .map(buildOrderSettlementProjection)
    .slice()
    .sort((a, b) => {
      if (a.checkId !== b.checkId) return a.checkId - b.checkId;
      return a.orderId - b.orderId;
    });
}

/**
 * Deterministic claim key for collected Domain Events (no bus).
 * Duplicate delivery of the same fact yields the same key.
 */
export function buildOrderSettlementProjectionEventClaimKey(
  event: OrderSettlementDomainEvent
): OrderSettlementProjectionEventClaimKey {
  return [
    event.eventType,
    event.restaurantId,
    event.checkId,
    event.orderId,
    event.status,
    event.occurredAt,
  ].join("|");
}
