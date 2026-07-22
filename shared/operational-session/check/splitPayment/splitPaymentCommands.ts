/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — pure domain commands.
 *
 * Deterministic. Framework-independent. ADR-ARCH-021 compatible:
 * - Duplicate / retry / repeated invocation → Applied | AlreadyApplied | NoChange
 * - No dependence on event order, transport, or duplicate delivery
 * - Returns explicit outcomes + event contracts for future integration
 *
 * Check Aggregate remains the only mutation authority at persistence/integration.
 * This module is pure: it transforms Payment state; it does not settle Checks.
 */

import type {
  PaymentAllocation,
  PaymentAttempt,
  PaymentPortion,
  SplitPayment,
  Tender,
  TenderAllocation,
  TenderMethod,
} from "./splitPaymentContract";
import {
  eventBaseFromPayment,
  type OutstandingUpdated,
  type SplitPaymentDomainEvent,
} from "./splitPaymentEvents";
import {
  InvalidPaymentStateError,
  PaymentAlreadyCancelledError,
  PaymentAlreadyCompletedError,
  PaymentAlreadyVoidedError,
} from "./splitPaymentErrors";
import {
  assertCreateInputs,
  assertPaymentFinality,
  assertPaymentIdentityStable,
  assertPaymentRespectsOutstanding,
  assertSplitPaymentValid,
} from "./splitPaymentInvariants";
import {
  assertAttemptTraceableToPayment,
  assertUniquePaymentAttemptId,
  assertPaymentAttemptId,
  assertTenderAllocationId,
} from "./splitPaymentIdentity";
import {
  assertNonTerminal,
  assertTransitionAllowed,
  canCancel,
  canRefund,
  canVoid,
} from "./splitPaymentLifecycle";
import {
  assertAllocationWithinPayment,
  assertTenderTotalsMatchPayment,
  buildCheckFinancialResponsibility,
  computeUnallocated,
  formatSplitPaymentMoney,
  moneyAdd,
  parseSplitPaymentMoney,
  sumTenderAmounts,
} from "./splitPaymentMoney";

/**
 * Explicit command outcome for ADR-021 idempotent integration.
 * - applied: state changed; events are new facts
 * - already_applied: no-op success; empty events (safe re-delivery)
 * - no_change: equivalent state; empty events (reorder-safe / noop)
 */
export type SplitPaymentCommandOutcome =
  | "applied"
  | "already_applied"
  | "no_change";

export type SplitPaymentCommandResult = Readonly<{
  outcome: SplitPaymentCommandOutcome;
  payment: SplitPayment;
  events: readonly SplitPaymentDomainEvent[];
}>;

export type PaymentAttemptCommandResult = Readonly<{
  outcome: SplitPaymentCommandOutcome;
  attempt: PaymentAttempt;
  payment: SplitPayment | null;
  events: readonly SplitPaymentDomainEvent[];
}>;

function touch(
  payment: SplitPayment,
  patch: Partial<SplitPayment>,
  at: string
): SplitPayment {
  const next: SplitPayment = {
    ...payment,
    ...patch,
    impliesFinancialSettlement: false,
    updatedAt: at,
  };
  assertPaymentIdentityStable(payment, next);
  assertSplitPaymentValid(next);
  assertPaymentFinality(next);
  return next;
}

function result(
  outcome: SplitPaymentCommandOutcome,
  payment: SplitPayment,
  events: readonly SplitPaymentDomainEvent[]
): SplitPaymentCommandResult {
  return { outcome, payment, events };
}

function already(payment: SplitPayment): SplitPaymentCommandResult {
  return result("already_applied", payment, []);
}

function noChange(payment: SplitPayment): SplitPaymentCommandResult {
  return result("no_change", payment, []);
}

function transition(
  payment: SplitPayment,
  to: SplitPayment["status"],
  at: string,
  patch: Partial<SplitPayment> = {}
): SplitPayment {
  assertTransitionAllowed(payment.status, to);
  return touch(payment, { ...patch, status: to }, at);
}

