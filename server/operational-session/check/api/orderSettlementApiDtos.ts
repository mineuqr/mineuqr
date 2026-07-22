/**
 * ORDER-SETTLEMENT-API-1 — API-safe Read DTOs.
 *
 * DTOs expose Projection fields only. No Domain / Persistence / event contracts.
 */

import { ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION } from "@shared/operational-session";

/** Projection freshness metadata — no business semantics. */
export type OrderSettlementProjectionMetaDto = Readonly<{
  projectionId: string;
  projectionSchemaVersion: typeof ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
}>;

/** Canonical Order Settlement read response. */
export type OrderSettlementDto = Readonly<{
  restaurantId: number;
  checkId: number;
  orderId: number;
  settlementStatus: string;
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
  lastSettlementAt: string | null;
  createdAt: string;
  updatedAt: string;
  projection: OrderSettlementProjectionMetaDto;
}>;

/**
 * Status-count summary from projected rows only.
 * Does not sum or recalculate money amounts.
 */
export type OrderSettlementSummaryDto = Readonly<{
  restaurantId: number;
  checkId: number;
  totalCount: number;
  pendingCount: number;
  partiallySettledCount: number;
  settledCount: number;
  complimentaryCount: number;
  cancelledCount: number;
  voidedCount: number;
  refundedCount: number;
  projection: Readonly<{
    projectionId: string;
    projectionSchemaVersion: typeof ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION;
    /** Newest projectionRevision among included rows; null when empty. */
    latestProjectionRevision: string | null;
  }>;
}>;

/** Schema / identity metadata for consumers. */
export type OrderSettlementProjectionCatalogDto = Readonly<{
  projectionId: string;
  projectionSchemaVersion: typeof ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION;
  programId: string;
}>;
