/**
 * ADR-ARCH-025 / MULTI-CHECK-ALLOCATION-DOMAIN-1 — Allocation lifecycle transitions.
 * Terminal → non-terminal reopen of the same AllocationId is forbidden.
 */

import {
  isAllocationNonTerminalStatus,
  isAllocationTerminalStatus,
  type AllocationStatus,
} from "./multiCheckAllocationContract";
import {
  IllegalTerminalTransitionError,
  InvalidAllocationTransitionError,
} from "./multiCheckAllocationErrors";

/**
 * Allowed transitions (DOMAIN-1 of ADR-025 §8.2).
 *
 * Pending → Reserved → Applied → Completed
 *                      │        ├── Adjusted → Completed
 *                      │        └── Reversed
 *                      └── Cancelled
 * Pending → Cancelled
 * Reserved → Cancelled
 */
const ALLOWED_TRANSITIONS: Readonly<
  Record<AllocationStatus, readonly AllocationStatus[]>
> = {
  pending: ["reserved", "cancelled"],
  reserved: ["applied", "cancelled"],
  applied: ["adjusted", "reversed", "completed"],
  adjusted: ["adjusted", "reversed", "completed"],
  reversed: [],
  completed: [],
  cancelled: [],
};

export function getAllowedTransitions(
  from: AllocationStatus
): readonly AllocationStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTransitionAllowed(
  from: AllocationStatus,
  to: AllocationStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Assert a state change is legal.
 * Same-state allowed for idempotent re-entry (ADR-021), except adjusted→adjusted
 * is an explicit allowed transition for successive adjustments.
 * Terminal → non-terminal always throws (same AllocationId cannot reopen).
 */
export function assertTransitionAllowed(
  from: AllocationStatus,
  to: AllocationStatus
): void {
  if (from === to) return;

  if (
    isAllocationTerminalStatus(from) &&
    isAllocationNonTerminalStatus(to)
  ) {
    throw new IllegalTerminalTransitionError(
      `Terminal Allocation status "${from}" must not transition to non-terminal "${to}" (same AllocationId)`
    );
  }

  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidAllocationTransitionError(
      `Invalid Allocation transition: ${from} → ${to}`
    );
  }
}

export function assertNonTerminal(
  status: AllocationStatus,
  operation: string
): void {
  if (!isAllocationNonTerminalStatus(status)) {
    throw new InvalidAllocationTransitionError(
      `Operation "${operation}" requires non-terminal Allocation status; current is "${status}"`
    );
  }
}

export function canCancel(status: AllocationStatus): boolean {
  return status === "pending" || status === "reserved";
}

export function canReserve(status: AllocationStatus): boolean {
  return status === "pending";
}

export function canApply(status: AllocationStatus): boolean {
  return status === "reserved";
}

export function canAdjust(status: AllocationStatus): boolean {
  return status === "applied" || status === "adjusted";
}

export function canReverse(status: AllocationStatus): boolean {
  return status === "applied" || status === "adjusted";
}

export function canComplete(status: AllocationStatus): boolean {
  return status === "applied" || status === "adjusted";
}
