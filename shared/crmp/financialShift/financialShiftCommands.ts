/**
 * ADR-ARCH-030 / SHIFT-LIFECYCLE-IMPLEMENTATION-1 — Financial Shift domain commands.
 * Enforces custody invariants. Never mutates Settlement money.
 * All lifecycle commands are idempotent on terminal predicates.
 */

import {
  CrmpConflictError,
  CrmpImmutabilityError,
  CrmpInvariantError,
  CrmpValidationError,
} from "../crmpErrors";
import type { CashRegister } from "../register/registerContract";
import { assertRegisterCanOpenShift } from "../register/registerCommands";
import {
  assertMoneyAmount,
  assertNonNegativeMoney,
  assertPositiveMoney,
  deriveDrawerVariance,
  normalizeAmount,
  toCents,
  type MovementType,
  type ShiftCloseReason,
} from "../valueObjects";
import { computeExpectedCash } from "./expectedCash";
import type {
  DrawerCount,
  DrawerMovement,
  FinancialShift,
  SettlementAttribution,
  ShiftHandover,
} from "./financialShiftContract";
import {
  assertShiftTransition,
  shiftAllowsFinalCount,
  shiftAllowsInterimCount,
  shiftIsMutable,
} from "./financialShiftLifecycle";

function bump(shift: FinancialShift, at: string): Pick<
  FinancialShift,
  "version" | "updatedAt"
> {
  return { version: shift.version + 1, updatedAt: at };
}

function assertOpenMutable(shift: FinancialShift): void {
  if (shift.status === "closed" || shift.status === "archived") {
    throw new CrmpImmutabilityError("Closed Financial Shift is immutable");
  }
  if (!shiftIsMutable(shift.status)) {
    throw new CrmpInvariantError(
      `Financial Shift status ${shift.status} does not allow this mutation`
    );
  }
}

function isEmptyCancellable(shift: FinancialShift): boolean {
  return (
    shift.status === "open" &&
    shift.attributions.length === 0 &&
    shift.drawer.counts.length === 0 &&
    shift.handover == null &&
    shift.drawer.movements.length === 1 &&
    shift.drawer.movements[0]?.movementType === "opening_float"
  );
}

// ─── Open ───────────────────────────────────────────────────────────

export type OpenFinancialShiftCommand = Readonly<{
  financialShiftId: string;
  drawerId: string;
  openingMovementId: string;
  register: CashRegister;
  /** True when another open/handover_pending/suspended/closing shift exists on register. */
  hasActiveShiftOnRegister: boolean;
  restaurantId: number;
  operatorUserId: number;
  openingFloatAmount: string;
  currencyCode: string;
  openedAt: string;
  /** Pre-allocated human shift number (restaurant + register scoped). */
  shiftNumber: number;
  /** Existing row for same id — idempotent return. */
  existingById?: FinancialShift | null;
}>;

export function openFinancialShift(
  command: OpenFinancialShiftCommand
): FinancialShift {
  if (command.existingById) {
    if (
      command.existingById.registerId === command.register.registerId &&
      command.existingById.restaurantId === command.restaurantId
    ) {
      return command.existingById;
    }
    throw new CrmpConflictError(
      "Financial Shift id already exists for a different Register"
    );
  }
  assertRegisterCanOpenShift(command.register);
  if (command.hasActiveShiftOnRegister) {
    throw new CrmpConflictError(
      "Register already has an active Financial Shift"
    );
  }
  if (command.restaurantId !== command.register.restaurantId) {
    throw new CrmpInvariantError("Tenant isolation: restaurantId mismatch");
  }
  if (!Number.isInteger(command.operatorUserId) || command.operatorUserId <= 0) {
    throw new CrmpValidationError("operatorUserId required");
  }
  assertNonNegativeMoney(
    { amount: command.openingFloatAmount, currencyCode: command.currencyCode },
    "openingFloat"
  );
  if (
    !Number.isInteger(command.shiftNumber) ||
    command.shiftNumber < 1
  ) {
    throw new CrmpValidationError("shiftNumber must be a positive integer");
  }

  const float = normalizeAmount(command.openingFloatAmount);
  const openingMovement: DrawerMovement = {
    movementId: command.openingMovementId,
    movementType: "opening_float",
    amount: float,
    currencyCode: command.currencyCode,
    reason: "opening_float",
    actorUserId: command.operatorUserId,
    recordedAt: command.openedAt,
  };

  return {
    financialShiftId: command.financialShiftId,
    shiftNumber: command.shiftNumber,
    restaurantId: command.restaurantId,
    registerId: command.register.registerId,
    operatorUserId: command.operatorUserId,
    status: "open",
    openingFloatAmount: float,
    currencyCode: command.currencyCode,
    drawer: {
      drawerId: command.drawerId,
      currencyCode: command.currencyCode,
      movements: [openingMovement],
      counts: [],
    },
    handover: null,
    attributions: [],
    version: 1,
    openedAt: command.openedAt,
    closedAt: null,
    closeReason: null,
    archivedAt: null,
    updatedAt: command.openedAt,
  };
}

