/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — official Check freeze / recalculation policy.
 *
 * Deterministic rules (normative):
 *
 * 1. Snapshot freeze — at Check create
 *    - Currency Snapshot and Tax Policy Snapshot are captured from Business Settings.
 *    - Service Charge Snapshot slot is reserved (null until feature ships).
 *    - Snapshots NEVER change after create, even if Business Settings change.
 *
 * 2. Totals while outcome === open
 *    - Recalculate when non-cancelled order money for the Session changes
 *      (order attached / order cancelled) or when bill-level discount changes.
 *    - Recalculation ALWAYS uses frozen snapshots — never live settings.
 *
 * 3. Totals freeze — on terminal outcome
 *    - Paid | Complimentary | Voided: perform one final recalculation, then set
 *      totalsFrozenAt. Further recalculation is forbidden.
 *
 * 4. Newly attached Orders (open Check)
 *    - Increase Session order aggregates → recalculate open Check totals.
 *    - Do not re-snapshot tax/currency.
 *
 * 5. Session without Check (legacy open rows)
 *    - ensureOpenCheckForSession creates Check with snapshots from current
 *      Business Settings at ensure-time (first touch), then follows rules 1–4.
 *
 * 6. Split Check — not implemented.
 */

import type { CheckOutcome } from "./checkContract";
import { isOpenCheckOutcome, isTerminalCheckOutcome } from "./checkContract";

export const CHECK_FREEZE_POLICY_ID =
  "CHECK-MANAGEMENT-ARCHITECTURE-1/freeze-v1" as const;

export const BILL_FINANCIAL_LIFECYCLE_PROGRAM_ID =
  "BILL-FINANCIAL-LIFECYCLE-HARDENING-1" as const;

export type CheckRecalculationDecision =
  | { allowed: true; reason: "open_check" }
  | { allowed: false; reason: "totals_frozen_terminal" | "unknown_outcome" };

export function decideCheckRecalculation(
  outcome: CheckOutcome,
  totalsFrozenAt: string | null
): CheckRecalculationDecision {
  if (isOpenCheckOutcome(outcome) && totalsFrozenAt == null) {
    return { allowed: true, reason: "open_check" };
  }
  if (isTerminalCheckOutcome(outcome) || totalsFrozenAt != null) {
    return { allowed: false, reason: "totals_frozen_terminal" };
  }
  return { allowed: false, reason: "unknown_outcome" };
}

export function snapshotsAreImmutable(): true {
  return true;
}

/** OPEN is the only financially mutable Bill state. */
export function isCheckFinanciallyMutable(
  outcome: CheckOutcome,
  totalsFrozenAt: string | null
): boolean {
  return decideCheckRecalculation(outcome, totalsFrozenAt).allowed;
}