function outstandingEvent(
  input: {
    restaurantId: number;
    checkId: number;
    financialResponsibility: string;
    appliedPaymentValue: string;
    paymentId: string | null;
    financialReference: string | null;
    at: string;
  }
): OutstandingUpdated {
  const snap = buildCheckFinancialResponsibility({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    financialResponsibility: input.financialResponsibility,
    appliedPaymentValue: input.appliedPaymentValue,
  });
  return {
    eventType: "OutstandingUpdated",
    restaurantId: snap.restaurantId,
    checkId: snap.checkId,
    occurredAt: input.at,
    financialResponsibility: snap.financialResponsibility,
    appliedPaymentValue: snap.appliedPaymentValue,
    outstandingBalance: snap.outstandingBalance,
    paymentId: input.paymentId,
    financialReference: input.financialReference,
  };
}

// ─── Create ─────────────────────────────────────────────────────────

export type CreateSplitPaymentCommand = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: string;
  paymentReference: string;
  financialReference?: string | null;
  amount: string;
  /** Check restaurant for I-SP-08 */
  checkRestaurantId: number;
  /** Current outstanding — required when creating directly captured. */
  outstandingBalance: string;
  /**
   * Entry status: pending (default), or captured for cash-like immediate receive.
   * authorized also allowed for hold-first methods.
   */
  initialStatus?: "pending" | "authorized" | "captured";
  tenders?: readonly {
    tenderId: string;
    method: TenderMethod;
    amount: string;
  }[];
  existingPaymentIds?: readonly string[];
  at: string;
}>;

export function createSplitPayment(
  cmd: CreateSplitPaymentCommand
): SplitPaymentCommandResult {
  assertCreateInputs(cmd);

  const amount = formatSplitPaymentMoney(parseSplitPaymentMoney(cmd.amount));
  const initial = cmd.initialStatus ?? "pending";

  if (initial === "captured") {
    assertPaymentRespectsOutstanding(amount, cmd.outstandingBalance);
  }

  const tenders: Tender[] = (cmd.tenders ?? []).map((t) => ({
    tenderId: t.tenderId,
    restaurantId: cmd.restaurantId,
    checkId: cmd.checkId,
    paymentId: cmd.paymentId,
    method: t.method,
    amount: formatSplitPaymentMoney(parseSplitPaymentMoney(t.amount)),
    createdAt: cmd.at,
  }));
  assertTenderTotalsMatchPayment(amount, tenders);

  const payment: SplitPayment = {
    restaurantId: cmd.restaurantId,
    checkId: cmd.checkId,
    paymentId: cmd.paymentId,
    paymentReference: cmd.paymentReference,
    financialReference: cmd.financialReference ?? null,
    status: initial,
    amount,
    allocatedAmount: "0.00",
    unallocatedAmount: amount,
    tenders,
    tenderAllocations: [],
    allocations: [],
    impliesFinancialSettlement: false,
    createdAt: cmd.at,
    updatedAt: cmd.at,
  };
  assertSplitPaymentValid(payment);

  const events: SplitPaymentDomainEvent[] = [
    {
      ...eventBaseFromPayment(payment, "PaymentCreated", cmd.at),
      eventType: "PaymentCreated",
      amount,
    },
  ];
  if (initial === "authorized") {
    events.push({
      ...eventBaseFromPayment(payment, "PaymentAuthorized", cmd.at),
      eventType: "PaymentAuthorized",
      amount,
    });
  }
  if (initial === "captured") {
    events.push({
      ...eventBaseFromPayment(payment, "PaymentCaptured", cmd.at),
      eventType: "PaymentCaptured",
      amount,
    });
  }

  return result("applied", payment, events);
}

// ─── Authorize / Capture / Fail ─────────────────────────────────────

export type AuthorizePaymentCommand = Readonly<{
  payment: SplitPayment;
  at: string;
}>;

