/**
 * REFUND-DOMAIN-IMPLEMENTATION-1 — pure Refund Platform domain barrel.
 * ADR-ARCH-032 · Check-owned FSP capability · NOT an Aggregate Root · no persistence.
 */

export {
  REFUND_PROGRAM_ID,
  REFUND_ADR_ID,
  REFUND_STATUSES,
  REFUND_TERMINAL_STATUSES,
  type RefundStatus,
  type RefundTerminalStatus,
  type RefundId,
  type RefundReference,
  type RefundIdentity,
  type RefundAllocation,
  type RefundReferenceLink,
  type RefundReverseSnapshot,
  type Refund,
  type RefundBudget,
} from "./refundContract";

export {
  RefundDomainError,
  InvalidRefundMoneyError,
  RefundBudgetExceededError,
  RefundBudgetNegativeError,
  NoPriorSettlementError,
  CheckNotRefundableError,
  RefundTenantIsolationError,
  RefundIdentityViolationError,
  DuplicateRefundError,
  RefundAllocationOverflowError,
  InvalidRefundStateError,
  RefundInvariantViolationError,
  AlreadyRefundedError,
  ConcurrentRefundGenerationError,
  type RefundErrorCode,
} from "./refundErrors";

export {
  parseRefundMoney,
  formatRefundMoney,
  refundMoneyEquals,
  refundMoneyAdd,
  refundMoneySub,
  refundMoneyLessOrEqual,
  refundMoneyGreaterThan,
  assertPositiveRefundAmount,
} from "./refundMoney";

export {
  assertRefundId,
  assertRefundReference,
  assertRefundIdentity,
  assertTenantMatch,
  buildRefundId,
  buildRefundReference,
  buildRefundEventClaimKey,
  assertUniqueRefundId,
} from "./refundIdentity";

export {
  getAllowedRefundTransitions,
  isRefundTransitionAllowed,
  assertRefundTransitionAllowed,
  isRefundTerminal,
} from "./refundLifecycle";

export {
  assertRefundValid,
  assertAllocationsWithinRefund,
  assertRefundWithinBudget,
  assertCheckOutcomeRefundable,
  assertNotReopenCheck,
} from "./refundInvariants";

export {
  calculateRefundBudget,
  buildRefundReverseSnapshot,
} from "./refundBudget";

export {
  allocateRefundAcrossTenders,
  buildRefundPaymentSnapshotLines,
} from "./refundTenderAllocation";

export type { RefundOriginalTaxBasis } from "./refundTaxSnapshot";

export {
  REFUND_CF_ANCHOR_PROGRAM_ID,
  resolveRefundOriginalSaleAnchor,
  isCollectionFactRefundAnchor,
  AmbiguousRefundOriginalSaleError,
  type RefundOriginalSaleAnchorKind,
  type RefundProductionFactCandidate,
  type CollectionFactRefundAnchor,
  type LegacySettlementRefundAnchor,
  type RefundOriginalSaleAnchor,
} from "./refundOriginalSaleAnchor";

export {
  REFUND_DOMAIN_EVENT_TYPES,
  buildRefundRequestedEvent,
  buildRefundValidatedEvent,
  buildRefundAppliedEvent,
  buildRefundSettlementRecordPublishedEvent,
  buildRefundCompletedEvent,
  buildRefundAllocationCreatedEvent,
  type RefundDomainEventType,
  type RefundDomainEvent,
  type RefundRequested,
  type RefundValidated,
  type RefundApplied,
  type RefundSettlementRecordPublished,
  type RefundCompleted,
  type RefundAllocationCreated,
} from "./refundEvents";

export {
  requestRefund,
  validateRefund,
  applyRefund,
  publishCompensatingSettlementRecord,
  completeRefund,
  executeRefundOnCheck,
  type RefundCommandOutcome,
  type RefundCommandResult,
  type RequestRefundCommand,
  type ValidateRefundCommand,
  type ApplyRefundCommand,
  type PublishCompensatingSettlementRecordCommand,
  type PublishCompensatingSettlementRecordResult,
  type CompleteRefundCommand,
  type ExecuteRefundOnCheckCommand,
  type ExecuteRefundOnCheckResult,
} from "./refundCommands";
