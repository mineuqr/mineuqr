/**
 * ADR-ARCH-030 / SHIFT-LIFECYCLE-IMPLEMENTATION-1 — Financial Shift lifecycle.
 * Persisted `pending` is prohibited.
 */

import { CrmpInvalidTransitionError } from "../crmpErrors";
import type { ShiftStatus } from "../valueObjects";
import {
  isActiveShiftStatus,
  isTerminalShiftStatus,
} from "../valueObjects";

const ALLOWED: Record<ShiftStatus, readonly ShiftStatus[]> = {
  open: ["suspended", "closing", "handover_pending", "closed"],
  suspended: ["open", "closing"],
  closing: ["open", "closed"],
  handover_pending: ["open", "closed"],
  closed: ["archived"],
  archived: [],
};

export function isShiftTransitionAllowed(
  from: ShiftStatus,
  to: ShiftStatus
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertShiftTransition(from: ShiftStatus, to: ShiftStatus): void {
  if (isTerminalShiftStatus(from) && to !== from && !(from === "closed" && to === "archived")) {
    if (from === "archived") {
      throw new CrmpInvalidTransitionError(
        "Archived Financial Shift is immutable"
      );
    }
    if (from === "closed" && to !== "archived") {
      throw new CrmpInvalidTransitionError(
        "Closed Financial Shift cannot reopen"
      );
    }
  }
  if (!isShiftTransitionAllowed(from, to)) {
    throw new CrmpInvalidTransitionError(
      `Financial Shift cannot transition ${from} → ${to}`
    );
  }
}

/** Movements and attributions — operating window only. */
export function shiftIsMutable(status: ShiftStatus): boolean {
  return status === "open";
}

export function shiftIsActive(status: ShiftStatus): boolean {
  return isActiveShiftStatus(status);
}

export function shiftAllowsFinalCount(status: ShiftStatus): boolean {
  return (
    status === "open" ||
    status === "closing" ||
    status === "handover_pending"
  );
}

export function shiftAllowsInterimCount(status: ShiftStatus): boolean {
  return status === "open";
}
