/**
 * OPERATIONAL-SESSION-PLATFORM-1 — generic lifecycle surface.
 *
 * Lifecycle is channel-independent. Table specialization delegates to Dining Session.
 * Non-table persistence / PlaceOrder activation is out of scope.
 */

import {
  closeSession,
  markComplimentary,
  markPaid,
} from "../diningSession/sessionService";

export type OperationalSessionStaffActionInput = {
  restaurantId: number;
  sessionId: number;
  actorUserId: number;
};

/** Close without settlement (table specialization). */
export async function closeOperationalSession(
  input: OperationalSessionStaffActionInput
): Promise<void> {
  await closeSession(input);
}

/** Settle paid then close (table specialization). */
export async function settleOperationalSessionPaid(
  input: OperationalSessionStaffActionInput
): Promise<void> {
  await markPaid(input);
}

/** Settle complimentary then close (table specialization). */
export async function settleOperationalSessionComplimentary(
  input: OperationalSessionStaffActionInput
): Promise<void> {
  await markComplimentary(input);
}

/**
 * Platform lifecycle verbs.
 * Resolve/reuse/create/expire for Order attach live in resolveOperationalSession
 * (table adapter → Dining Session specialization).
 */
export const OPERATIONAL_SESSION_LIFECYCLE_VERBS = Object.freeze([
  "create",
  "resolve",
  "reuse",
  "close",
  "expire",
  "settle_paid",
  "settle_complimentary",
  "anchor_resolve",
] as const);
