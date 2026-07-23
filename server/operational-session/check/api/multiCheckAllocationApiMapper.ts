/**
 * MULTI-CHECK-ALLOCATION-API-1 — Projection → API DTO mapping.
 * Pure field mapping. No Domain logic or money calculations.
 *
 * Stamps `apiContractVersion` independently of ProjectionSchemaVersion.
 * Hides internal Allocation / persistence revisions from Presentation.
 */

import {
  MULTI_CHECK_ALLOCATION_PROJECTION_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_PROGRAM_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
  type MultiCheckAllocationProjection,
  type MultiCheckAllocationResponsibilityProjection,
  type MultiCheckAllocationSummaryProjection,
} from "@shared/operational-session";
import {
  MULTI_CHECK_ALLOCATION_API_CONTRACT_ID,
  MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
  type MultiCheckAllocationCommandResultDto,
  type MultiCheckAllocationDto,
  type MultiCheckAllocationProjectionCatalogDto,
  type MultiCheckAllocationProjectionMetaDto,
  type MultiCheckAllocationResponsibilityDto,
  type MultiCheckAllocationSummaryDto,
  type MultiCheckAllocationTimelineDto,
  type MultiCheckAllocationTimelineEntryDto,
} from "./multiCheckAllocationApiDtos";

export function toMultiCheckAllocationProjectionMetaDto(
  projection: Pick<
    MultiCheckAllocationProjection,
    "projectionSchemaVersion" | "projectionRevision" | "projectionTimestamp"
  >
): MultiCheckAllocationProjectionMetaDto {
  return {
    projectionId: MULTI_CHECK_ALLOCATION_PROJECTION_ID,
    projectionSchemaVersion: projection.projectionSchemaVersion,
    projectionRevision: projection.projectionRevision,
    projectedAt: projection.projectionTimestamp,
  };
}

function toTimelineEntries(
  projection: MultiCheckAllocationProjection
): readonly MultiCheckAllocationTimelineEntryDto[] {
  return projection.timeline.map((e) => ({
    kind: e.kind,
    id: e.id,
    amount: e.amount,
    at: e.at,
    sourceCheckId: e.sourceCheckId,
    targetCheckId: e.targetCheckId,
    portionId: e.portionId,
    direction: e.direction,
  }));
}

export function toMultiCheckAllocationResponsibilityDto(
  projection: MultiCheckAllocationResponsibilityProjection
): MultiCheckAllocationResponsibilityDto {
  return {
    apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    allocationId: projection.allocationId,
    financialResponsibility: projection.financialResponsibility,
    allocatedAmount: projection.allocatedAmount,
    remainingAmount: projection.remainingAmount,
    financialReference: projection.financialReference,
    projection: toMultiCheckAllocationProjectionMetaDto(projection),
  };
}