// ─── Suspend / Resume ───────────────────────────────────────────────

export type SuspendFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  at: string;
}>;

export function suspendFinancialShift(
  command: SuspendFinancialShiftCommand
): FinancialShift {
  if (command.shift.status === "suspended") return command.shift;
  if (command.shift.status !== "open") {
    throw new CrmpInvariantError(
      `Cannot suspend Financial Shift from status ${command.shift.status}`
    );
  }
  assertShiftTransition(command.shift.status, "suspended");
  return {
    ...command.shift,
    status: "suspended",
    ...bump(command.shift, command.at),
  };
}

export type ResumeFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  at: string;
}>;

export function resumeFinancialShift(
  command: ResumeFinancialShiftCommand
): FinancialShift {
  if (command.shift.status === "open") return command.shift;
  if (command.shift.status !== "suspended") {
    throw new CrmpInvariantError(
      `Cannot resume Financial Shift from status ${command.shift.status}`
    );
  }
  assertShiftTransition(command.shift.status, "open");
  return {
    ...command.shift,
    status: "open",
    ...bump(command.shift, command.at),
  };
}

// ─── Close corridor ─────────────────────────────────────────────────

export type BeginCloseFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  at: string;
}>;

export function beginCloseFinancialShift(
  command: BeginCloseFinancialShiftCommand
): FinancialShift {
  if (command.shift.status === "closing") return command.shift;
  if (command.shift.status !== "open" && command.shift.status !== "suspended") {
    throw new CrmpInvariantError(
      `Cannot begin close from status ${command.shift.status}`
    );
  }
  assertShiftTransition(command.shift.status, "closing");
  return {
    ...command.shift,
    status: "closing",
    ...bump(command.shift, command.at),
  };
}

export type AbortCloseFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  at: string;
}>;

export function abortCloseFinancialShift(
  command: AbortCloseFinancialShiftCommand
): FinancialShift {
  if (command.shift.status === "open") return command.shift;
  if (command.shift.status !== "closing") {
    throw new CrmpInvariantError(
      `Cannot abort close from status ${command.shift.status}`
    );
  }
  const hasFinal = command.shift.drawer.counts.some((c) => c.kind === "final");
  if (hasFinal) {
    throw new CrmpInvariantError(
      "Cannot abort close after final Drawer Count is recorded"
    );
  }
  assertShiftTransition(command.shift.status, "open");
  return {
    ...command.shift,
    status: "open",
    ...bump(command.shift, command.at),
  };
}

export type CloseFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  closedAt: string;
  closeReason?: ShiftCloseReason;
}>;

export function closeFinancialShift(
  command: CloseFinancialShiftCommand
): FinancialShift {
  if (command.shift.status === "closed" || command.shift.status === "archived") {
    return command.shift;
  }
  const from = command.shift.status;
  if (from !== "open" && from !== "closing") {
    throw new CrmpInvariantError(
      `Cannot close Financial Shift from status ${from}`
    );
  }
  const hasFinal = command.shift.drawer.counts.some((c) => c.kind === "final");
  if (!hasFinal) {
    throw new CrmpInvariantError(
      "Final Drawer Count required to close Financial Shift"
    );
  }
  assertShiftTransition(from, "closed");
  return {
    ...command.shift,
    status: "closed",
    closedAt: command.closedAt,
    closeReason: command.closeReason ?? "normal",
    ...bump(command.shift, command.closedAt),
  };
}

export type CancelOpenFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  closedAt: string;
}>;

export function cancelOpenFinancialShift(
  command: CancelOpenFinancialShiftCommand
): FinancialShift {
  if (
    command.shift.status === "closed" &&
    command.shift.closeReason === "cancelled_empty"
  ) {
    return command.shift;
  }
  if (!isEmptyCancellable(command.shift)) {
    throw new CrmpInvariantError(
      "CancelOpen allowed only on empty open Financial Shift"
    );
  }
  assertShiftTransition(command.shift.status, "closed");
  return {
    ...command.shift,
    status: "closed",
    closedAt: command.closedAt,
    closeReason: "cancelled_empty",
    ...bump(command.shift, command.closedAt),
  };
}

