/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — Refund lifecycle.
 */

import type { RefundStatus } from "./refundContract";
import { InvalidRefundStateError } from "./refundErrors";

const ALLOWED: Readonly<Record<RefundStatus, readonly RefundStatus[]>> = {
  requested: ["validated", "applied"],
  validated: ["applied"],
  applied: ["completed"],
  completed: [],
};

export function getAllowedRefundTransitions(
  from: RefundStatus
): readonly RefundStatus[] {
  return ALLOWED[from] ?? [];
}

export function isRefundTransitionAllowed(
  from: RefundStatus,
  to: RefundStatus
): boolean {
  return getAllowedRefundTransitions(from).includes(to);
}

export function assertRefundTransitionAllowed(
  from: RefundStatus,
  to: RefundStatus
): void {
  if (!isRefundTransitionAllowed(from, to)) {
    throw new InvalidRefundStateError(
      `Illegal Refund transition ${from} → ${to}`
    );
  }
}

export function isRefundTerminal(status: RefundStatus): boolean {
  return status === "completed";
}
