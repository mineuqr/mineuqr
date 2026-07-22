/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — Payment lifecycle transitions.
 * Terminal → non-terminal reopen of the same Payment identity is forbidden.
 */

import {
  isSplitPaymentNonTerminalStatus,
  isSplitPaymentTerminalStatus,
  type SplitPaymentStatus,
} from "./splitPaymentContract";
import {
  IllegalTerminalTransitionError,
  InvalidTransitionError,
} from "./splitPaymentErrors";

/**
 * Allowed transitions (DOMAIN-1 refinement of ADR-024 §5.3).
 * Allocation dimension uses partially_applied / applied (Payment Completion).
 */
const ALLOWED_TRANSITIONS: Readonly<
  Record<SplitPaymentStatus, readonly SplitPaymentStatus[]>
> = {
  pending: ["authorized", "captured", "cancelled", "failed"],
  authorized: ["captured", "voided", "cancelled", "failed"],
  captured: ["partially_applied", "applied", "voided", "refunded"],
  partially_applied: ["applied", "refunded", "voided"],
  applied: ["refunded"],
  cancelled: [],
  voided: [],
  refunded: [],
  failed: [],
};

export function getAllowedTransitions(
  from: SplitPaymentStatus
): readonly SplitPaymentStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTransitionAllowed(
  from: SplitPaymentStatus,
  to: SplitPaymentStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Assert a state change is legal.
 * Same-state allowed for idempotent re-entry (ADR-021).
 * Terminal → non-terminal always throws (same Payment identity cannot reopen).
 */
export function assertTransitionAllowed(
  from: SplitPaymentStatus,
  to: SplitPaymentStatus
): void {
  if (from === to) return;

  if (
    isSplitPaymentTerminalStatus(from) &&
    isSplitPaymentNonTerminalStatus(to)
  ) {
    throw new IllegalTerminalTransitionError(
      `Terminal Payment status "${from}" must not transition to non-terminal "${to}" (same PaymentId)`
    );
  }

  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(
      `Invalid Payment transition: ${from} → ${to}`
    );
  }
}

export function assertNonTerminal(
  status: SplitPaymentStatus,
  operation: string
): void {
  if (!isSplitPaymentNonTerminalStatus(status)) {
    throw new InvalidTransitionError(
      `Operation "${operation}" requires non-terminal Payment status; current is "${status}"`
    );
  }
}

/** Statuses from which cancel is allowed. */
export function canCancel(status: SplitPaymentStatus): boolean {
  return status === "pending" || status === "authorized";
}

/** Statuses from which void is allowed. */
export function canVoid(status: SplitPaymentStatus): boolean {
  return (
    status === "authorized" ||
    status === "captured" ||
    status === "partially_applied"
  );
}

/** Statuses from which refund is allowed. */
export function canRefund(status: SplitPaymentStatus): boolean {
  return (
    status === "captured" ||
    status === "partially_applied" ||
    status === "applied"
  );
}