export function authorizePayment(
  cmd: AuthorizePaymentCommand
): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (payment.status === "authorized") return already(payment);
  if (payment.status === "captured" || payment.status === "partially_applied" || payment.status === "applied") {
    return noChange(payment);
  }
  if (payment.status === "cancelled") throw new PaymentAlreadyCancelledError();
  if (payment.status === "voided") throw new PaymentAlreadyVoidedError();
  if (payment.status === "failed") {
    throw new InvalidPaymentStateError("Cannot authorize a failed Payment");
  }

  const next = transition(payment, "authorized", at);
  return result("applied", next, [
    {
      ...eventBaseFromPayment(next, "PaymentAuthorized", at),
      eventType: "PaymentAuthorized",
      amount: next.amount,
    },
  ]);
}

export type CapturePaymentCommand = Readonly<{
  payment: SplitPayment;
  outstandingBalance: string;
  at: string;
  tenders?: readonly {
    tenderId: string;
    method: TenderMethod;
    amount: string;
  }[];
}>;

export function capturePayment(
  cmd: CapturePaymentCommand
): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (payment.status === "captured") return already(payment);
  if (
    payment.status === "partially_applied" ||
    payment.status === "applied"
  ) {
    return noChange(payment);
  }
  if (payment.status === "cancelled") throw new PaymentAlreadyCancelledError();
  if (payment.status === "voided") throw new PaymentAlreadyVoidedError();
  if (payment.status === "refunded") {
    throw new InvalidPaymentStateError("Cannot capture a refunded Payment");
  }
  if (payment.status === "failed") {
    throw new InvalidPaymentStateError("Cannot capture a failed Payment");
  }

  assertPaymentRespectsOutstanding(payment.amount, cmd.outstandingBalance);

  let tenders = payment.tenders;
  if (cmd.tenders && cmd.tenders.length > 0) {
    tenders = cmd.tenders.map((t) => ({
      tenderId: t.tenderId,
      restaurantId: payment.restaurantId,
      checkId: payment.checkId,
      paymentId: payment.paymentId,
      method: t.method,
      amount: formatSplitPaymentMoney(parseSplitPaymentMoney(t.amount)),
      createdAt: at,
    }));
    assertTenderTotalsMatchPayment(payment.amount, tenders);
  }

  const next = transition(payment, "captured", at, { tenders });
  return result("applied", next, [
    {
      ...eventBaseFromPayment(next, "PaymentCaptured", at),
      eventType: "PaymentCaptured",
      amount: next.amount,
    },
  ]);
}

export type FailPaymentCommand = Readonly<{
  payment: SplitPayment;
  at: string;
}>;

export function failPayment(cmd: FailPaymentCommand): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (payment.status === "failed") return already(payment);
  if (
    payment.status === "cancelled" ||
    payment.status === "voided" ||
    payment.status === "refunded" ||
    payment.status === "applied" ||
    payment.status === "partially_applied" ||
    payment.status === "captured"
  ) {
    throw new InvalidPaymentStateError(
      `Cannot fail Payment in status "${payment.status}"`
    );
  }

  const next = transition(payment, "failed", at);
  return result("applied", next, [
    {
      ...eventBaseFromPayment(next, "PaymentFailed", at),
      eventType: "PaymentFailed",
    },
  ]);
}

// ─── Allocate (split / partial / full) ──────────────────────────────

export type AllocatePaymentCommand = Readonly<{
  payment: SplitPayment;
  /** Portions to allocate toward Order Settlements (Check applies OS separately). */
  portions: readonly PaymentPortion[];
  allocationIds: readonly string[];
  at: string;
  /**
   * When true and allocation exhausts Payment, emit PaymentCompleted.
   * Never implies Check Financial Settlement.
   */
  markCompletedWhenFullyAllocated?: boolean;
}>;

