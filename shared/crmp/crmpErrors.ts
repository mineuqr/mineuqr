/**
 * CRMP-IMPLEMENTATION-1 / ADR-ARCH-028 — domain errors.
 */

export type CrmpErrorCode =
  | "INVARIANT_VIOLATION"
  | "INVALID_TRANSITION"
  | "IMMUTABILITY_VIOLATION"
  | "TENANT_ISOLATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION";

export class CrmpDomainError extends Error {
  readonly code: CrmpErrorCode;

  constructor(code: CrmpErrorCode, message: string) {
    super(message);
    this.name = "CrmpDomainError";
    this.code = code;
  }
}

export class CrmpInvariantError extends CrmpDomainError {
  constructor(message: string) {
    super("INVARIANT_VIOLATION", message);
    this.name = "CrmpInvariantError";
  }
}

export class CrmpInvalidTransitionError extends CrmpDomainError {
  constructor(message: string) {
    super("INVALID_TRANSITION", message);
    this.name = "CrmpInvalidTransitionError";
  }
}

export class CrmpImmutabilityError extends CrmpDomainError {
  constructor(message: string) {
    super("IMMUTABILITY_VIOLATION", message);
    this.name = "CrmpImmutabilityError";
  }
}

export class CrmpConflictError extends CrmpDomainError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "CrmpConflictError";
  }
}

export class CrmpValidationError extends CrmpDomainError {
  constructor(message: string) {
    super("VALIDATION", message);
    this.name = "CrmpValidationError";
  }
}

export class CrmpNotFoundError extends CrmpDomainError {
  constructor(message: string) {
    super("NOT_FOUND", message);
    this.name = "CrmpNotFoundError";
  }
}
