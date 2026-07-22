/**
 * SPLIT-PAYMENT-API-1 — Projection → API DTO mapping.
 * Pure field mapping. No Domain logic or money calculations.
 *
 * Stamps `apiContractVersion` independently of ProjectionSchemaVersion.
 */

import {
  SPLIT_PAYMENT_PROJECTION_ID,
  SPLIT_PAYMENT_PROJECTION_PROGRAM_ID,
  SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
  type SplitPaymentAttemptProjection,
  type SplitPaymentOutstandingProjection,
  type SplitPaymentProjection,
} from "@shared/operational-session";
import {
  SPLIT_PAYMENT_API_CONTRACT_ID,
  SPLIT_PAYMENT_API_CONTRACT_VERSION,
  type SplitPaymentAttemptDto,
  type SplitPaymentDto,
  type SplitPaymentOutstandingDto,
  type SplitPaymentProjectionCatalogDto,
  type SplitPaymentProjectionMetaDto,
  type SplitPaymentSummaryDto,
  type SplitPaymentTimelineDto,
  type SplitPaymentTimelineEntryDto,
} from "./splitPaymentApiDtos";

export function toSplitPaymentProjectionMetaDto(
  projection: Pick<
    SplitPaymentProjection,
    "projectionSchemaVersion" | "projectionRevision" | "projectionTimestamp"
  >
): SplitPaymentProjectionMetaDto {
  return {
    projectionId: SPLIT_PAYMENT_PROJECTION_ID,
    projectionSchemaVersion: projection.projectionSchemaVersion,
    projectionRevision: projection.projectionRevision,
    projectedAt: projection.projectionTimestamp,
  };
}

function toTimelineEntries(
  projection: SplitPaymentProjection
): readonly SplitPaymentTimelineEntryDto[] {
  return projection.timeline.map((e) => ({
    kind: e.kind,
    id: e.id,
    amount: e.amount,
    at: e.at,
    method: e.method,
    orderId: e.orderId,
    tenderId: e.tenderId,
  }));
}

export function toSplitPaymentDto(
  projection: SplitPaymentProjection
): SplitPaymentDto {
  return {
    apiContractVersion: SPLIT_PAYMENT_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    checkId: projection.checkId,
    paymentId: projection.paymentId,
    paymentReference: projection.paymentReference,
    financialReference: projection.financialReference,
    paymentStatus: projection.paymentStatus,
    amount: projection.amount,
    allocatedAmount: projection.allocatedAmount,
    unallocatedAmount: projection.unallocatedAmount,
    isPending: projection.isPending,
    isAuthorized: projection.isAuthorized,
    isCaptured: projection.isCaptured,
    isPartiallyApplied: projection.isPartiallyApplied,
    isApplied: projection.isApplied,
    isCancelled: projection.isCancelled,
    isVoided: projection.isVoided,
    isRefunded: projection.isRefunded,
    isFailed: projection.isFailed,
    isValueReceived: projection.isValueReceived,
    isTerminal: projection.isTerminal,
    isPaymentCompleted: projection.isPaymentCompleted,
    impliesFinancialSettlement: false,
    isFinanciallyComplete: false,
    tenderMethods: projection.tenderMethods,
    tenderCount: projection.tenderCount,
    tenderAllocationCount: projection.tenderAllocationCount,
    allocationCount: projection.allocationCount,
    tenders: projection.tenders.map((t) => ({
      tenderId: t.tenderId,
      method: t.method,
      amount: t.amount,
      createdAt: t.createdAt,
    })),
    tenderAllocations: projection.tenderAllocations.map((a) => ({
      tenderAllocationId: a.tenderAllocationId,
      tenderId: a.tenderId,
      amount: a.amount,
      createdAt: a.createdAt,
    })),
    allocations: projection.allocations.map((a) => ({
      allocationId: a.allocationId,
      orderId: a.orderId,
      amount: a.amount,
      createdAt: a.createdAt,
    })),
    timeline: toTimelineEntries(projection),
    lastPaymentActivityAt: projection.lastPaymentActivityAt,
    createdAt: projection.createdAt,
    updatedAt: projection.updatedAt,
    projection: toSplitPaymentProjectionMetaDto(projection),
  };
}