export function allocatePayment(
  cmd: AllocatePaymentCommand
): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (payment.status === "applied") {
    return already(payment);
  }
  if (payment.status === "cancelled") throw new PaymentAlreadyCancelledError();
  if (payment.status === "voided") throw new PaymentAlreadyVoidedError();
  if (payment.status === "refunded") {
    throw new InvalidPaymentStateError("Cannot allocate a refunded Payment");
  }
  if (payment.status === "failed") {
    throw new InvalidPaymentStateError("Cannot allocate a failed Payment");
  }
  if (payment.status === "pending" || payment.status === "authorized") {
    throw new InvalidPaymentStateError(
      "Payment must be captured before allocation"
    );
  }
  if (cmd.portions.length === 0) {
    return noChange(payment);
  }
  if (cmd.portions.length !== cmd.allocationIds.length) {
    throw new InvalidPaymentStateError(
      "allocationIds length must match portions length"
    );
  }

  assertNonTerminal(payment.status, "allocatePayment");

  let allocated = payment.allocatedAmount;
  const newAllocations: PaymentAllocation[] = [];
  const events: SplitPaymentDomainEvent[] = [];

  for (let i = 0; i < cmd.portions.length; i++) {
    const portion = cmd.portions[i]!;
    const allocationId = cmd.allocationIds[i]!;
    if (portion.paymentId !== payment.paymentId) {
      throw new InvalidPaymentStateError(
        "PaymentPortion.paymentId must match Payment"
      );
    }
    if (portion.orderId == null || portion.orderId <= 0) {
      throw new InvalidPaymentStateError(
        "PaymentPortion.orderId is required for Settlement Portion allocation"
      );
    }
    const amount = formatSplitPaymentMoney(
      parseSplitPaymentMoney(portion.amount)
    );
    if (parseSplitPaymentMoney(amount) <= 0) {
      throw new InvalidPaymentStateError("Allocation amount must be > 0");
    }
    assertAllocationWithinPayment(payment.amount, allocated, amount);
    allocated = moneyAdd(allocated, amount);
    newAllocations.push({
      allocationId,
      restaurantId: payment.restaurantId,
      checkId: payment.checkId,
      paymentId: payment.paymentId,
      orderId: portion.orderId,
      amount,
      createdAt: at,
    });
  }

  const unallocated = computeUnallocated(payment.amount, allocated);
  const fullyAllocated = parseSplitPaymentMoney(unallocated) <= 0.001;
  const nextStatus = fullyAllocated ? "applied" : "partially_applied";
  assertTransitionAllowed(payment.status, nextStatus);

  const next = touch(
    payment,
    {
      status: nextStatus,
      allocatedAmount: allocated,
      unallocatedAmount: unallocated,
      allocations: [...payment.allocations, ...newAllocations],
    },
    at
  );

  if (fullyAllocated) {
    events.push({
      ...eventBaseFromPayment(next, "PaymentApplied", at),
      eventType: "PaymentApplied",
      allocatedAmount: next.allocatedAmount,
    });
    if (cmd.markCompletedWhenFullyAllocated !== false) {
      events.push({
        ...eventBaseFromPayment(next, "PaymentCompleted", at),
        eventType: "PaymentCompleted",
        amount: next.amount,
        impliesFinancialSettlement: false,
      });
    }
  } else {
    for (const a of newAllocations) {
      events.push({
        ...eventBaseFromPayment(next, "PaymentPartiallyApplied", at),
        eventType: "PaymentPartiallyApplied",
        allocatedAmount: next.allocatedAmount,
        unallocatedAmount: next.unallocatedAmount,
        allocationId: a.allocationId,
      });
    }
  }

  return result("applied", next, events);
}

// ─── Tender allocation ──────────────────────────────────────────────

export type AllocateTendersCommand = Readonly<{
  payment: SplitPayment;
  allocations: readonly {
    tenderAllocationId: string;
    tenderId: string;
    amount: string;
  }[];
  at: string;
}>;

