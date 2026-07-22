/**
 * ORDER-SETTLEMENT-PROJECTION-1 — canonical Order Settlement Read Model contracts.
 *
 * Read model only. Not a source of business truth (ADR-ARCH-022).
 * No lifecycle ownership, settlement authority, commands, or money math.
 */

import type { OrderSettlementStatus } from "../orderSettlementContract";

export const ORDER_SETTLEMENT_PROJECTION_PROGRAM_ID =
  "ORDER-SETTLEMENT-PROJECTION-1" as const;

/** Schema version for replay / consumer compatibility (not business semantics). */
export const ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION = 1 as const;

/** Canonical projection identifier (Check / FSP owned — not Order P-09). */
export const ORDER_SETTLEMENT_PROJECTION_ID =
  "OS-P-01-order-settlement" as const;

/**
 * Latest committed Order Settlement financial state for operational reads.
 * All monetary fields are copied from the Write Model — never recalculated.
 */
export type OrderSettlementProjection = Readonly<{
  restaurantId: number;
  checkId: number;
  orderId: number;
  settlementStatus: OrderSettlementStatus;
  allocatedAmount: string;
  settledAmount: string;
  outstandingAmount: string;
  orderTotalSnapshot: string;
  isSettled: boolean;
  isComplimentary: boolean;
  isVoided: boolean;
  isRefunded: boolean;
  isCancelled: boolean;
  isPartiallySettled: boolean;
  /** Write-model timestamp of last non-pending settlement activity; null when pending. */
  lastSettlementAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Schema version of this projection shape. */
  projectionSchemaVersion: typeof ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION;
  /**
   * Deterministic revision derived from committed Write Model fields.
   * Consumers compare for freshness / replay safety — no business meaning.
   */
  projectionRevision: string;
}>;

export type OrderSettlementProjectionIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
  orderId: number;
}>;

/** ADR-021-compatible claim key for a consumed Domain Event (no bus). */
export type OrderSettlementProjectionEventClaimKey = string;
