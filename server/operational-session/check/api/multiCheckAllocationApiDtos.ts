/**
 * MULTI-CHECK-ALLOCATION-API-1 — API-safe DTOs.
 *
 * DTOs expose Presentation-stable contracts only.
 * No Domain / Persistence / event / internal revision contracts.
 *
 * ## API Versioning Governance
 *
 * - `apiContractVersion` versions the **API DTO contract**.
 * - `projection.projectionSchemaVersion` versions the **Projection schema**.
 * - These versions are **independent** and MUST NOT be equated by consumers.
 * - DTO evolution within a contract version MUST be **additive only**.
 * - Existing fields MUST NOT change semantic meaning within a contract version.
 * - Breaking changes REQUIRE a new `apiContractVersion` (new supported contract).
 * - Consumers MUST NOT infer Projection internals from DTO structure or field layout.
 * - Internal Allocation / persistence revisions are NOT exposed on DTOs.
 * - Backward compatibility MUST be preserved for the supported API lifecycle.
 */

import { MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION } from "@shared/operational-session";

/**
 * Multi Check Allocation API contract version.
 * Independent of ProjectionSchemaVersion. Bump only for breaking DTO changes.
 */
export const MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION = 1 as const;

/** Stable identifier for this API contract family. */
export const MULTI_CHECK_ALLOCATION_API_CONTRACT_ID = "MCA-API-01" as const;

/** Projection freshness metadata — not an API contract version. */
export type MultiCheckAllocationProjectionMetaDto = Readonly<{
  projectionId: string;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectedAt: string;
}>;

export type MultiCheckAllocationTimelineEntryDto = Readonly<{
  kind: string;
  id: string;
  amount: string;
  at: string;
  sourceCheckId: number | null;
  targetCheckId: number | null;
  portionId: string | null;
  direction: "increase" | "decrease" | null;
}>;

export type MultiCheckAllocationSourceDto = Readonly<{
  sourceCheckId: number;
  sourcePaymentId: string | null;
  financialReference: string | null;
  responsibilityAmount: string;
}>;

export type MultiCheckAllocationTargetDto = Readonly<{
  targetCheckId: number;
  portionId: string;
  amount: string;
  applied: boolean;
}>;

export type MultiCheckAllocationPortionDto = Readonly<{
  portionId: string;
  sequence: number;
  targetCheckId: number;
  amount: string;
  applied: boolean;
  createdAt: string;
}>;

export type MultiCheckAllocationAdjustmentDto = Readonly<{
  adjustmentId: string;
  portionId: string | null;
  amount: string;
  direction: "increase" | "decrease";
  createdAt: string;
}>;

export type MultiCheckAllocationReversalDto = Readonly<{
  reversalId: string;
  reversedAmount: string;
  createdAt: string;
}>;

export type MultiCheckAllocationResponsibilityDto = Readonly<{
  apiContractVersion: typeof MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION;
  restaurantId: number;
  allocationId: string;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  financialReference: string | null;
  projection: MultiCheckAllocationProjectionMetaDto;
}>;

/** Canonical Allocation read response (API contract v1). */
export type MultiCheckAllocationDto = Readonly<{
  apiContractVersion: typeof MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION;
  restaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  sourcePaymentId: string | null;
  allocationStatus: string;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  paymentValueCap: string | null;
  isPending: boolean;
  isReserved: boolean;
  isApplied: boolean;
  isAdjusted: boolean;
  isReversed: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isTerminal: boolean;
  isSuccessTerminal: boolean;
  impliesCheckSettlement: false;
  impliesPaymentCompletion: false;
  cardinality: string;
  sourceCount: number;
  portionCount: number;
  adjustmentCount: number;
  reversalCount: number;
  targetCheckIds: readonly number[];
  sources: readonly MultiCheckAllocationSourceDto[];
  targets: readonly MultiCheckAllocationTargetDto[];
  portions: readonly MultiCheckAllocationPortionDto[];
  adjustments: readonly MultiCheckAllocationAdjustmentDto[];
  reversals: readonly MultiCheckAllocationReversalDto[];
  responsibility: MultiCheckAllocationResponsibilityDto;
  timeline: readonly MultiCheckAllocationTimelineEntryDto[];
  createdAt: string;
  updatedAt: string;
  projection: MultiCheckAllocationProjectionMetaDto;
}>;

export type MultiCheckAllocationSummaryDto = Readonly<{
  apiContractVersion: typeof MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION;
  restaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  sourcePaymentId: string | null;
  allocationStatus: string;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  portionCount: number;
  adjustmentCount: number;
  reversalCount: number;
  cardinality: string;
  isTerminal: boolean;
  isCompleted: boolean;
  impliesCheckSettlement: false;
  impliesPaymentCompletion: false;
  createdAt: string;
  updatedAt: string;
  projection: MultiCheckAllocationProjectionMetaDto;
}>;

export type MultiCheckAllocationTimelineDto = Readonly<{
  apiContractVersion: typeof MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION;
  restaurantId: number;
  allocationId: string;
  entries: readonly MultiCheckAllocationTimelineEntryDto[];
  projection: MultiCheckAllocationProjectionMetaDto;
}>;

export type MultiCheckAllocationProjectionCatalogDto = Readonly<{
  apiContractVersion: typeof MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION;
  apiContractId: typeof MULTI_CHECK_ALLOCATION_API_CONTRACT_ID;
  projectionProgramId: string;
  projectionId: string;
  projectionSchemaVersion: typeof MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION;
}>;

/**
 * Canonical write command result.
 * Outcome preserves ADR-021 idempotent command semantics.
 * Allocation payload is Projection-backed when available.
 */
export type MultiCheckAllocationCommandResultDto = Readonly<{
  apiContractVersion: typeof MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION;
  outcome: "applied" | "already_applied" | "no_change";
  allocation: MultiCheckAllocationDto | null;
}>;