export type ArchiveFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  archivedAt: string;
}>;

export function archiveFinancialShift(
  command: ArchiveFinancialShiftCommand
): FinancialShift {
  if (command.shift.status === "archived") return command.shift;
  if (command.shift.status !== "closed") {
    throw new CrmpInvariantError(
      "Archive allowed only from closed Financial Shift"
    );
  }
  assertShiftTransition(command.shift.status, "archived");
  return {
    ...command.shift,
    status: "archived",
    archivedAt: command.archivedAt,
    ...bump(command.shift, command.archivedAt),
  };
}

// ─── Movements ──────────────────────────────────────────────────────

export type RecordDrawerMovementCommand = Readonly<{
  shift: FinancialShift;
  movementId: string;
  movementType: Exclude<MovementType, "opening_float">;
  amount: string;
  reason: string | null;
  actorUserId: number;
  recordedAt: string;
}>;

function isEquivalentDrawerMovement(
  existing: DrawerMovement,
  command: RecordDrawerMovementCommand
): boolean {
  const reason = command.reason?.trim() ?? null;
  return (
    existing.movementType === command.movementType &&
    existing.amount === normalizeAmount(command.amount) &&
    existing.reason === reason &&
    existing.actorUserId === command.actorUserId
  );
}

export function recordDrawerMovement(
  command: RecordDrawerMovementCommand
): FinancialShift {
  const existing = command.shift.drawer.movements.find(
    (m) => m.movementId === command.movementId
  );
  if (existing) {
    if (isEquivalentDrawerMovement(existing, command)) {
      return command.shift;
    }
    throw new CrmpConflictError(
      "Drawer movement idempotency key reused with conflicting payload"
    );
  }

  assertOpenMutable(command.shift);
  const { movementType, amount } = command;

  if (movementType === "manual_adjustment") {
    if (!command.reason?.trim()) {
      throw new CrmpValidationError("manual_adjustment requires reason");
    }
    if (!/^-?\d+(\.\d{1,2})?$/.test(amount) || toCents(amount) === 0) {
      throw new CrmpValidationError(
        "manual_adjustment amount must be non-zero decimal"
      );
    }
  } else {
    assertPositiveMoney(
      { amount, currencyCode: command.shift.currencyCode },
      movementType
    );
    if (
      (movementType === "paid_out" || movementType === "safe_drop") &&
      toCents(amount) > toCents(computeExpectedCash(command.shift))
    ) {
      throw new CrmpInvariantError(
        `${movementType} exceeds expected drawer cash`
      );
    }
    if (
      (movementType === "paid_in" ||
        movementType === "paid_out" ||
        movementType === "safe_drop") &&
      !command.reason?.trim()
    ) {
      throw new CrmpValidationError(`${movementType} requires reason`);
    }
  }

  const movement: DrawerMovement = {
    movementId: command.movementId,
    movementType,
    amount: normalizeAmount(amount),
    currencyCode: command.shift.currencyCode,
    reason: command.reason?.trim() ?? null,
    actorUserId: command.actorUserId,
    recordedAt: command.recordedAt,
  };

  return {
    ...command.shift,
    drawer: {
      ...command.shift.drawer,
      movements: [...command.shift.drawer.movements, movement],
    },
    ...bump(command.shift, command.recordedAt),
  };
}

// ─── Counts ─────────────────────────────────────────────────────────

export type RecordDrawerCountCommand = Readonly<{
  shift: FinancialShift;
  countId: string;
  kind: "interim" | "final";
  actualAmount: string;
  actorUserId: number;
  recordedAt: string;
}>;

