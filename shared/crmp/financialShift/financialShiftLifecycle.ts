/**
 * CRMP-IMPLEMENTATION-1 — Financial Shift lifecycle.
 */

import { CrmpInvalidTransitionError } from "../crmpErrors";
import type { ShiftStatus } from "../valueObjects";
import { isActiveShiftStatus } from "../valueObjects";

const ALLOWED: Record<ShiftStatus, readonly ShiftStatus[]> = {
  open: ["handover_pending", "closed"],
  handover_pending: ["open", "closed"],
  closed: [],
};

export function isShiftTransitionAllowed(
  from: ShiftStatus,
  to: ShiftStatus
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertShiftTransition(from: ShiftStatus, to: ShiftStatus): void {
  if (from === "closed" && to !== "closed") {
    throw new CrmpInvalidTransitionError(
      "Closed Financial Shift cannot reopen"
    );
  }
  if (!isShiftTransitionAllowed(from, to)) {
    throw new CrmpInvalidTransitionError(
      `Financial Shift cannot transition ${from} → ${to}`
    );
  }
}

export function shiftIsMutable(status: ShiftStatus): boolean {
  return status === "open";
}

export function shiftIsActive(status: ShiftStatus): boolean {
  return isActiveShiftStatus(status);
}
