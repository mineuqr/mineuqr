/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — pure domain guards.
 *
 * Operational terminal transitions require financial completion on associated Checks.
 * Financial Platform remains the authority for money; this module only validates.
 *
 * Allowed financial completion: paid | complimentary
 * Never auto-settle. Never fabricate payments.
 */

export const LIFECYCLE_SETTLEMENT_GUARDS_PROGRAM_ID =
  "LIFECYCLE-SETTLEMENT-GUARDS-1" as const;

/** Outcomes that count as financial completion for lifecycle terminals. */
export const FINANCIAL_COMPLETION_CHECK_OUTCOMES = [
  "paid",
  "complimentary",
] as const;

export type FinancialCompletionCheckOutcome =
  (typeof FINANCIAL_COMPLETION_CHECK_OUTCOMES)[number];

export type LifecycleSettlementGuardCode =
  | "SESSION_REQUIRES_SETTLEMENT"
  | "ORDER_REQUIRES_SETTLEMENT"
  | "CHECK_NOT_SETTLED";

export class LifecycleSettlementGuardError extends Error {
  readonly code: LifecycleSettlementGuardCode;

  constructor(code: LifecycleSettlementGuardCode, message: string) {
    super(message);
    this.name = "LifecycleSettlementGuardError";
    this.code = code;
  }
}

export function isFinanciallyCompleteCheckOutcome(
  outcome: string | null | undefined
): outcome is FinancialCompletionCheckOutcome {
  return outcome === "paid" || outcome === "complimentary";
}

/** Predicate — Session close allowed when Check is paid or complimentary. */
export function canCloseSession(
  checkOutcome: string | null | undefined
): boolean {
  return isFinanciallyCompleteCheckOutcome(checkOutcome);
}

/**
 * Predicate — Order completion (served / pickup complete).
 * Waiter / Table QR (requiresSettlement=false): always allowed.
 * Self Ordering / Counter Pickup (sessionless): Check must be paid/complimentary.
 */
export function canCompleteOrder(input: {
  requiresSettlement: boolean;
  checkOutcome: string | null | undefined;
}): boolean {
  if (!input.requiresSettlement) return true;
  return isFinanciallyCompleteCheckOutcome(input.checkOutcome);
}

/**
 * Central validation for terminal lifecycle transitions.
 * Throws LifecycleSettlementGuardError with explicit business codes.
 */
export function validateSettlementBeforeTerminalTransition(input: {
  kind: "session_close" | "order_complete";
  checkOutcome: string | null | undefined;
  /** Order complete only — false for Waiter/Table QR serve. */
  requiresSettlement?: boolean;
}): void {
  if (input.kind === "session_close") {
    if (!canCloseSession(input.checkOutcome)) {
      throw new LifecycleSettlementGuardError(
        "SESSION_REQUIRES_SETTLEMENT",
        "Cannot close session before settlement."
      );
    }
    return;
  }

  if (
    !canCompleteOrder({
      requiresSettlement: input.requiresSettlement ?? true,
      checkOutcome: input.checkOutcome,
    })
  ) {
    throw new LifecycleSettlementGuardError(
      "ORDER_REQUIRES_SETTLEMENT",
      "Cannot complete order before settlement."
    );
  }
}

export function assertSessionCloseAllowed(
  checkOutcome: string | null | undefined
): void {
  validateSettlementBeforeTerminalTransition({
    kind: "session_close",
    checkOutcome,
  });
}

export function assertOrderCompleteAllowed(input: {
  requiresSettlement: boolean;
  checkOutcome: string | null | undefined;
}): void {
  validateSettlementBeforeTerminalTransition({
    kind: "order_complete",
    checkOutcome: input.checkOutcome,
    requiresSettlement: input.requiresSettlement,
  });
}