export function allocateTenders(
  cmd: AllocateTendersCommand
): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (cmd.allocations.length === 0) return noChange(payment);
  if (payment.status === "cancelled") throw new PaymentAlreadyCancelledError();
  if (payment.status === "voided") throw new PaymentAlreadyVoidedError();
  if (payment.status === "failed") {
    throw new InvalidPaymentStateError("Cannot allocate tenders on failed Payment");
  }

  const tenderIds = new Set(payment.tenders.map((t) => t.tenderId));
  const newAllocs: TenderAllocation[] = [];
  const events: SplitPaymentDomainEvent[] = [];
  let sum = "0.00";

  for (const a of cmd.allocations) {
    assertTenderAllocationId(a.tenderAllocationId);
    if (!tenderIds.has(a.tenderId)) {
      throw new InvalidPaymentStateError(
        `Unknown tenderId ${a.tenderId} on Payment ${payment.paymentId}`
      );
    }
    if (
      payment.tenderAllocations.some(
        (x) => x.tenderAllocationId === a.tenderAllocationId
      )
    ) {
      continue; // idempotent skip of duplicate allocation id
    }
    const amount = formatSplitPaymentMoney(parseSplitPaymentMoney(a.amount));
    sum = moneyAdd(sum, amount);
    const tender = payment.tenders.find((t) => t.tenderId === a.tenderId)!;
    newAllocs.push({
      tenderAllocationId: a.tenderAllocationId,
      restaurantId: payment.restaurantId,
      checkId: payment.checkId,
      paymentId: payment.paymentId,
      tenderId: a.tenderId,
      amount,
      createdAt: at,
    });
    events.push({
      ...eventBaseFromPayment(payment, "TenderAllocated", at),
      eventType: "TenderAllocated",
      tenderAllocationId: a.tenderAllocationId,
      tenderId: a.tenderId,
      amount,
      method: tender.method,
    });
  }

  if (newAllocs.length === 0) return already(payment);

  // Tender allocation slices must not invent money beyond payment.
  const existingSum = payment.tenderAllocations.reduce(
    (acc, x) => moneyAdd(acc, x.amount),
    "0.00"
  );
  assertAllocationWithinPayment(
    payment.amount,
    existingSum,
    sum
  );

  const next = touch(
    payment,
    {
      tenderAllocations: [...payment.tenderAllocations, ...newAllocs],
    },
    at
  );
  return result("applied", next, events);
}

// ─── Cancel / Void / Refund ─────────────────────────────────────────

export type CancelPaymentCommand = Readonly<{
  payment: SplitPayment;
  at: string;
}>;

export function cancelPayment(
  cmd: CancelPaymentCommand
): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (payment.status === "cancelled") return already(payment);
  if (payment.status === "voided") throw new PaymentAlreadyVoidedError();
  if (payment.status === "applied") throw new PaymentAlreadyCompletedError();
  if (!canCancel(payment.status)) {
    throw new InvalidPaymentStateError(
      `Cannot cancel Payment in status "${payment.status}"`
    );
  }
  const next = transition(payment, "cancelled", at);
  return result("applied", next, [
    {
      ...eventBaseFromPayment(next, "PaymentCancelled", at),
      eventType: "PaymentCancelled",
    },
  ]);
}

export type VoidPaymentCommand = Readonly<{
  payment: SplitPayment;
  at: string;
}>;

export function voidPayment(cmd: VoidPaymentCommand): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (payment.status === "voided") return already(payment);
  if (payment.status === "cancelled") throw new PaymentAlreadyCancelledError();
  if (payment.status === "applied") {
    // applied → voided not in allow-list; must refund first or reject
    throw new PaymentAlreadyCompletedError(
      "Applied Payment cannot be voided; use refund path"
    );
  }
  if (!canVoid(payment.status)) {
    throw new InvalidPaymentStateError(
      `Cannot void Payment in status "${payment.status}"`
    );
  }
  const next = transition(payment, "voided", at);
  return result("applied", next, [
    {
      ...eventBaseFromPayment(next, "PaymentVoided", at),
      eventType: "PaymentVoided",
    },
  ]);
}

