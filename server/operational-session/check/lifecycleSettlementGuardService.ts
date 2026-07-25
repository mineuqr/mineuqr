/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — I/O adapter over pure lifecycle settlement guards.
 *
 * Loads Check state and enforces financial completion before terminal ops transitions.
 * All channels (Session close, Self Ordering / Counter Pickup complete) consume this.
 */

import {
  assertOrderCompleteAllowed,
  assertSessionCloseAllowed,
  LifecycleSettlementGuardError,
  LIFECYCLE_SETTLEMENT_GUARDS_PROGRAM_ID,
} from "@shared/operational-session";
import { getActiveCheckForSession } from "./CheckService";
import { findBlockingMembershipForOrder } from "./checkOrderMembershipRepository";

export { LIFECYCLE_SETTLEMENT_GUARDS_PROGRAM_ID, LifecycleSettlementGuardError };

/**
 * Session close — active Check must exist and be paid or complimentary.
 * Does not void, settle, or mutate money.
 */
export async function assertSessionCloseable(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<{ checkId: number; outcome: string }> {
  const check = await getActiveCheckForSession({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
  });
  assertSessionCloseAllowed(check?.outcome ?? null);
  return { checkId: check!.id, outcome: check!.outcome };
}

/**
 * Order → served / pickup complete.
 * Sessionless (Self Ordering / Counter Pickup): enrolled Check must be paid/complimentary.
 * Sessioned (Waiter / Table QR): serve remains operational — no settlement gate.
 */
export async function assertOrderCompletable(input: {
  restaurantId: number;
  orderId: number;
  /** Null/undefined → sessionless Self Ordering / Counter Pickup. */
  sessionId: number | null | undefined;
}): Promise<void> {
  const requiresSettlement = input.sessionId == null;
  if (!requiresSettlement) return;

  const blocking = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId
  );
  assertOrderCompleteAllowed({
    requiresSettlement: true,
    checkOutcome: blocking?.checkOutcome ?? null,
  });
}
