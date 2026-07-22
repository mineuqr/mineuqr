/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — domain event contracts only.
 * No bus, publishing, outbox, or persistence.
 * ADR-ARCH-021 compatible: pure facts for future claim/publish.
 */

import type {
  AllocationAdjustmentId,
  AllocationId,
  AllocationPortionId,
  AllocationReference,
  AllocationReversalId,
  AllocationSequence,
  AllocationStatus,
  FinancialReference,
  MultiCheckAllocation,
  SourceCheckId,
  SourcePaymentId,
  TargetCheckId,
} from "./multiCheckAllocationContract";

export const MULTI_CHECK_ALLOCATION_DOMAIN_EVENT_TYPES = [
  "AllocationCreated",
  "AllocationReserved",
  "AllocationApplied",
  "AllocationAdjusted",
  "AllocationReversed",
  "AllocationCompleted",
  "AllocationCancelled",
  "AllocationResponsibilityTransferred",
  "AllocationOutstandingChanged",
] as const;

export type MultiCheckAllocationDomainEventType =
  (typeof MULTI_CHECK_ALLOCATION_DOMAIN_EVENT_TYPES)[number];

type AllocationEventBase = Readonly<{
  eventType: MultiCheckAllocationDomainEventType;
  restaurantId: number;
  allocationId: AllocationId;
  allocationReference: AllocationReference;
  financialReference: FinancialReference | null;
  sourceCheckId: SourceCheckId;
  sourcePaymentId: SourcePaymentId | null;
  occurredAt: string;
  status: AllocationStatus;
}>;

export type AllocationCreated = AllocationEventBase &
  Readonly<{
    eventType: "AllocationCreated";
    financialResponsibility: string;
    portionCount: number;
  }>;

export type AllocationReserved = AllocationEventBase &
  Readonly<{
    eventType: "AllocationReserved";
    reservedAmount: string;
  }>;

export type AllocationApplied = AllocationEventBase &
  Readonly<{
    eventType: "AllocationApplied";
    allocatedAmount: string;
    remainingAmount: string;
  }>;

export type AllocationAdjusted = AllocationEventBase &
  Readonly<{
    eventType: "AllocationAdjusted";
    adjustmentId: AllocationAdjustmentId;
    amount: string;
    direction: "increase" | "decrease";
    allocatedAmount: string;
    remainingAmount: string;
  }>;

export type AllocationReversed = AllocationEventBase &
  Readonly<{
    eventType: "AllocationReversed";
    reversalId: AllocationReversalId;
    reversedAmount: string;
  }>;

/** Allocation Completion — never Check settle / never Payment Completion. */
export type AllocationCompleted = AllocationEventBase &
  Readonly<{
    eventType: "AllocationCompleted";
    allocatedAmount: string;
    impliesCheckSettlement: false;
    impliesPaymentCompletion: false;
  }>;

export type AllocationCancelled = AllocationEventBase &
  Readonly<{
    eventType: "AllocationCancelled";
  }>;

export type AllocationResponsibilityTransferred = AllocationEventBase &
  Readonly<{
    eventType: "AllocationResponsibilityTransferred";
    portionId: AllocationPortionId;
    sequence: AllocationSequence;
    fromCheckId: SourceCheckId;
    toCheckId: TargetCheckId;
    amount: string;
  }>;

/**
 * Proposed Outstanding delta fact for a Check.
 * Domain does not own Outstanding — Check Aggregate applies the change.
 */
export type AllocationOutstandingChanged = AllocationEventBase &
  Readonly<{
    eventType: "AllocationOutstandingChanged";
    checkId: number;
    amount: string;
    direction: "decrease" | "increase";
  }>;

export type MultiCheckAllocationDomainEvent =
  | AllocationCreated
  | AllocationReserved
  | AllocationApplied
  | AllocationAdjusted
  | AllocationReversed
  | AllocationCompleted
  | AllocationCancelled
  | AllocationResponsibilityTransferred
  | AllocationOutstandingChanged;

export function eventBaseFromAllocation(
  allocation: MultiCheckAllocation,
  eventType: MultiCheckAllocationDomainEventType,
  occurredAt: string
): Omit<AllocationEventBase, "eventType"> & {
  eventType: MultiCheckAllocationDomainEventType;
} {
  return {
    eventType,
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    allocationReference: allocation.allocationReference,
    financialReference: allocation.financialReference,
    sourceCheckId: allocation.sourceCheckId,
    sourcePaymentId: allocation.sourcePaymentId,
    occurredAt,
    status: allocation.status,
  };
}
