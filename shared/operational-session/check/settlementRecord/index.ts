/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — pure Settlement Record domain barrel.
 * ADR-ARCH-026 · Immutable Canonical Financial Document · NOT an Aggregate Root.
 * Produced by Check Aggregate. Never calculates money. Append-only.
 */

export {
  SETTLEMENT_RECORD_PROGRAM_ID,
  SETTLEMENT_RECORD_ADR_ID,
  SETTLEMENT_RECORD_SCHEMA_VERSION,
  SETTLEMENT_RECORD_PRODUCER,
  SETTLEMENT_RECORD_KINDS,
  isSettlementRecordKind,
  assertSettlementRecordKind,
  type SettlementRecordKind,
  type SettlementRecordId,
  type SettlementFinancialReference,
  type SettlementPaymentSnapshotLine,
  type SettlementOrderRef,
  type SettlementOrderSettlementRef,
  type SettlementRecord,
  type SettlementRecordIdentity,
} from "./settlementRecordContract";

export {
  SettlementRecordDomainError,
  IdentityViolationError,
  DuplicateSettlementRecordError,
  SettlementRecordInvariantError,
  TenantIsolationError,
  ImmutabilityViolationError,
  SnapshotIntegrityError,
  MonetaryConsistencyError,
  UnsupportedSettlementRecordOperationError,
  type SettlementRecordErrorCode,
} from "./settlementRecordErrors";

export {
  assertSettlementRecordId,
  assertFinancialReference,
  assertRecordGeneration,
  assertCheckId,
  assertRestaurantId,
  assertSettlementRecordIdentity,
  buildSettlementRecordId,
  buildSettlementFinancialReference,
  buildSettlementRecordEventClaimKey,
  assertUniqueBusinessIdentity,
} from "./settlementRecordIdentity";

export {
  assertTenantIsolation,
  assertNotMonetaryAuthority,
  assertNeverCalculatesMoney,
  assertAppendOnly,
  assertCompensatingRequiresPrior,
  assertTerminalOutcome,
  assertMonetaryConsistencyWithCheck,
  assertSettlementRecordValid,
  forbidSettlementRecordMutation,
} from "./settlementRecordInvariants";

export {
  copyPaymentSnapshotFromTransactions,
  buildSettlementRecordSnapshot,
  recordKindForCheckOutcome,
  freezeBusinessDayFromTimestamp,
  type SettlementRecordSnapshotSource,
} from "./settlementRecordSnapshot";

export {
  SETTLEMENT_RECORD_DOMAIN_EVENT_TYPES,
  buildSettlementRecordCreatedEvent,
  type SettlementRecordDomainEventType,
  type SettlementRecordDomainEvent,
  type SettlementRecordCreated,
  type SettlementRecordRefunded,
  type SettlementRecordVoided,
  type SettlementRecordCorrected,
} from "./settlementRecordEvents";

export {
  createSettlementRecord,
  createCompensatingSettlementRecord,
  type SettlementRecordCommandOutcome,
  type SettlementRecordCommandResult,
  type CreateSettlementRecordCommand,
  type CreateCompensatingSettlementRecordCommand,
} from "./settlementRecordCommands";