export function toSplitPaymentDtoList(
  projections: readonly SplitPaymentProjection[]
): readonly SplitPaymentDto[] {
  return projections.map(toSplitPaymentDto);
}

export function toSplitPaymentAttemptDto(
  projection: SplitPaymentAttemptProjection
): SplitPaymentAttemptDto {
  return {
    apiContractVersion: SPLIT_PAYMENT_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    checkId: projection.checkId,
    attemptId: projection.attemptId,
    paymentId: projection.paymentId,
    attemptStatus: projection.attemptStatus,
    amount: projection.amount,
    method: projection.method,
    isStarted: projection.isStarted,
    isSucceeded: projection.isSucceeded,
    isFailed: projection.isFailed,
    isCancelled: projection.isCancelled,
    createdAt: projection.createdAt,
    updatedAt: projection.updatedAt,
    projection: toSplitPaymentProjectionMetaDto(projection),
  };
}

export function toSplitPaymentAttemptDtoList(
  projections: readonly SplitPaymentAttemptProjection[]
): readonly SplitPaymentAttemptDto[] {
  return projections.map(toSplitPaymentAttemptDto);
}

export function toSplitPaymentOutstandingDto(
  projection: SplitPaymentOutstandingProjection
): SplitPaymentOutstandingDto {
  return {
    apiContractVersion: SPLIT_PAYMENT_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    checkId: projection.checkId,
    financialResponsibility: projection.financialResponsibility,
    appliedPaymentValue: projection.appliedPaymentValue,
    outstandingBalance: projection.outstandingBalance,
    projection: toSplitPaymentProjectionMetaDto(projection),
  };
}

export function toSplitPaymentTimelineDto(
  projection: SplitPaymentProjection
): SplitPaymentTimelineDto {
  return {
    apiContractVersion: SPLIT_PAYMENT_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    checkId: projection.checkId,
    paymentId: projection.paymentId,
    entries: toTimelineEntries(projection),
    projection: toSplitPaymentProjectionMetaDto(projection),
  };
}

export function toSplitPaymentSummaryDto(input: {
  restaurantId: number;
  checkId: number;
  projections: readonly SplitPaymentProjection[];
}): SplitPaymentSummaryDto {
  const rows = input.projections;
  let pendingCount = 0;
  let authorizedCount = 0;
  let capturedCount = 0;
  let partiallyAppliedCount = 0;
  let appliedCount = 0;
  let cancelledCount = 0;
  let voidedCount = 0;
  let refundedCount = 0;
  let failedCount = 0;
  let latestProjectionRevision: string | null = null;
  let latestUpdatedAt = "";

  for (const row of rows) {
    if (row.isPending) pendingCount += 1;
    else if (row.isAuthorized) authorizedCount += 1;
    else if (row.isCaptured) capturedCount += 1;
    else if (row.isPartiallyApplied) partiallyAppliedCount += 1;
    else if (row.isApplied) appliedCount += 1;
    else if (row.isCancelled) cancelledCount += 1;
    else if (row.isVoided) voidedCount += 1;
    else if (row.isRefunded) refundedCount += 1;
    else if (row.isFailed) failedCount += 1;

    if (row.updatedAt >= latestUpdatedAt) {
      latestUpdatedAt = row.updatedAt;
      latestProjectionRevision = row.projectionRevision;
    }
  }

  return {
    apiContractVersion: SPLIT_PAYMENT_API_CONTRACT_VERSION,
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    totalCount: rows.length,
    pendingCount,
    authorizedCount,
    capturedCount,
    partiallyAppliedCount,
    appliedCount,
    cancelledCount,
    voidedCount,
    refundedCount,
    failedCount,
    projection: {
      projectionId: SPLIT_PAYMENT_PROJECTION_ID,
      projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
      latestProjectionRevision,
    },
  };
}

export function toSplitPaymentProjectionCatalogDto(): SplitPaymentProjectionCatalogDto {
  return {
    apiContractVersion: SPLIT_PAYMENT_API_CONTRACT_VERSION,
    apiContractId: SPLIT_PAYMENT_API_CONTRACT_ID,
    projectionId: SPLIT_PAYMENT_PROJECTION_ID,
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    programId: SPLIT_PAYMENT_PROJECTION_PROGRAM_ID,
  };
}
