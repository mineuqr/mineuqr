/**
 * CRMP-IMPLEMENTATION-1 — Financial Shift domain commands (pure).
 * Enforces D-INV-* custody invariants. Never mutates Settlement money.
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
  assertNonNegativeMoney,
  assertPositiveMoney,
  deriveDrawerVariance,
  normalizeAmount,
  toCents,
  type MovementType,
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
  shiftIsMutable,
} from "./financialShiftLifecycle";

function bump(shift: FinancialShift, at: string): Pick<
  FinancialShift,
  "version" | "updatedAt"
> {
  return { version: shift.version + 1, updatedAt: at };
}

function assertOpenMutable(shift: FinancialShift): void {
  if (shift.status === "closed") {
    throw new CrmpImmutabilityError("Closed Financial Shift is immutable");
  }
  if (!shiftIsMutable(shift.status)) {
    throw new CrmpInvariantError(
      `Financial Shift status ${shift.status} does not allow this mutation`
    );
  }
}

// ─── Open ───────────────────────────────────────────────────────────

export type OpenFinancialShiftCommand = Readonly<{
  financialShiftId: string;
  drawerId: string;
  openingMovementId: string;
  register: CashRegister;
  /** True when another open/handover_pending shift exists on register. */
  hasActiveShiftOnRegister: boolean;
  restaurantId: number;
  operatorUserId: number;
  openingFloatAmount: string;
  currencyCode: string;
  openedAt: string;
}>;

export function openFinancialShift(
  command: OpenFinancialShiftCommand
): FinancialShift {
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
    updatedAt: command.openedAt,
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

export function recordDrawerMovement(
  command: RecordDrawerMovementCommand
): FinancialShift {
  assertOpenMutable(command.shift);
  const { movementType, amount } = command;

  if (movementType === "manual_adjustment") {
    if (!command.reason?.trim()) {
      throw new CrmpValidationError("manual_adjustment requires reason");
    }
    // signed amount allowed
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
  if (command.shift.status === "closed") {
    throw new CrmpImmutabilityError("Closed Financial Shift is immutable");
  }
  // Allow final count on open or handover_pending
  if (
    command.shift.status === "handover_pending" &&
    command.kind !== "final"
  ) {
    throw new CrmpInvariantError(
      "Only final count allowed during handover_pending"
    );
  }
  if (command.shift.status === "open" || command.shift.status === "handover_pending") {
    // ok
  } else {
    throw new CrmpInvariantError("Cannot count on this shift status");
  }

  if (command.kind === "final") {
    const existingFinal = command.shift.drawer.counts.some(
      (c) => c.kind === "final"
    );
    if (existingFinal) {
      throw new CrmpConflictError("Shift already has a final drawer count");
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

// ─── Close ──────────────────────────────────────────────────────────

export type CloseFinancialShiftCommand = Readonly<{
  shift: FinancialShift;
  closedAt: string;
}>;

export function closeFinancialShift(
  command: CloseFinancialShiftCommand
): FinancialShift {
  if (command.shift.status === "closed") {
    return command.shift; // idempotent
  }
  if (command.shift.status !== "open") {
    throw new CrmpInvalidCloseStatus(command.shift.status);
  }
  const hasFinal = command.shift.drawer.counts.some((c) => c.kind === "final");
  if (!hasFinal) {
    throw new CrmpInvariantError(
      "Final Drawer Count required to close Financial Shift"
    );
  }
  assertShiftTransition(command.shift.status, "closed");
  return {
    ...command.shift,
    status: "closed",
    closedAt: command.closedAt,
    ...bump(command.shift, command.closedAt),
  };
}

function CrmpInvalidCloseStatus(status: string): Error {
  return new CrmpInvariantError(
    `Cannot directly close Financial Shift from status ${status}`
  );
}

// ─── Attribution (domain model only — no Settlement Platform calls) ─

export type CreateSettlementAttributionCommand = Readonly<{
  shift: FinancialShift;
  attributionId: string;
  settlementRecordId: string;
  operatorUserId: number;
  /** Copied custody fact — caller-supplied; CRMP does not load SR. */
  cashTenderAmount: string;
  attributedAt: string;
  /** Existing attribution for same SR (idempotency). */
  existingBySettlementRecordId?: SettlementAttribution | null;
}>;

export function createSettlementAttribution(
  command: CreateSettlementAttributionCommand
): { shift: FinancialShift; attribution: SettlementAttribution; alreadyApplied: boolean } {
  if (command.existingBySettlementRecordId) {
    return {
      shift: command.shift,
      attribution: command.existingBySettlementRecordId,
      alreadyApplied: true,
    };
  }
  assertOpenMutable(command.shift);
  if (!command.settlementRecordId.trim()) {
    throw new CrmpValidationError(
      "Settlement Attribution requires settlementRecordId"
    );
  }
  assertNonNegativeMoney(
    {
      amount: command.cashTenderAmount,
      currencyCode: command.shift.currencyCode,
    },
    "cashTenderAmount"
  );

  const duplicate = command.shift.attributions.find(
    (a) => a.settlementRecordId === command.settlementRecordId
  );
  if (duplicate) {
    return { shift: command.shift, attribution: duplicate, alreadyApplied: true };
  }

  const attribution: SettlementAttribution = {
    attributionId: command.attributionId,
    restaurantId: command.shift.restaurantId,
    registerId: command.shift.registerId,
    financialShiftId: command.shift.financialShiftId,
    settlementRecordId: command.settlementRecordId.trim(),
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
    throw new CrmpInvariantError(
      "Handover requires two distinct Users"
    );
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
  if (command.shift.status === "open" && command.shift.handover?.outcome === "rejected") {
    return command.shift; // idempotent
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
  /** Must already include final count on outgoing. */
  acceptingUserId: number;
  successorShiftId: string;
  successorDrawerId: string;
  successorOpeningMovementId: string;
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
    handover: {
      ...outgoing.handover,
      outcome: "accepted",
      finalCountId: finalCount.countId,
      resolvedAt: command.acceptedAt,
    },
    ...bump(outgoing, command.acceptedAt),
  };

  // Successor opens with counted actual as opening float (custody continuity).
  const successor = openFinancialShift({
    financialShiftId: command.successorShiftId,
    drawerId: command.successorDrawerId,
    openingMovementId: command.successorOpeningMovementId,
    register: {
      registerId: outgoing.registerId,
      restaurantId: outgoing.restaurantId,
      displayName: "",
      status: "active",
      deviceId: null,
      version: 1,
      createdAt: command.acceptedAt,
      updatedAt: command.acceptedAt,
    },
    hasActiveShiftOnRegister: false,
    restaurantId: outgoing.restaurantId,
    operatorUserId: command.acceptingUserId,
    openingFloatAmount: finalCount.actualAmount,
    currencyCode: outgoing.currencyCode,
    openedAt: command.acceptedAt,
  });

  return { closed, successor };
}
