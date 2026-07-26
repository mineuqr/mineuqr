/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — domain event contracts.
 *
 * Collected facts only — no bus / outbox in this program (ADR-021 compatible).
 * Publisher: Check Aggregate / Refund Platform.
 */

import type { Refund } from "./refundContract";
import { buildRefundEventClaimKey } from "./refundIdentity";

export const REFUND_DOMAIN_EVENT_TYPES = [
  "RefundRequested",
  "RefundValidated",
  "RefundApplied",
  "RefundSettlementRecordPublished",
  "RefundCompleted",
  "RefundAllocationCreated",
] as const;

export type RefundDomainEventType = (typeof REFUND_DOMAIN_EVENT_TYPES)[number];

type RefundEventBase = Readonly<{
  eventType: RefundDomainEventType;
  restaurantId: number;
  checkId: number;
  refundId: string;
  occurredAt: string;
  /** ADR-021 business-fact claim key. */
  claimKey: string;
}>;

export type RefundRequested = RefundEventBase &
  Readonly<{
    eventType: "RefundRequested";
    amount: string;
  }>;

export type RefundValidated = RefundEventBase &
  Readonly<{
    eventType: "RefundValidated";
    refundableBalance: string;
    amount: string;
  }>;

export type RefundApplied = RefundEventBase &
  Readonly<{
    eventType: "RefundApplied";
    amount: string;
    recordGeneration: number;
    remainingBudget: string;
  }>;

export type RefundSettlementRecordPublished = RefundEventBase &
  Readonly<{
    eventType: "RefundSettlementRecordPublished";
    settlementRecordId: string;
    priorSettlementRecordId: string;
    recordGeneration: number;
    grandTotal: string;
  }>;

export type RefundCompleted = RefundEventBase &
  Readonly<{
    eventType: "RefundCompleted";
    amount: string;
    settlementRecordId: string | null;
  }>;

export type RefundAllocationCreated = RefundEventBase &
  Readonly<{
    eventType: "RefundAllocationCreated";
    allocationId: string;
    orderId: number | null;
    amount: string;
  }>;

export type RefundDomainEvent =
  | RefundRequested
  | RefundValidated
  | RefundApplied
  | RefundSettlementRecordPublished
  | RefundCompleted
  | RefundAllocationCreated;

function baseFromRefund(
  refund: Pick<Refund, "restaurantId" | "checkId" | "refundId">,
  eventType: RefundDomainEventType,
  occurredAt: string
): RefundEventBase {
  return {
    eventType,
    restaurantId: refund.restaurantId,
    checkId: refund.checkId,
    refundId: refund.refundId,
    occurredAt,
    claimKey: buildRefundEventClaimKey(refund),
  };
}

export function buildRefundRequestedEvent(
  refund: Refund,
  occurredAt: string
): RefundRequested {
  return {
    ...baseFromRefund(refund, "RefundRequested", occurredAt),
    eventType: "RefundRequested",
    amount: refund.amount,
  };
}

export function buildRefundValidatedEvent(
  refund: Refund,
  refundableBalance: string,
  occurredAt: string
): RefundValidated {
  return {
    ...baseFromRefund(refund, "RefundValidated", occurredAt),
    eventType: "RefundValidated",
    refundableBalance,
    amount: refund.amount,
  };
}

export function buildRefundAppliedEvent(
  refund: Refund,
  remainingBudget: string,
  occurredAt: string
): RefundApplied {
  return {
    ...baseFromRefund(refund, "RefundApplied", occurredAt),
    eventType: "RefundApplied",
    amount: refund.amount,
    recordGeneration: refund.recordGeneration ?? 0,
    remainingBudget,
  };
}

export function buildRefundSettlementRecordPublishedEvent(
  refund: Refund,
  input: {
    settlementRecordId: string;
    priorSettlementRecordId: string;
    recordGeneration: number;
    grandTotal: string;
    occurredAt: string;
  }
): RefundSettlementRecordPublished {
  return {
    ...baseFromRefund(refund, "RefundSettlementRecordPublished", input.occurredAt),
    eventType: "RefundSettlementRecordPublished",
    settlementRecordId: input.settlementRecordId,
    priorSettlementRecordId: input.priorSettlementRecordId,
    recordGeneration: input.recordGeneration,
    grandTotal: input.grandTotal,
  };
}

export function buildRefundCompletedEvent(
  refund: Refund,
  occurredAt: string
): RefundCompleted {
  return {
    ...baseFromRefund(refund, "RefundCompleted", occurredAt),
    eventType: "RefundCompleted",
    amount: refund.amount,
    settlementRecordId: refund.refundSettlementRecordId,
  };
}

export function buildRefundAllocationCreatedEvent(
  refund: Refund,
  allocation: { allocationId: string; orderId: number | null; amount: string },
  occurredAt: string
): RefundAllocationCreated {
  return {
    ...baseFromRefund(refund, "RefundAllocationCreated", occurredAt),
    eventType: "RefundAllocationCreated",
    allocationId: allocation.allocationId,
    orderId: allocation.orderId,
    amount: allocation.amount,
  };
}