export function recordDrawerCount(
  command: RecordDrawerCountCommand
): FinancialShift {
  if (command.shift.status === "closed" || command.shift.status === "archived") {
    throw new CrmpImmutabilityError("Closed Financial Shift is immutable");
  }
  if (command.kind === "interim" && !shiftAllowsInterimCount(command.shift.status)) {
    throw new CrmpInvariantError(
      `Interim count not allowed on status ${command.shift.status}`
    );
  }
  if (command.kind === "final" && !shiftAllowsFinalCount(command.shift.status)) {
    throw new CrmpInvariantError(
      `Final count not allowed on status ${command.shift.status}`
    );
  }

  if (command.kind === "final") {
    const existingFinal = command.shift.drawer.counts.find(
      (c) => c.kind === "final"
    );
    if (existingFinal) {
      if (toCents(existingFinal.actualAmount) === toCents(command.actualAmount)) {
        return command.shift;
      }
      throw new CrmpConflictError(
        "Final drawer count already recorded with a different amount"
      );
    }
  }

  assertNonNegativeMoney(
    {
      amount: command.actualAmount,
      currencyCode: command.shift.currencyCode,
    },
    "actualAmount"
  );

  const expected = computeExpectedCash(command.shift);
  const variance = deriveDrawerVariance({
    expected,
    actual: command.actualAmount,
    currencyCode: command.shift.currencyCode,
  });

  const count: DrawerCount = {
    countId: command.countId,
    kind: command.kind,
    expectedAmount: variance.expected,
    actualAmount: variance.actual,
    varianceAmount: variance.variance,
    currencyCode: command.shift.currencyCode,
    actorUserId: command.actorUserId,
    recordedAt: command.recordedAt,
  };

  return {
    ...command.shift,
    drawer: {
      ...command.shift.drawer,
      counts: [...command.shift.drawer.counts, count],
    },
    ...bump(command.shift, command.recordedAt),
  };
}

// ─── Attribution (domain model only — no Settlement Platform calls) ─

export type CreateSettlementAttributionCommand = Readonly<{
  shift: FinancialShift;
  attributionId: string;
  /** Legacy / refund Settlement Record identity. XOR with collectionFactId. */
  settlementRecordId?: string | null;
  /** Current Cashier Collection Fact identity. XOR with settlementRecordId. */
  collectionFactId?: string | null;
  operatorUserId: number;
  /** Copied custody fact — caller-supplied; CRMP does not load CF/SR. */
  cashTenderAmount: string;
  attributedAt: string;
  /** Existing attribution for same SR (idempotency). */
  existingBySettlementRecordId?: SettlementAttribution | null;
  /** Existing attribution for same CF (idempotency). */
  existingByCollectionFactId?: SettlementAttribution | null;
}>;

