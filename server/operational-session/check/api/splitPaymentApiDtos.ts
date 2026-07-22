/**
 * SPLIT-PAYMENT-API-1 — API-safe Read DTOs.
 *
 * DTOs expose Projection-backed read fields only.
 * No Domain / Persistence / event contracts.
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
 * - Backward compatibility MUST be preserved for the supported API lifecycle.
 */

import { SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION } from "@shared/operational-session";

/**
 * Split Payment Read API contract version.
 * Independent of ProjectionSchemaVersion. Bump only for breaking DTO changes.
 */
export const SPLIT_PAYMENT_API_CONTRACT_VERSION = 1 as const;

/** Stable identifier for this API contract family. */
export const SPLIT_PAYMENT_API_CONTRACT_ID = "SP-API-01" as const;

/** Projection freshness metadata — not an API contract version. */
export type SplitPaymentProjectionMetaDto = Readonly<{
  projectionId: string;
  projectionSchemaVersion: typeof SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION;
  projectionRevision: string;
  projectedAt: string;
}>;

export type SplitPaymentTimelineEntryDto = Readonly<{
  kind: string;
  id: string;
  amount: string;
  at: string;
  method: string | null;
  orderId: number | null;
  tenderId: string | null;
}>;

export type SplitPaymentTenderBreakdownDto = Readonly<{
  tenderId: string;
  method: string;
  amount: string;
  createdAt: string;
}>;

export type SplitPaymentAllocationBreakdownDto = Readonly<{
  allocationId: string;
  orderId: number;
  amount: string;
  createdAt: string;
}>;

export type SplitPaymentTenderAllocationBreakdownDto = Readonly<{
  tenderAllocationId: string;
  tenderId: string;
  amount: string;
  createdAt: string;
}>;

/** Canonical Payment read response (API contract v1). */
export type SplitPaymentDto = Readonly<{
  apiContractVersion: typeof SPLIT_PAYMENT_API_CONTRACT_VERSION;
  restaurantId: number;
  checkId: number;
  paymentId: string;
  paymentReference: string;
  financialReference: string | null;
  paymentStatus: string;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  isPending: boolean;
  isAuthorized: boolean;
  isCaptured: boolean;
  isPartiallyApplied: boolean;
  isApplied: boolean;
  isCancelled: boolean;
  isVoided: boolean;
  isRefunded: boolean;
  isFailed: boolean;
  isValueReceived: boolean;
  isTerminal: boolean;
  isPaymentCompleted: boolean;
  impliesFinancialSettlement: false;
  isFinanciallyComplete: false;
  tenderMethods: readonly string[];
  tenderCount: number;
  tenderAllocationCount: number;
  allocationCount: number;
  tenders: readonly SplitPaymentTenderBreakdownDto[];
  tenderAllocations: readonly SplitPaymentTenderAllocationBreakdownDto[];
  allocations: readonly SplitPaymentAllocationBreakdownDto[];
  timeline: readonly SplitPaymentTimelineEntryDto[];
  lastPaymentActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  projection: SplitPaymentProjectionMetaDto;
}>;

export type SplitPaymentAttemptDto = Readonly<{
  apiContractVersion: typeof SPLIT_PAYMENT_API_CONTRACT_VERSION;
  restaurantId: number;
  checkId: number;
  attemptId: string;
  paymentId: string | null;
  attemptStatus: string;
  amount: string;
  method: string;
  isStarted: boolean;
  isSucceeded: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  createdAt: string;
  updatedAt: string;
  projection: SplitPaymentProjectionMetaDto;
}>;

export type SplitPaymentOutstandingDto = Readonly<{
  apiContractVersion: typeof SPLIT_PAYMENT_API_CONTRACT_VERSION;
  restaurantId: number;
  checkId: number;
  financialResponsibility: string;
  appliedPaymentValue: string;
  outstandingBalance: string;
  projection: SplitPaymentProjectionMetaDto;
}>;

/** Versioned timeline envelope — entries alone are not a complete contract. */
export type SplitPaymentTimelineDto = Readonly<{
  apiContractVersion: typeof SPLIT_PAYMENT_API_CONTRACT_VERSION;
  restaurantId: number;
  checkId: number;
  paymentId: string;
  entries: readonly SplitPaymentTimelineEntryDto[];
  projection: SplitPaymentProjectionMetaDto;
}>;

/**
 * Status-count summary from projected Payment rows only.
 * Does not sum or recalculate money amounts.
 */
export type SplitPaymentSummaryDto = Readonly<{
  apiContractVersion: typeof SPLIT_PAYMENT_API_CONTRACT_VERSION;
  restaurantId: number;
  checkId: number;
  totalCount: number;
  pendingCount: number;
  authorizedCount: number;
  capturedCount: number;
  partiallyAppliedCount: number;
  appliedCount: number;
  cancelledCount: number;
  voidedCount: number;
  refundedCount: number;
  failedCount: number;
  projection: Readonly<{
    projectionId: string;
    projectionSchemaVersion: typeof SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION;
    latestProjectionRevision: string | null;
  }>;
}>;

/**
 * Catalog metadata for consumers.
 * Exposes API contract version and Projection identity as independent fields.
 */
export type SplitPaymentProjectionCatalogDto = Readonly<{
  apiContractVersion: typeof SPLIT_PAYMENT_API_CONTRACT_VERSION;
  apiContractId: typeof SPLIT_PAYMENT_API_CONTRACT_ID;
  projectionId: string;
  projectionSchemaVersion: typeof SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION;
  programId: string;
}>;
