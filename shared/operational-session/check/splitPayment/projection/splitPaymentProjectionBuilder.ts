/**
 * SPLIT-PAYMENT-PROJECTION-1 — deterministic projection builders.
 *
 * Source: committed Split Payment Write Model only.
 * Does NOT calculate money, validate invariants, or own lifecycle.
 */

import {
  isSplitPaymentTerminalStatus,
  isValueReceivedStatus,
  type CheckFinancialResponsibility,
  type PaymentAttempt,
  type SplitPayment,
} from "../splitPaymentContract";
import type { SplitPaymentDomainEvent } from "../splitPaymentEvents";
import {
  SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
  type SplitPaymentAttemptProjection,
  type SplitPaymentOutstandingProjection,
  type SplitPaymentProjection,
  type SplitPaymentProjectionEventClaimKey,
  type SplitPaymentProjectionTimelineEntry,
} from "./splitPaymentProjectionContract";

/**
 * Deterministic revision from committed Write Model fields.
 * Identical Write Model ⇒ identical revision (ADR-021 replay safe).
 */
export function buildSplitPaymentProjectionRevision(
  payment: SplitPayment
): string {
  return [
    `v${SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION}`,
    payment.restaurantId,
    payment.checkId,
    payment.paymentId,
    payment.paymentReference,
    payment.financialReference ?? "",
    payment.status,
    payment.amount,
    payment.allocatedAmount,
    payment.unallocatedAmount,
    payment.tenders.length,
    payment.tenderAllocations.length,
    payment.allocations.length,
    payment.updatedAt,
  ].join("|");
}

export function buildSplitPaymentOutstandingProjectionRevision(
  outstanding: CheckFinancialResponsibility
): string {
  return [
    `v${SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION}`,
    outstanding.restaurantId,
    outstanding.checkId,
    outstanding.financialResponsibility,
    outstanding.appliedPaymentValue,
    outstanding.outstandingBalance,
  ].join("|");
}

export function buildSplitPaymentAttemptProjectionRevision(
  attempt: PaymentAttempt
): string {
  return [
    `v${SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION}`,
    attempt.restaurantId,
    attempt.checkId,
    attempt.attemptId,
    attempt.paymentId ?? "",
    attempt.status,
    attempt.amount,
    attempt.method,
    attempt.updatedAt,
  ].join("|");
}

function statusFlags(status: SplitPayment["status"]) {
  return {
    isPending: status === "pending",
    isAuthorized: status === "authorized",
    isCaptured: status === "captured",
    isPartiallyApplied: status === "partially_applied",
    isApplied: status === "applied",
    isCancelled: status === "cancelled",
    isVoided: status === "voided",
    isRefunded: status === "refunded",
    isFailed: status === "failed",
    isValueReceived: isValueReceivedStatus(status),
    isTerminal: isSplitPaymentTerminalStatus(status),
    isPaymentCompleted: status === "applied",
  };
}

function lastPaymentActivityAt(payment: SplitPayment): string | null {
  return payment.status === "pending" ? null : payment.updatedAt;
}