export type RefundPaymentCommand = Readonly<{
  payment: SplitPayment;
  refundedAmount?: string;
  at: string;
}>;

export function refundPayment(
  cmd: RefundPaymentCommand
): SplitPaymentCommandResult {
  const { payment, at } = cmd;
  if (payment.status === "refunded") return already(payment);
  if (payment.status === "cancelled") throw new PaymentAlreadyCancelledError();
  if (payment.status === "voided") throw new PaymentAlreadyVoidedError();
  if (!canRefund(payment.status)) {
    throw new InvalidPaymentStateError(
      `Cannot refund Payment in status "${payment.status}"`
    );
  }
  const refundedAmount = formatSplitPaymentMoney(
    parseSplitPaymentMoney(cmd.refundedAmount ?? payment.amount)
  );
  const next = transition(payment, "refunded", at);
  return result("applied", next, [
    {
      ...eventBaseFromPayment(next, "PaymentRefunded", at),
      eventType: "PaymentRefunded",
      refundedAmount,
    },
  ]);
}

// ─── Outstanding update (pure calculation helper for Check Aggregate) ─

export type UpdateOutstandingCommand = Readonly<{
  restaurantId: number;
  checkId: number;
  financialResponsibility: string;
  appliedPaymentValue: string;
  paymentId?: string | null;
  financialReference?: string | null;
  at: string;
}>;

export type UpdateOutstandingResult = Readonly<{
  outcome: SplitPaymentCommandOutcome;
  responsibility: ReturnType<typeof buildCheckFinancialResponsibility>;
  events: readonly SplitPaymentDomainEvent[];
}>;

export function updateOutstandingSnapshot(
  cmd: UpdateOutstandingCommand
): UpdateOutstandingResult {
  const responsibility = buildCheckFinancialResponsibility({
    restaurantId: cmd.restaurantId,
    checkId: cmd.checkId,
    financialResponsibility: cmd.financialResponsibility,
    appliedPaymentValue: cmd.appliedPaymentValue,
  });
  return {
    outcome: "applied",
    responsibility,
    events: [
      outstandingEvent({
        restaurantId: cmd.restaurantId,
        checkId: cmd.checkId,
        financialResponsibility: cmd.financialResponsibility,
        appliedPaymentValue: cmd.appliedPaymentValue,
        paymentId: cmd.paymentId ?? null,
        financialReference: cmd.financialReference ?? null,
        at: cmd.at,
      }),
    ],
  };
}

// ─── Payment Attempt ────────────────────────────────────────────────

export type StartPaymentAttemptCommand = Readonly<{
  restaurantId: number;
  checkId: number;
  attemptId: string;
  amount: string;
  method: TenderMethod;
  paymentId?: string | null;
  existingAttemptIds?: readonly string[];
  at: string;
}>;

export function startPaymentAttempt(
  cmd: StartPaymentAttemptCommand
): PaymentAttemptCommandResult {
  assertUniquePaymentAttemptId(cmd.attemptId, cmd.existingAttemptIds ?? []);
  const amount = formatSplitPaymentMoney(parseSplitPaymentMoney(cmd.amount));
  const attempt: PaymentAttempt = {
    restaurantId: cmd.restaurantId,
    checkId: cmd.checkId,
    attemptId: cmd.attemptId,
    paymentId: cmd.paymentId ?? null,
    status: "started",
    amount,
    method: cmd.method,
    createdAt: cmd.at,
    updatedAt: cmd.at,
  };
  return {
    outcome: "applied",
    attempt,
    payment: null,
    events: [
      {
        eventType: "PaymentAttemptStarted",
        restaurantId: attempt.restaurantId,
        checkId: attempt.checkId,
        attemptId: attempt.attemptId,
        paymentId: attempt.paymentId,
        amount: attempt.amount,
        method: attempt.method,
        occurredAt: cmd.at,
      },
    ],
  };
}

