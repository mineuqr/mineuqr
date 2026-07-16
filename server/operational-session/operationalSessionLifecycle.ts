/**
 * OPERATIONAL-SESSION-PLATFORM-1 — generic lifecycle surface.
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — Check settle/void verbs (Session Platform).
 *
 * Lifecycle is channel-independent. Table specialization delegates to Dining Session.
 * Check sub-domain owns monetary settlement outcomes; Session owns visit close.
 */

import {
  closeSession,
  markComplimentary,
  markPaid,
} from "../diningSession/sessionService";
import type { OperationalCheck } from "@shared/operational-session";
import { getActiveCheckForSession, voidCheck } from "./check";

export type OperationalSessionStaffActionInput = {
  restaurantId: number;
  sessionId: number;
  actorUserId: number;
};

/** Close without settlement (table specialization) — voids open Check. */
export async function closeOperationalSession(
  input: OperationalSessionStaffActionInput
): Promise<void> {
  await closeSession(input);
}

/** Settle paid then close (table specialization) — finalizes Check Paid. */
export async function settleOperationalSessionPaid(
  input: OperationalSessionStaffActionInput
): Promise<void> {
  await markPaid(input);
}

/** Settle complimentary then close — finalizes Check Complimentary. */
export async function settleOperationalSessionComplimentary(
  input: OperationalSessionStaffActionInput
): Promise<void> {
  await markComplimentary(input);
}

/** Void Check without Session close (staff ops). */
export async function voidOperationalSessionCheck(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck> {
  return voidCheck(input);
}

export async function getOperationalSessionActiveCheck(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck | null> {
  return getActiveCheckForSession(input);
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
  "void_check",
  "anchor_resolve",
] as const);