function buildTimeline(
  payment: SplitPayment
): readonly SplitPaymentProjectionTimelineEntry[] {
  const entries: SplitPaymentProjectionTimelineEntry[] = [];
  for (const t of payment.tenders) {
    entries.push({
      kind: "tender",
      id: t.tenderId,
      amount: t.amount,
      at: t.createdAt,
      method: t.method,
      orderId: null,
      tenderId: t.tenderId,
    });
  }
  for (const a of payment.tenderAllocations) {
    entries.push({
      kind: "tender_allocation",
      id: a.tenderAllocationId,
      amount: a.amount,
      at: a.createdAt,
      method: null,
      orderId: null,
      tenderId: a.tenderId,
    });
  }
  for (const a of payment.allocations) {
    entries.push({
      kind: "payment_allocation",
      id: a.allocationId,
      amount: a.amount,
      at: a.createdAt,
      method: null,
      orderId: a.orderId,
      tenderId: null,
    });
  }
  return entries.slice().sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Build the canonical Payment projection from a committed SplitPayment entity.
 */
export function buildSplitPaymentProjection(
  payment: SplitPayment,
  options?: { projectionTimestamp?: string }
): SplitPaymentProjection {
  const tenderMethods = [
    ...new Set(payment.tenders.map((t) => t.method)),
  ].sort();
  return {
    restaurantId: payment.restaurantId,
    checkId: payment.checkId,
    paymentId: payment.paymentId,
    paymentReference: payment.paymentReference,
    financialReference: payment.financialReference,
    paymentStatus: payment.status,
    amount: payment.amount,
    allocatedAmount: payment.allocatedAmount,
    unallocatedAmount: payment.unallocatedAmount,
    ...statusFlags(payment.status),
    impliesFinancialSettlement: false,
    isFinanciallyComplete: false,
    tenderMethods,
    tenderCount: payment.tenders.length,
    tenderAllocationCount: payment.tenderAllocations.length,
    allocationCount: payment.allocations.length,
    tenders: payment.tenders.map((t) => ({
      tenderId: t.tenderId,
      method: t.method,
      amount: t.amount,
      createdAt: t.createdAt,
    })),
    tenderAllocations: payment.tenderAllocations.map((a) => ({
      tenderAllocationId: a.tenderAllocationId,
      tenderId: a.tenderId,
      amount: a.amount,
      createdAt: a.createdAt,
    })),
    allocations: payment.allocations.map((a) => ({
      allocationId: a.allocationId,
      orderId: a.orderId,
      amount: a.amount,
      createdAt: a.createdAt,
    })),
    timeline: buildTimeline(payment),
    lastPaymentActivityAt: lastPaymentActivityAt(payment),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: buildSplitPaymentProjectionRevision(payment),
    projectionTimestamp: options?.projectionTimestamp ?? payment.updatedAt,
  };
}

export function buildSplitPaymentProjections(
  payments: readonly SplitPayment[],
  options?: { projectionTimestamp?: string }
): readonly SplitPaymentProjection[] {
  return payments
    .map((p) => buildSplitPaymentProjection(p, options))
    .slice()
    .sort((a, b) => {
      if (a.checkId !== b.checkId) return a.checkId - b.checkId;
      return a.paymentId < b.paymentId
        ? -1
        : a.paymentId > b.paymentId
          ? 1
          : 0;
    });
}

export function buildSplitPaymentOutstandingProjection(
  outstanding: CheckFinancialResponsibility,
  options?: { projectionTimestamp?: string }
): SplitPaymentOutstandingProjection {
  return {
    restaurantId: outstanding.restaurantId,
    checkId: outstanding.checkId,
    financialResponsibility: outstanding.financialResponsibility,
    appliedPaymentValue: outstanding.appliedPaymentValue,
    outstandingBalance: outstanding.outstandingBalance,
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision:
      buildSplitPaymentOutstandingProjectionRevision(outstanding),
    projectionTimestamp: options?.projectionTimestamp ?? "",
  };
}

export function buildSplitPaymentAttemptProjection(
  attempt: PaymentAttempt,
  options?: { projectionTimestamp?: string }
): SplitPaymentAttemptProjection {
  return {
    restaurantId: attempt.restaurantId,
    checkId: attempt.checkId,
    attemptId: attempt.attemptId,
    paymentId: attempt.paymentId,
    attemptStatus: attempt.status,
    amount: attempt.amount,
    method: attempt.method,
    isStarted: attempt.status === "started",
    isSucceeded: attempt.status === "succeeded",
    isFailed: attempt.status === "failed",
    isCancelled: attempt.status === "cancelled",
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: buildSplitPaymentAttemptProjectionRevision(attempt),
    projectionTimestamp: options?.projectionTimestamp ?? attempt.updatedAt,
  };
}

/**
 * Deterministic claim key for collected Domain Events (no bus).
 * Duplicate delivery of the same fact yields the same key.
 */
export function buildSplitPaymentProjectionEventClaimKey(
  event: SplitPaymentDomainEvent
): SplitPaymentProjectionEventClaimKey {
  if (event.eventType === "OutstandingUpdated") {
    return [
      event.eventType,
      event.restaurantId,
      event.checkId,
      event.paymentId ?? "",
      event.outstandingBalance,
      event.occurredAt,
    ].join("|");
  }
  if (
    event.eventType === "PaymentAttemptStarted" ||
    event.eventType === "PaymentAttemptSucceeded" ||
    event.eventType === "PaymentAttemptFailed" ||
    event.eventType === "PaymentAttemptCancelled"
  ) {
    return [
      event.eventType,
      event.restaurantId,
      event.checkId,
      event.attemptId,
      event.paymentId ?? "",
      event.occurredAt,
    ].join("|");
  }
  if ("status" in event && "paymentId" in event) {
    const allocationId =
      "allocationId" in event && typeof event.allocationId === "string"
        ? event.allocationId
        : "";
    const tenderAllocationId =
      "tenderAllocationId" in event &&
      typeof event.tenderAllocationId === "string"
        ? event.tenderAllocationId
        : "";
  return [
    event.eventType,
    event.restaurantId,
    event.checkId,
    event.paymentId,
    event.status,
    allocationId,
    tenderAllocationId,
    event.occurredAt,
  ].join("|");
  }
  const exhaustive: never = event;
  void exhaustive;
  return "";
}
