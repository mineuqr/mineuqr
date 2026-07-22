/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — canonical domain errors.
 */

export type SplitPaymentErrorCode =
  | "INVALID_PAYMENT_STATE"
  | "ALLOCATION_EXCEEDED"
  | "OUTSTANDING_NEGATIVE"
  | "TENDER_MISMATCH"
  | "PAYMENT_ALREADY_COMPLETED"
  | "PAYMENT_ALREADY_CANCELLED"
  | "PAYMENT_ALREADY_VOIDED"
  | "INVALID_TRANSITION"
  | "ILLEGAL_TERMINAL_TRANSITION"
  | "FINANCIAL_CONSERVATION_VIOLATION"
  | "INVALID_MONEY_AMOUNT"
  | "PAYMENT_EXCEEDS_OUTSTANDING"
  | "IDENTITY_VIOLATION"
  | "FINALITY_VIOLATION"
  | "DUPLICATE_IDENTITY";

export class SplitPaymentDomainError extends Error {
  readonly code: SplitPaymentErrorCode;

  constructor(code: SplitPaymentErrorCode, message: string) {
    super(message);
    this.name = "SplitPaymentDomainError";
    this.code = code;
  }
}

export class InvalidPaymentStateError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("INVALID_PAYMENT_STATE", message);
    this.name = "InvalidPaymentStateError";
  }
}

export class AllocationExceededError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("ALLOCATION_EXCEEDED", message);
    this.name = "AllocationExceededError";
  }
}

export class OutstandingNegativeError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("OUTSTANDING_NEGATIVE", message);
    this.name = "OutstandingNegativeError";
  }
}

export class TenderMismatchError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("TENDER_MISMATCH", message);
    this.name = "TenderMismatchError";
  }
}

export class PaymentAlreadyCompletedError extends SplitPaymentDomainError {
  constructor(message = "Payment already completed (applied)") {
    super("PAYMENT_ALREADY_COMPLETED", message);
    this.name = "PaymentAlreadyCompletedError";
  }
}

export class PaymentAlreadyCancelledError extends SplitPaymentDomainError {
  constructor(message = "Payment already cancelled") {
    super("PAYMENT_ALREADY_CANCELLED", message);
    this.name = "PaymentAlreadyCancelledError";
  }
}

export class PaymentAlreadyVoidedError extends SplitPaymentDomainError {
  constructor(message = "Payment already voided") {
    super("PAYMENT_ALREADY_VOIDED", message);
    this.name = "PaymentAlreadyVoidedError";
  }
}

export class InvalidTransitionError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("INVALID_TRANSITION", message);
    this.name = "InvalidTransitionError";
  }
}

export class IllegalTerminalTransitionError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("ILLEGAL_TERMINAL_TRANSITION", message);
    this.name = "IllegalTerminalTransitionError";
  }
}

export class FinancialConservationViolationError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("FINANCIAL_CONSERVATION_VIOLATION", message);
    this.name = "FinancialConservationViolationError";
  }
}

export class InvalidMoneyAmountError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("INVALID_MONEY_AMOUNT", message);
    this.name = "InvalidMoneyAmountError";
  }
}

export class PaymentExceedsOutstandingError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("PAYMENT_EXCEEDS_OUTSTANDING", message);
    this.name = "PaymentExceedsOutstandingError";
  }
}

export class IdentityViolationError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("IDENTITY_VIOLATION", message);
    this.name = "IdentityViolationError";
  }
}

export class FinalityViolationError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("FINALITY_VIOLATION", message);
    this.name = "FinalityViolationError";
  }
}

export class DuplicateIdentityError extends SplitPaymentDomainError {
  constructor(message: string) {
    super("DUPLICATE_IDENTITY", message);
    this.name = "DuplicateIdentityError";
  }
}
