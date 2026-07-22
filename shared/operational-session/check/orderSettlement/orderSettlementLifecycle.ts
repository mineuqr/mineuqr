/**
 * ADR-ARCH-022 / ORDER-SETTLEMENT-DOMAIN-1 — lifecycle transition rules.
 * Enforces allowed transitions and I-OS-14 (no terminal → non-terminal).
 */

import {
  isOrderSettlementNonTerminalStatus,
  isOrderSettlementTerminalStatus,
  type OrderSettlementStatus,
} from "./orderSettlementContract";
import {
  IllegalTerminalTransitionError,
  InvalidTransitionError,
} from "./orderSettlementErrors";

/** Explicit allow-list from ADR-022 §6.3 */
const ALLOWED_TRANSITIONS: Readonly<
  Record<OrderSettlementStatus, readonly OrderSettlementStatus[]>
> = {
  pending: [
    "partially_settled",
    "settled",
    "complimentary",
    "cancelled",
    "voided",
  ],
  partially_settled: ["settled", "complimentary", "cancelled", "voided"],
  settled: ["refunded", "voided"],
  complimentary: ["refunded", "voided"],
  refunded: ["voided"],
  voided: [],
  cancelled: [],
};

export function getAllowedTransitions(
  from: OrderSettlementStatus
): readonly OrderSettlementStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTransitionAllowed(
  from: OrderSettlementStatus,
  to: OrderSettlementStatus
): boolean {
  if (from === to) return true; // idempotent same-state (command layer)
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Assert a state change is legal.
 * Same-state is allowed for idempotent command re-entry (ADR-021 compatibility).
 * Terminal → non-terminal always throws IllegalTerminalTransitionError (I-OS-14).
 */
export function assertTransitionAllowed(
  from: OrderSettlementStatus,
  to: OrderSettlementStatus
): void {
  if (from === to) return;

  if (
    isOrderSettlementTerminalStatus(from) &&
    isOrderSettlementNonTerminalStatus(to)
  ) {
    throw new IllegalTerminalTransitionError(
      `I-OS-14: terminal status "${from}" must not transition to non-terminal "${to}"`
    );
  }

  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(
      `Invalid OrderSettlement transition: ${from} → ${to}`
    );
  }
}

export function assertNonTerminal(
  status: OrderSettlementStatus,
  operation: string
): void {
  if (!isOrderSettlementNonTerminalStatus(status)) {
    throw new InvalidTransitionError(
      `Operation "${operation}" requires non-terminal status; current is "${status}"`
    );
  }
}
