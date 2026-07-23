/**
 * ADR-ARCH-026 / SETTLEMENT-RECORD-IMPLEMENTATION-1 — domain errors.
 */

export type SettlementRecordErrorCode =
  | "IDENTITY_VIOLATION"
  | "DUPLICATE_RECORD"
  | "INVARIANT_VIOLATION"
  | "TENANT_ISOLATION"
  | "IMMUTABILITY_VIOLATION"
  | "SNAPSHOT_INTEGRITY"
  | "MONETARY_CONSISTENCY"
  | "UNSUPPORTED_OPERATION";

export class SettlementRecordDomainError extends Error {
  readonly code: SettlementRecordErrorCode;

  constructor(code: SettlementRecordErrorCode, message: string) {
    super(message);
    this.name = "SettlementRecordDomainError";
    this.code = code;
  }
}

export class IdentityViolationError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("IDENTITY_VIOLATION", message);
    this.name = "IdentityViolationError";
  }
}

export class DuplicateSettlementRecordError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("DUPLICATE_RECORD", message);
    this.name = "DuplicateSettlementRecordError";
  }
}

export class SettlementRecordInvariantError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("INVARIANT_VIOLATION", message);
    this.name = "SettlementRecordInvariantError";
  }
}

export class TenantIsolationError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("TENANT_ISOLATION", message);
    this.name = "TenantIsolationError";
  }
}

export class ImmutabilityViolationError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("IMMUTABILITY_VIOLATION", message);
    this.name = "ImmutabilityViolationError";
  }
}

export class SnapshotIntegrityError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("SNAPSHOT_INTEGRITY", message);
    this.name = "SnapshotIntegrityError";
  }
}

export class MonetaryConsistencyError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("MONETARY_CONSISTENCY", message);
    this.name = "MonetaryConsistencyError";
  }
}

export class UnsupportedSettlementRecordOperationError extends SettlementRecordDomainError {
  constructor(message: string) {
    super("UNSUPPORTED_OPERATION", message);
    this.name = "UnsupportedSettlementRecordOperationError";
  }
}
