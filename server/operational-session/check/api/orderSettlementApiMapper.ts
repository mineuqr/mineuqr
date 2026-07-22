/**
 * ORDER-SETTLEMENT-API-1 — Projection → API DTO mapping.
 * Pure field mapping. No Domain logic or money calculations.
 */

import {
  ORDER_SETTLEMENT_PROJECTION_ID,
  ORDER_SETTLEMENT_PROJECTION_PROGRAM_ID,
  ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
  type OrderSettlementProjection,
} from "@shared/operational-session";
import type {
  OrderSettlementDto,
  OrderSettlementProjectionCatalogDto,
  OrderSettlementProjectionMetaDto,
  OrderSettlementSummaryDto,
} from "./orderSettlementApiDtos";

export function toProjectionMetaDto(
  projection: OrderSettlementProjection
): OrderSettlementProjectionMetaDto {
  return {
    projectionId: ORDER_SETTLEMENT_PROJECTION_ID,
    projectionSchemaVersion: projection.projectionSchemaVersion,
    projectionRevision: projection.projectionRevision,
  };
}

export function toOrderSettlementDto(
  projection: OrderSettlementProjection
): OrderSettlementDto {
  return {
    restaurantId: projection.restaurantId,
    checkId: projection.checkId,
    orderId: projection.orderId,
    settlementStatus: projection.settlementStatus,
    allocatedAmount: projection.allocatedAmount,
    settledAmount: projection.settledAmount,
    outstandingAmount: projection.outstandingAmount,
    orderTotalSnapshot: projection.orderTotalSnapshot,
    isSettled: projection.isSettled,
    isComplimentary: projection.isComplimentary,
    isVoided: projection.isVoided,
    isRefunded: projection.isRefunded,
    isCancelled: projection.isCancelled,
    isPartiallySettled: projection.isPartiallySettled,
    lastSettlementAt: projection.lastSettlementAt,
    createdAt: projection.createdAt,
    updatedAt: projection.updatedAt,
    projection: toProjectionMetaDto(projection),
  };
}

export function toOrderSettlementDtoList(
  projections: readonly OrderSettlementProjection[]
): readonly OrderSettlementDto[] {
  return projections.map(toOrderSettlementDto);
}

export function toOrderSettlementSummaryDto(input: {
  restaurantId: number;
  checkId: number;
  projections: readonly OrderSettlementProjection[];
}): OrderSettlementSummaryDto {
  const rows = input.projections;
  let pendingCount = 0;
  let partiallySettledCount = 0;
  let settledCount = 0;
  let complimentaryCount = 0;
  let cancelledCount = 0;
  let voidedCount = 0;
  let refundedCount = 0;
  let latestProjectionRevision: string | null = null;
  let latestUpdatedAt = "";

  for (const row of rows) {
    if (row.isPartiallySettled) partiallySettledCount += 1;
    else if (row.isSettled) settledCount += 1;
    else if (row.isComplimentary) complimentaryCount += 1;
    else if (row.isCancelled) cancelledCount += 1;
    else if (row.isVoided) voidedCount += 1;
    else if (row.isRefunded) refundedCount += 1;
    else if (row.settlementStatus === "pending") pendingCount += 1;

    if (row.updatedAt >= latestUpdatedAt) {
      latestUpdatedAt = row.updatedAt;
      latestProjectionRevision = row.projectionRevision;
    }
  }

  return {
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    totalCount: rows.length,
    pendingCount,
    partiallySettledCount,
    settledCount,
    complimentaryCount,
    cancelledCount,
    voidedCount,
    refundedCount,
    projection: {
      projectionId: ORDER_SETTLEMENT_PROJECTION_ID,
      projectionSchemaVersion: ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
      latestProjectionRevision,
    },
  };
}

export function toProjectionCatalogDto(): OrderSettlementProjectionCatalogDto {
  return {
    projectionId: ORDER_SETTLEMENT_PROJECTION_ID,
    projectionSchemaVersion: ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
    programId: ORDER_SETTLEMENT_PROJECTION_PROGRAM_ID,
  };
}
