/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — I/O adapter over pure lifecycle settlement guards.
 *
 * Loads Collection Fact presence and enforces financial completion before terminal ops transitions.
 * All channels (Session close, Self Ordering / Counter Pickup complete) consume this.
 */

import {
  assertOrderCompleteAllowed,
  assertSessionCloseAllowed,
  LifecycleSettlementGuardError,
  LIFECYCLE_SETTLEMENT_GUARDS_PROGRAM_ID,
} from "@shared/operational-session";
import { getOrdersBySessionId } from "../../db";
import { findProductionCollectionFactByOrderId } from "../payment/collection-fact/collectionFactRepository";
import { isComplimentaryCollectionFact } from "@shared/pos";

export { LIFECYCLE_SETTLEMENT_GUARDS_PROGRAM_ID, LifecycleSettlementGuardError };

/**
 * Session close — every non-cancelled Order on the session must have a
 * production Collection Fact (Cashier PAID). Check outcome is not authority.
 */
export async function assertSessionCloseable(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<{ checkId: number; outcome: string }> {
  const linked = await getOrdersBySessionId(input.restaurantId, input.sessionId);
  const payable = linked.filter((row) => row.status !== "cancelled");
  let complimentaryOnly = payable.length > 0;
  for (const row of payable) {
    const fact = await findProductionCollectionFactByOrderId({
      restaurantId: input.restaurantId,
      orderId: row.id,
    });
    if (!fact) {
      assertSessionCloseAllowed(null);
    } else if (!isComplimentaryCollectionFact(fact)) {
      complimentaryOnly = false;
    }
  }
  return {
    checkId: 0,
    outcome: complimentaryOnly ? "complimentary" : "paid",
  };
}

/**
 * Order → served / pickup complete.
 * Sessionless (Self Ordering / Counter Pickup): production Collection Fact.
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

  const fact = await findProductionCollectionFactByOrderId({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });
  assertOrderCompleteAllowed({
    requiresSettlement: true,
    checkOutcome: fact ? "paid" : null,
  });
}