export function toMultiCheckAllocationDto(
  projection: MultiCheckAllocationProjection
): MultiCheckAllocationDto {
  return {
    apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    allocationId: projection.allocationId,
    allocationReference: projection.allocationReference,
    financialReference: projection.financialReference,
    sourceCheckId: projection.sourceCheckId,
    sourcePaymentId: projection.sourcePaymentId,
    allocationStatus: projection.allocationStatus,
    financialResponsibility: projection.financialResponsibility,
    allocatedAmount: projection.allocatedAmount,
    remainingAmount: projection.remainingAmount,
    paymentValueCap: projection.paymentValueCap,
    isPending: projection.isPending,
    isReserved: projection.isReserved,
    isApplied: projection.isApplied,
    isAdjusted: projection.isAdjusted,
    isReversed: projection.isReversed,
    isCompleted: projection.isCompleted,
    isCancelled: projection.isCancelled,
    isTerminal: projection.isTerminal,
    isSuccessTerminal: projection.isSuccessTerminal,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    cardinality: projection.cardinality,
    sourceCount: projection.sourceCount,
    portionCount: projection.portionCount,
    adjustmentCount: projection.adjustmentCount,
    reversalCount: projection.reversalCount,
    targetCheckIds: projection.targetCheckIds,
    sources: projection.sources.map((s) => ({
      sourceCheckId: s.sourceCheckId,
      sourcePaymentId: s.sourcePaymentId,
      financialReference: s.financialReference,
      responsibilityAmount: s.responsibilityAmount,
    })),
    targets: projection.targets.map((t) => ({
      targetCheckId: t.targetCheckId,
      portionId: t.portionId,
      amount: t.amount,
      applied: t.applied,
    })),
    portions: projection.portions.map((p) => ({
      portionId: p.portionId,
      sequence: p.sequence,
      targetCheckId: p.targetCheckId,
      amount: p.amount,
      applied: p.applied,
      createdAt: p.createdAt,
    })),
    adjustments: projection.adjustments.map((a) => ({
      adjustmentId: a.adjustmentId,
      portionId: a.portionId,
      amount: a.amount,
      direction: a.direction,
      createdAt: a.createdAt,
    })),
    reversals: projection.reversals.map((r) => ({
      reversalId: r.reversalId,
      reversedAmount: r.reversedAmount,
      createdAt: r.createdAt,
    })),
    responsibility: toMultiCheckAllocationResponsibilityDto(
      projection.responsibility
    ),
    timeline: toTimelineEntries(projection),
    createdAt: projection.createdAt,
    updatedAt: projection.updatedAt,
    projection: toMultiCheckAllocationProjectionMetaDto(projection),
  };
}

export function toMultiCheckAllocationDtoList(
  projections: readonly MultiCheckAllocationProjection[]
): readonly MultiCheckAllocationDto[] {
  return projections.map(toMultiCheckAllocationDto);
}

export function toMultiCheckAllocationSummaryDto(
  projection: MultiCheckAllocationSummaryProjection
): MultiCheckAllocationSummaryDto {
  return {
    apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    allocationId: projection.allocationId,
    allocationReference: projection.allocationReference,
    financialReference: projection.financialReference,
    sourceCheckId: projection.sourceCheckId,
    sourcePaymentId: projection.sourcePaymentId,
    allocationStatus: projection.allocationStatus,
    financialResponsibility: projection.financialResponsibility,
    allocatedAmount: projection.allocatedAmount,
    remainingAmount: projection.remainingAmount,
    portionCount: projection.portionCount,
    adjustmentCount: projection.adjustmentCount,
    reversalCount: projection.reversalCount,
    cardinality: projection.cardinality,
    isTerminal: projection.isTerminal,
    isCompleted: projection.isCompleted,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: projection.createdAt,
    updatedAt: projection.updatedAt,
    projection: toMultiCheckAllocationProjectionMetaDto(projection),
  };
}

export function toMultiCheckAllocationSummaryDtoList(
  projections: readonly MultiCheckAllocationSummaryProjection[]
): readonly MultiCheckAllocationSummaryDto[] {
  return projections.map(toMultiCheckAllocationSummaryDto);
}

export function toMultiCheckAllocationTimelineDto(
  projection: MultiCheckAllocationProjection
): MultiCheckAllocationTimelineDto {
  return {
    apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
    restaurantId: projection.restaurantId,
    allocationId: projection.allocationId,
    entries: toTimelineEntries(projection),
    projection: toMultiCheckAllocationProjectionMetaDto(projection),
  };
}

export function toMultiCheckAllocationProjectionCatalogDto(): MultiCheckAllocationProjectionCatalogDto {
  return {
    apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
    apiContractId: MULTI_CHECK_ALLOCATION_API_CONTRACT_ID,
    projectionProgramId: MULTI_CHECK_ALLOCATION_PROJECTION_PROGRAM_ID,
    projectionId: MULTI_CHECK_ALLOCATION_PROJECTION_ID,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
  };
}

export function toMultiCheckAllocationCommandResultDto(input: {
  outcome: MultiCheckAllocationCommandResultDto["outcome"];
  allocation: MultiCheckAllocationDto | null;
}): MultiCheckAllocationCommandResultDto {
  return {
    apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
    outcome: input.outcome,
    allocation: input.allocation,
  };
}
