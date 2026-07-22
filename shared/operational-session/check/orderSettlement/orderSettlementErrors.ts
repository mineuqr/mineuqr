/**
 * ADR-ARCH-022 / ORDER-SETTLEMENT-DOMAIN-1 — canonical domain errors.
 * No generic Error usage by callers — use these typed errors.
 */

export type OrderSettlementErrorCode =
  | "InvalidTransition"
  | "IllegalTerminalTransition"
  | "SettlementInvariantViolation"
  | "OutstandingAmountMismatch"
  | "SettlementOverflow"
  | "DuplicateSettlement"
  | "InvalidMoneyAmount"
  | "AllocationValidationFailed"
  | "CoverageValidationFailed";

export class OrderSettlementDomainError extends Error {
  readonly code: OrderSettlementErrorCode;
  readonly invariantId?: string;

  constructor(
    code: OrderSettlementErrorCode,
    message: string,
    options?: { invariantId?: string; cause?: unknown }
  ) {
    super(message);
    this.name = "OrderSettlementDomainError";
    this.code = code;
    this.invariantId = options?.invariantId;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class InvalidTransitionError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("InvalidTransition", message);
    this.name = "InvalidTransitionError";
  }
}

export class IllegalTerminalTransitionError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("IllegalTerminalTransition", message, { invariantId: "I-OS-14" });
    this.name = "IllegalTerminalTransitionError";
  }
}

export class SettlementInvariantViolationError extends OrderSettlementDomainError {
  constructor(invariantId: string, message: string) {
    super("SettlementInvariantViolation", message, { invariantId });
    this.name = "SettlementInvariantViolationError";
  }
}

export class OutstandingAmountMismatchError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("OutstandingAmountMismatch", message, { invariantId: "I-OS-03" });
    this.name = "OutstandingAmountMismatchError";
  }
}

export class SettlementOverflowError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("SettlementOverflow", message, { invariantId: "I-OS-04" });
    this.name = "SettlementOverflowError";
  }
}

export class DuplicateSettlementError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("DuplicateSettlement", message, { invariantId: "I-OS-01" });
    this.name = "DuplicateSettlementError";
  }
}

export class InvalidMoneyAmountError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("InvalidMoneyAmount", message);
    this.name = "InvalidMoneyAmountError";
  }
}

export class AllocationValidationFailedError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("AllocationValidationFailed", message);
    this.name = "AllocationValidationFailedError";
  }
}

export class CoverageValidationFailedError extends OrderSettlementDomainError {
  constructor(message: string) {
    super("CoverageValidationFailed", message);
    this.name = "CoverageValidationFailedError";
  }
}
