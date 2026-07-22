/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — domain event contracts only.
 * No bus, publishing, outbox, or persistence.
 * ADR-ARCH-021 compatible: pure facts for future claim/publish.
 */

import type {
  PaymentId,
  PaymentAttemptId,
  PaymentReference,
  FinancialReference,
  SplitPayment,
  SplitPaymentStatus,
  TenderMethod,
  TenderAllocationId,
  PaymentAllocationId,
} from "./splitPaymentContract";

export const SPLIT_PAYMENT_DOMAIN_EVENT_TYPES = [
  "PaymentCreated",
  "PaymentAuthorized",
  "PaymentCaptured",
  "PaymentApplied",
  "PaymentPartiallyApplied",
  "PaymentCancelled",
  "PaymentVoided",
  "PaymentRefunded",
  "PaymentFailed",
  "PaymentCompleted",
  "TenderAllocated",
  "OutstandingUpdated",
  "PaymentAttemptStarted",
  "PaymentAttemptSucceeded",
  "PaymentAttemptFailed",
  "PaymentAttemptCancelled",
] as const;

export type SplitPaymentDomainEventType =
  (typeof SPLIT_PAYMENT_DOMAIN_EVENT_TYPES)[number];

type SplitPaymentEventBase = Readonly<{
  eventType: SplitPaymentDomainEventType;
  restaurantId: number;
  checkId: number;
  paymentId: PaymentId;
  paymentReference: PaymentReference;
  financialReference: FinancialReference | null;
  occurredAt: string;
  status: SplitPaymentStatus;
}>;

export type PaymentCreated = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentCreated";
    amount: string;
  }>;

export type PaymentAuthorized = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentAuthorized";
    amount: string;
  }>;

export type PaymentCaptured = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentCaptured";
    amount: string;
  }>;

export type PaymentPartiallyApplied = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentPartiallyApplied";
    allocatedAmount: string;
    unallocatedAmount: string;
    allocationId: PaymentAllocationId;
  }>;

export type PaymentApplied = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentApplied";
    allocatedAmount: string;
  }>;

/** Payment Completion — value fully received/allocated at Payment level. Never Check settle. */
export type PaymentCompleted = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentCompleted";
    amount: string;
    impliesFinancialSettlement: false;
  }>;

export type PaymentCancelled = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentCancelled";
  }>;

export type PaymentVoided = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentVoided";
  }>;

export type PaymentRefunded = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentRefunded";
    refundedAmount: string;
  }>;

export type PaymentFailed = SplitPaymentEventBase &
  Readonly<{
    eventType: "PaymentFailed";
  }>;

export type TenderAllocated = SplitPaymentEventBase &
  Readonly<{
    eventType: "TenderAllocated";
    tenderAllocationId: TenderAllocationId;
    tenderId: string;
    amount: string;
    method: TenderMethod;
  }>;

export type OutstandingUpdated = Readonly<{
  eventType: "OutstandingUpdated";
  restaurantId: number;
  checkId: number;
  occurredAt: string;
  financialResponsibility: string;
  appliedPaymentValue: string;
  outstandingBalance: string;
  /** Correlating Payment when update follows a Payment command. */
  paymentId: PaymentId | null;
  financialReference: FinancialReference | null;
}>;

export type PaymentAttemptStarted = Readonly<{
  eventType: "PaymentAttemptStarted";
  restaurantId: number;
  checkId: number;
  attemptId: PaymentAttemptId;
  paymentId: PaymentId | null;
  amount: string;
  method: TenderMethod;
  occurredAt: string;
}>;

export type PaymentAttemptSucceeded = Readonly<{
  eventType: "PaymentAttemptSucceeded";
  restaurantId: number;
  checkId: number;
  attemptId: PaymentAttemptId;
  paymentId: PaymentId;
  amount: string;
  method: TenderMethod;
  occurredAt: string;
}>;

export type PaymentAttemptFailed = Readonly<{
  eventType: "PaymentAttemptFailed";
  restaurantId: number;
  checkId: number;
  attemptId: PaymentAttemptId;
  paymentId: PaymentId | null;
  amount: string;
  method: TenderMethod;
  occurredAt: string;
}>;

export type PaymentAttemptCancelled = Readonly<{
  eventType: "PaymentAttemptCancelled";
  restaurantId: number;
  checkId: number;
  attemptId: PaymentAttemptId;
  paymentId: PaymentId | null;
  occurredAt: string;
}>;

export type SplitPaymentDomainEvent =
  | PaymentCreated
  | PaymentAuthorized
  | PaymentCaptured
  | PaymentPartiallyApplied
  | PaymentApplied
  | PaymentCompleted
  | PaymentCancelled
  | PaymentVoided
  | PaymentRefunded
  | PaymentFailed
  | TenderAllocated
  | OutstandingUpdated
  | PaymentAttemptStarted
  | PaymentAttemptSucceeded
  | PaymentAttemptFailed
  | PaymentAttemptCancelled;

export function eventBaseFromPayment(
  payment: SplitPayment,
  eventType: SplitPaymentDomainEventType,
  occurredAt: string
): SplitPaymentEventBase {
  return {
    eventType,
    restaurantId: payment.restaurantId,
    checkId: payment.checkId,
    paymentId: payment.paymentId,
    paymentReference: payment.paymentReference,
    financialReference: payment.financialReference,
    occurredAt,
    status: payment.status,
  };
}