export type SucceedPaymentAttemptCommand = Readonly<{
  attempt: PaymentAttempt;
  /** Payment created/bound on success — identity independent of attemptId. */
  payment: SplitPayment;
  at: string;
}>;

export function succeedPaymentAttempt(
  cmd: SucceedPaymentAttemptCommand
): PaymentAttemptCommandResult {
  const { attempt, payment, at } = cmd;
  if (attempt.status === "succeeded") {
    return {
      outcome: "already_applied",
      attempt,
      payment,
      events: [],
    };
  }
  if (attempt.status !== "started") {
    throw new InvalidPaymentStateError(
      `Cannot succeed PaymentAttempt in status "${attempt.status}"`
    );
  }
  assertAttemptTraceableToPayment(
    { ...attempt, paymentId: payment.paymentId },
    payment
  );

  const nextAttempt: PaymentAttempt = {
    ...attempt,
    paymentId: payment.paymentId,
    status: "succeeded",
    updatedAt: at,
  };
  return {
    outcome: "applied",
    attempt: nextAttempt,
    payment,
    events: [
      {
        eventType: "PaymentAttemptSucceeded",
        restaurantId: nextAttempt.restaurantId,
        checkId: nextAttempt.checkId,
        attemptId: nextAttempt.attemptId,
        paymentId: payment.paymentId,
        amount: nextAttempt.amount,
        method: nextAttempt.method,
        occurredAt: at,
      },
    ],
  };
}

export type FailPaymentAttemptCommand = Readonly<{
  attempt: PaymentAttempt;
  at: string;
}>;

export function failPaymentAttempt(
  cmd: FailPaymentAttemptCommand
): PaymentAttemptCommandResult {
  const { attempt, at } = cmd;
  if (attempt.status === "failed") {
    return { outcome: "already_applied", attempt, payment: null, events: [] };
  }
  if (attempt.status !== "started") {
    throw new InvalidPaymentStateError(
      `Cannot fail PaymentAttempt in status "${attempt.status}"`
    );
  }
  assertPaymentAttemptId(attempt.attemptId);
  const next: PaymentAttempt = {
    ...attempt,
    status: "failed",
    updatedAt: at,
  };
  return {
    outcome: "applied",
    attempt: next,
    payment: null,
    events: [
      {
        eventType: "PaymentAttemptFailed",
        restaurantId: next.restaurantId,
        checkId: next.checkId,
        attemptId: next.attemptId,
        paymentId: next.paymentId,
        amount: next.amount,
        method: next.method,
        occurredAt: at,
      },
    ],
  };
}

export type CancelPaymentAttemptCommand = Readonly<{
  attempt: PaymentAttempt;
  at: string;
}>;

export function cancelPaymentAttempt(
  cmd: CancelPaymentAttemptCommand
): PaymentAttemptCommandResult {
  const { attempt, at } = cmd;
  if (attempt.status === "cancelled") {
    return { outcome: "already_applied", attempt, payment: null, events: [] };
  }
  if (attempt.status !== "started") {
    throw new InvalidPaymentStateError(
      `Cannot cancel PaymentAttempt in status "${attempt.status}"`
    );
  }
  const next: PaymentAttempt = {
    ...attempt,
    status: "cancelled",
    updatedAt: at,
  };
  return {
    outcome: "applied",
    attempt: next,
    payment: null,
    events: [
      {
        eventType: "PaymentAttemptCancelled",
        restaurantId: next.restaurantId,
        checkId: next.checkId,
        attemptId: next.attemptId,
        paymentId: next.paymentId,
        occurredAt: at,
      },
    ],
  };
}

/** Pure helper: sum of tender amounts on a Payment (mixed tenders). */
export function paymentTenderTotal(payment: SplitPayment): string {
  return sumTenderAmounts(payment.tenders);
}
