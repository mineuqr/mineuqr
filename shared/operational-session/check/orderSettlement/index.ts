/**
 * ORDER-SETTLEMENT-DOMAIN-1 — pure Order Settlement domain barrel.
 * ADR-ARCH-022 · Check-owned Entity · no persistence.
 */

export {
  ORDER_SETTLEMENT_PROGRAM_ID,
  ORDER_SETTLEMENT_ADR_ID,
  ORDER_SETTLEMENT_STATUSES,
  ORDER_SETTLEMENT_NON_TERMINAL_STATUSES,
  ORDER_SETTLEMENT_TERMINAL_STATUSES,
  isOrderSettlementStatus,
  assertOrderSettlementStatus,
  isOrderSettlementTerminalStatus,
  isOrderSettlementNonTerminalStatus,
  type OrderSettlementStatus,
  type OrderSettlementNonTerminalStatus,
  type OrderSettlementTerminalStatus,
  type OrderSettlement,
  type OrderSettlementMoneyAmounts,
  type OrderSettlementIdentity,
} from "./orderSettlementContract";

export {
  OrderSettlementDomainError,
  InvalidTransitionError,
  IllegalTerminalTransitionError,
  SettlementInvariantViolationError,
  OutstandingAmountMismatchError,
  SettlementOverflowError,
  DuplicateSettlementError,
  InvalidMoneyAmountError,
  AllocationValidationFailedError,
  CoverageValidationFailedError,
  type OrderSettlementErrorCode,
} from "./orderSettlementErrors";

export {
  parseOrderSettlementMoney,
  formatOrderSettlementMoney,
  moneyEquals,
  calculateOutstandingAmount,
  buildMoneyAmounts,
  assertOutstandingAlgebra,
  assertNoSettlementOverflow,
  assertAllocationValid,
  isFullySettled,
  isPartiallySettled,
  assertCoverageAmount,
  assertSnapshotsReconcileToOrdersSubtotal,
} from "./orderSettlementMoney";

export {
  getAllowedTransitions,
  isTransitionAllowed,
  assertTransitionAllowed,
  assertNonTerminal,
} from "./orderSettlementLifecycle";

export {
  ORDER_SETTLEMENT_DOMAIN_EVENT_TYPES,
  eventBaseFromSettlement,
  type OrderSettlementDomainEventType,
  type OrderSettlementDomainEvent,
  type OrderSettlementCreated,
  type OrderSettlementRecalculated,
  type OrderSettlementPartiallySettled,
  type OrderSettlementSettled,
  type OrderSettlementComplimentary,
  type OrderSettlementCancelled,
  type OrderSettlementVoided,
  type OrderSettlementRefunded,
} from "./orderSettlementEvents";

export {
  assertIdentityValid,
  assertUniqueIdentity,
  assertMembershipExistsAtCreate,
  assertMoneyInvariants,
  assertCheckOrdersSubtotalReconciles,
  assertSingleNonVoidContribution,
  assertPaidCheckConsistency,
  assertComplimentaryCheckConsistency,
  assertVoidedCheckConsistency,
  assertNotRevenueAuthority,
  assertTenantMatch,
  assertNoBusinessIdentityKey,
  assertNoTerminalRegression,
  assertOrderSettlementValid,
  type CheckOutcomeForOrderSettlement,
} from "./orderSettlementInvariants";

export {
  createOrderSettlement,
  recalculateOrderSettlement,
  applyPartialSettlement,
  applyFullSettlement,
  applyComplimentary,
  cancelOrderSettlement,
  voidOrderSettlement,
  refundOrderSettlement,
  type OrderSettlementCommandOutcome,
  type OrderSettlementCommandResult,
  type CreateOrderSettlementCommand,
  type RecalculateOrderSettlementCommand,
  type ApplyPartialSettlementCommand,
  type ApplyFullSettlementCommand,
  type ApplyComplimentaryCommand,
  type CancelOrderSettlementCommand,
  type VoidOrderSettlementCommand,
  type RefundOrderSettlementCommand,
} from "./orderSettlementCommands";
