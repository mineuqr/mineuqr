/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — domain errors.
 */

export type RefundErrorCode =
  | "INVALID_MONEY"
  | "BUDGET_EXCEEDED"
  | "BUDGET_NEGATIVE"
  | "NO_PRIOR_SETTLEMENT"
  | "CHECK_NOT_REFUNDABLE"
  | "TENANT_ISOLATION"
  | "IDENTITY_VIOLATION"
  | "DUPLICATE_REFUND"
  | "ALLOCATION_OVERFLOW"
  | "INVALID_STATE"
  | "INVARIANT_VIOLATION"
  | "IMMUTABILITY_VIOLATION"
  | "ALREADY_REFUNDED"
  | "CONCURRENT_GENERATION";

export class RefundDomainError extends Error {
  readonly code: RefundErrorCode;
  readonly invariantId: string | null;

  constructor(
    code: RefundErrorCode,
    message: string,
    invariantId: string | null = null
  ) {
    super(message);
    this.name = "RefundDomainError";
    this.code = code;
    this.invariantId = invariantId;
  }
}

export class InvalidRefundMoneyError extends RefundDomainError {
  constructor(message: string) {
    super("INVALID_MONEY", message, "RF-INV-F01");
    this.name = "InvalidRefundMoneyError";
  }
}

export class RefundBudgetExceededError extends RefundDomainError {
  constructor(message: string) {
    super("BUDGET_EXCEEDED", message, "RF-BUDGET-01");
    this.name = "RefundBudgetExceededError";
  }
}

export class RefundBudgetNegativeError extends RefundDomainError {
  constructor(message: string) {
    super("BUDGET_NEGATIVE", message, "RF-BUDGET-05");
    this.name = "RefundBudgetNegativeError";
  }
}

export class NoPriorSettlementError extends RefundDomainError {
  constructor(message: string) {
    super("NO_PRIOR_SETTLEMENT", message, "RF-INV-L01");
    this.name = "NoPriorSettlementError";
  }
}

export class CheckNotRefundableError extends RefundDomainError {
  constructor(message: string) {
    super("CHECK_NOT_REFUNDABLE", message, "RF-LAW-06");
    this.name = "CheckNotRefundableError";
  }
}

export class RefundTenantIsolationError extends RefundDomainError {
  constructor(message: string) {
    super("TENANT_ISOLATION", message, "RF-INV-TEN01");
    this.name = "RefundTenantIsolationError";
  }
}

export class RefundIdentityViolationError extends RefundDomainError {
  constructor(message: string) {
    super("IDENTITY_VIOLATION", message, "RF-INV-I04");
    this.name = "RefundIdentityViolationError";
  }
}

export class DuplicateRefundError extends RefundDomainError {
  constructor(message: string) {
    super("DUPLICATE_REFUND", message, "RF-INV-I02");
    this.name = "DuplicateRefundError";
  }
}

export class RefundAllocationOverflowError extends RefundDomainError {
  constructor(message: string) {
    super("ALLOCATION_OVERFLOW", message, "RF-INV-F02");
    this.name = "RefundAllocationOverflowError";
  }
}

export class InvalidRefundStateError extends RefundDomainError {
  constructor(message: string) {
    super("INVALID_STATE", message, "RF-INV-L01");
    this.name = "InvalidRefundStateError";
  }
}

export class RefundInvariantViolationError extends RefundDomainError {
  constructor(message: string, invariantId: string | null = "RF-INV") {
    super("INVARIANT_VIOLATION", message, invariantId);
    this.name = "RefundInvariantViolationError";
  }
}

export class AlreadyRefundedError extends RefundDomainError {
  constructor(message: string) {
    super("ALREADY_REFUNDED", message, "RF-BUDGET-01");
    this.name = "AlreadyRefundedError";
  }
}

export class ConcurrentRefundGenerationError extends RefundDomainError {
  constructor(message: string) {
    super("CONCURRENT_GENERATION", message, "RF-GEN-04");
    this.name = "ConcurrentRefundGenerationError";
  }
}