function normalizeAttributionIdentity(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function createSettlementAttribution(
  command: CreateSettlementAttributionCommand
): {
  shift: FinancialShift;
  attribution: SettlementAttribution;
  alreadyApplied: boolean;
} {
  const collectionFactId = normalizeAttributionIdentity(command.collectionFactId);
  const settlementRecordId = normalizeAttributionIdentity(
    command.settlementRecordId
  );
  if (collectionFactId && settlementRecordId) {
    throw new CrmpValidationError(
      "Settlement Attribution cannot carry both collectionFactId and settlementRecordId"
    );
  }
  if (collectionFactId && command.existingByCollectionFactId) {
    return {
      shift: command.shift,
      attribution: command.existingByCollectionFactId,
      alreadyApplied: true,
    };
  }
  if (settlementRecordId && command.existingBySettlementRecordId) {
    return {
      shift: command.shift,
      attribution: command.existingBySettlementRecordId,
      alreadyApplied: true,
    };
  }
  assertOpenMutable(command.shift);
  if (!collectionFactId && !settlementRecordId) {
    throw new CrmpValidationError(
      "Settlement Attribution requires collectionFactId or settlementRecordId"
    );
  }
  // Signed custody fact: settle cash ≥ 0; refund cash return < 0 (REFUND-REGISTER-ADOPTION-1).
  // CRMP never recalculates — caller copies from Collection Fact tenders or Settlement Record publication.
  assertMoneyAmount(
    {
      amount: command.cashTenderAmount,
      currencyCode: command.shift.currencyCode,
    },
    "cashTenderAmount"
  );

  const duplicate = command.shift.attributions.find((a) =>
    collectionFactId
      ? a.collectionFactId === collectionFactId
      : a.settlementRecordId === settlementRecordId
  );
  if (duplicate) {
    return { shift: command.shift, attribution: duplicate, alreadyApplied: true };
  }

  const attribution: SettlementAttribution = {
    attributionId: command.attributionId,
    restaurantId: command.shift.restaurantId,
    registerId: command.shift.registerId,
    financialShiftId: command.shift.financialShiftId,
    settlementRecordId,
    collectionFactId,
    source: collectionFactId ? "collection_fact" : "legacy_settlement_record",
    operatorUserId: command.operatorUserId,
    cashTenderAmount: normalizeAmount(command.cashTenderAmount),
    currencyCode: command.shift.currencyCode,
    attributedAt: command.attributedAt,
  };

  return {
    shift: {
      ...command.shift,
      attributions: [...command.shift.attributions, attribution],
      ...bump(command.shift, command.attributedAt),
    },
    attribution,
    alreadyApplied: false,
  };
}

// ─── Handover ───────────────────────────────────────────────────────

export type InitiateHandoverCommand = Readonly<{
  shift: FinancialShift;
  handoverId: string;
  initiatorUserId: number;
  receiverUserId: number;
  offeredAt: string;
}>;

export function initiateHandover(
  command: InitiateHandoverCommand
): FinancialShift {
  assertOpenMutable(command.shift);
  if (command.initiatorUserId === command.receiverUserId) {
    throw new CrmpInvariantError("Handover requires two distinct Users");
  }
  if (command.initiatorUserId !== command.shift.operatorUserId) {
    throw new CrmpInvariantError(
      "Only current shift operator may initiate handover"
    );
  }
  assertShiftTransition(command.shift.status, "handover_pending");

  const handover: ShiftHandover = {
    handoverId: command.handoverId,
    initiatorUserId: command.initiatorUserId,
    receiverUserId: command.receiverUserId,
    outcome: "pending",
    finalCountId: null,
    offeredAt: command.offeredAt,
    resolvedAt: null,
  };

  return {
    ...command.shift,
    status: "handover_pending",
    handover,
    ...bump(command.shift, command.offeredAt),
  };
}

export type RejectHandoverCommand = Readonly<{
  shift: FinancialShift;
  rejectedAt: string;
}>;

export function rejectHandover(
  command: RejectHandoverCommand
): FinancialShift {
  if (
    command.shift.status === "open" &&
    command.shift.handover?.outcome === "rejected"
  ) {
    return command.shift;
  }
  if (command.shift.status !== "handover_pending" || !command.shift.handover) {
    throw new CrmpInvariantError("No pending handover to reject");
  }
  assertShiftTransition(command.shift.status, "open");
  return {
    ...command.shift,
    status: "open",
    handover: {
      ...command.shift.handover,
      outcome: "rejected",
      resolvedAt: command.rejectedAt,
    },
    ...bump(command.shift, command.rejectedAt),
  };
}

export type AcceptHandoverCommand = Readonly<{
  outgoing: FinancialShift;
  /** Canonical Register AR — successor open must not invent Register / Duty. */
  register: CashRegister;
  acceptingUserId: number;
  successorShiftId: string;
  successorDrawerId: string;
  successorOpeningMovementId: string;
  successorShiftNumber: number;
  acceptedAt: string;
}>;

export type AcceptHandoverResult = Readonly<{
  closed: FinancialShift;
  successor: FinancialShift;
}>;

export function acceptHandover(
  command: AcceptHandoverCommand
): AcceptHandoverResult {
  const { outgoing } = command;
  if (outgoing.status !== "handover_pending" || !outgoing.handover) {
    throw new CrmpInvariantError("No pending handover to accept");
  }
  if (command.acceptingUserId !== outgoing.handover.receiverUserId) {
    throw new CrmpInvariantError("Only handover receiver may accept");
  }
  const finalCount = [...outgoing.drawer.counts]
    .reverse()
    .find((c) => c.kind === "final");
  if (!finalCount) {
    throw new CrmpInvariantError(
      "Final Drawer Count required to accept handover"
    );
  }

  assertShiftTransition(outgoing.status, "closed");
  const closed: FinancialShift = {
    ...outgoing,
    status: "closed",
    closedAt: command.acceptedAt,
    closeReason: "handover",
    handover: {
      ...outgoing.handover,
      outcome: "accepted",
      finalCountId: finalCount.countId,
      resolvedAt: command.acceptedAt,
    },
    ...bump(outgoing, command.acceptedAt),
  };

  if (command.register.registerId !== outgoing.registerId) {
    throw new CrmpInvariantError(
      "Handover successor Register must match outgoing Financial Shift Register"
    );
  }
  if (command.register.restaurantId !== outgoing.restaurantId) {
    throw new CrmpInvariantError(
      "Handover successor Register restaurant mismatch"
    );
  }

  const successor = openFinancialShift({
    financialShiftId: command.successorShiftId,
    drawerId: command.successorDrawerId,
    openingMovementId: command.successorOpeningMovementId,
    register: command.register,
    hasActiveShiftOnRegister: false,
    restaurantId: outgoing.restaurantId,
    operatorUserId: command.acceptingUserId,
    openingFloatAmount: finalCount.actualAmount,
    currencyCode: outgoing.currencyCode,
    openedAt: command.acceptedAt,
    shiftNumber: command.successorShiftNumber,
  });

  return { closed, successor };
}
