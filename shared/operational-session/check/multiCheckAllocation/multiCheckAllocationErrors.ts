/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — canonical domain errors.
 */

export type MultiCheckAllocationErrorCode =
  | "ALLOCATION_EXCEEDED"
  | "INVALID_ALLOCATION_STATE"
  | "INVALID_ALLOCATION_TRANSITION"
  | "ILLEGAL_TERMINAL_TRANSITION"
  | "ALLOCATION_ALREADY_COMPLETED"
  | "ALLOCATION_ALREADY_CANCELLED"
  | "ALLOCATION_ALREADY_REVERSED"
  | "FINANCIAL_CONSERVATION_VIOLATION"
  | "NEGATIVE_RESPONSIBILITY"
  | "INVALID_MONEY_AMOUNT"
  | "IDENTITY_VIOLATION"
  | "DUPLICATE_IDENTITY"
  | "FINALITY_VIOLATION"
  | "PAYMENT_VALUE_EXCEEDED"
  | "ORDER_SETTLEMENT_OWNERSHIP_VIOLATION";

export class MultiCheckAllocationDomainError extends Error {
  readonly code: MultiCheckAllocationErrorCode;

  constructor(code: MultiCheckAllocationErrorCode, message: string) {
    super(message);
    this.name = "MultiCheckAllocationDomainError";
    this.code = code;
  }
}

export class AllocationExceededError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("ALLOCATION_EXCEEDED", message);
    this.name = "AllocationExceededError";
  }
}

export class InvalidAllocationStateError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("INVALID_ALLOCATION_STATE", message);
    this.name = "InvalidAllocationStateError";
  }
}

export class InvalidAllocationTransitionError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("INVALID_ALLOCATION_TRANSITION", message);
    this.name = "InvalidAllocationTransitionError";
  }
}

export class IllegalTerminalTransitionError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("ILLEGAL_TERMINAL_TRANSITION", message);
    this.name = "IllegalTerminalTransitionError";
  }
}

export class AllocationAlreadyCompletedError extends MultiCheckAllocationDomainError {
  constructor(message = "Allocation already completed") {
    super("ALLOCATION_ALREADY_COMPLETED", message);
    this.name = "AllocationAlreadyCompletedError";
  }
}

export class AllocationAlreadyCancelledError extends MultiCheckAllocationDomainError {
  constructor(message = "Allocation already cancelled") {
    super("ALLOCATION_ALREADY_CANCELLED", message);
    this.name = "AllocationAlreadyCancelledError";
  }
}

export class AllocationAlreadyReversedError extends MultiCheckAllocationDomainError {
  constructor(message = "Allocation already reversed") {
    super("ALLOCATION_ALREADY_REVERSED", message);
    this.name = "AllocationAlreadyReversedError";
  }
}

export class FinancialConservationViolationError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("FINANCIAL_CONSERVATION_VIOLATION", message);
    this.name = "FinancialConservationViolationError";
  }
}

export class NegativeResponsibilityError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("NEGATIVE_RESPONSIBILITY", message);
    this.name = "NegativeResponsibilityError";
  }
}

export class InvalidMoneyAmountError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("INVALID_MONEY_AMOUNT", message);
    this.name = "InvalidMoneyAmountError";
  }
}

export class IdentityViolationError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("IDENTITY_VIOLATION", message);
    this.name = "IdentityViolationError";
  }
}

export class DuplicateIdentityError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("DUPLICATE_IDENTITY", message);
    this.name = "DuplicateIdentityError";
  }
}

export class FinalityViolationError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("FINALITY_VIOLATION", message);
    this.name = "FinalityViolationError";
  }
}

export class PaymentValueExceededError extends MultiCheckAllocationDomainError {
  constructor(message: string) {
    super("PAYMENT_VALUE_EXCEEDED", message);
    this.name = "PaymentValueExceededError";
  }
}

export class OrderSettlementOwnershipViolationError extends MultiCheckAllocationDomainError {
  constructor(
    message = "Allocation must never own or mutate Order Settlement directly"
  ) {
    super("ORDER_SETTLEMENT_OWNERSHIP_VIOLATION", message);
    this.name = "OrderSettlementOwnershipViolationError";
  }
}
