/**
 * CHECK-GENERALIZATION-M1 — Check-owned membership dual-write service.
 *
 * ADR-ARCH-020: Membership belongs to Check. Not an aggregate.
 * M1: Dual-write enrollment. M3: money discovery is membership-authoritative by default.
 * Failures are best-effort (ops-logged) so waiter/session flows never regress.
 */

import { ENV } from "../../_core/env";
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import { getOrderById, getOrdersBySessionId } from "../../db";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type { CheckMembershipEnrolledReason } from "@shared/operational-session";
import { findCheckById, findOpenCheckBySessionId } from "./checkRepository";
import {
  deactivateMembershipsForCheck,
  findBlockingMembershipForOrder,
  findMembershipOnCheck,
  insertCheckOrderMembership,
  reactivateCheckOrderMembership,
} from "./checkOrderMembershipRepository";

export class CheckMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckMembershipError";
  }
}

function dualWriteEnabled(): boolean {
  return ENV.checkMembershipDualWrite;
}

/**
 * Enroll one Order into an open Check (idempotent).
 * Check-owned command (ADR-ARCH-020 / M4) — not gated by dual-write.
 * Dual-write helpers remain best-effort and flag-gated separately.
 * Does NOT recalculate Check money — callers invoke recalc.
 */
export async function enrollOrderInCheck(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
    enrolledReason: CheckMembershipEnrolledReason;
  },
  client?: SessionDbClient
): Promise<"enrolled" | "already"> {
  const check = await findCheckById(input.checkId, client);
  if (!check || check.restaurantId !== input.restaurantId) {
    throw new CheckMembershipError("Check not found for enrollment");
  }
  // Live dual-write: open Checks only. Backfill may enroll historical paid/comp.
  if (check.outcome !== "open") {
    if (input.enrolledReason !== "backfill") {
      throw new CheckMembershipError("Cannot enroll into a non-open Check");
    }
    if (check.outcome === "voided") {
      throw new CheckMembershipError("Cannot backfill membership onto a voided Check");
    }
  }

  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new CheckMembershipError("Order not found for enrollment");
  }

  const existingOnCheck = await findMembershipOnCheck(
    input.restaurantId,
    input.checkId,
    input.orderId,
    client
  );
  if (existingOnCheck) {
    if (existingOnCheck.active === 1) return "already";
    await reactivateCheckOrderMembership(
      {
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        orderId: input.orderId,
      },
      client
    );
    return "enrolled";
  }

  const blocking = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId,
    client
  );
  if (blocking && blocking.membership.checkId !== input.checkId) {
    throw new CheckMembershipError(
      `Order ${input.orderId} already enrolled on Check ${blocking.membership.checkId}`
    );
  }

  await insertCheckOrderMembership(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      orderId: input.orderId,
      enrolledAt: formatDiningSessionTimestamp(),
      enrolledReason: input.enrolledReason,
    },
    client
  );
  return "enrolled";
}

/**
 * Dual-write helper: enroll Order into Session's open Check.
 * Best-effort — never throws to callers of Session aggregate writers.
 */
export async function dualWriteEnrollOrderForSession(input: {
  restaurantId: number;
  sessionId: number;
  orderId: number;
  checkId?: number | null;
  enrolledReason?: CheckMembershipEnrolledReason;
}): Promise<void> {
  if (!dualWriteEnabled()) return;

  try {
    let checkId = input.checkId ?? null;
    if (checkId == null) {
      const open = await findOpenCheckBySessionId(
        input.restaurantId,
        input.sessionId
      );
      checkId = open?.id ?? null;
    }
    if (checkId == null) return;

    await enrollOrderInCheck({
      restaurantId: input.restaurantId,
      checkId,
      orderId: input.orderId,
      enrolledReason: input.enrolledReason ?? "session_attach",
    });
  } catch (e) {
    opsLog({
      type: OPS_EVENT.check_membership_dual_write_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: "dualWriteEnrollOrderForSession",
      metadata: {
        sessionId: input.sessionId,
        orderId: input.orderId,
        checkId: input.checkId ?? null,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

/**
 * After Check create/ensure: enroll all current Session Orders (idempotent).
 * Best-effort.
 */
export async function dualWriteSyncSessionOrdersToCheck(input: {
  restaurantId: number;
  sessionId: number;
  checkId: number;
}): Promise<void> {
  if (!dualWriteEnabled()) return;

  try {
    const orders = await getOrdersBySessionId(
      input.restaurantId,
      input.sessionId
    );
    for (const order of orders) {
      await enrollOrderInCheck({
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        orderId: order.id,
        enrolledReason: "session_attach",
      });
    }
  } catch (e) {
    opsLog({
      type: OPS_EVENT.check_membership_dual_write_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: "dualWriteSyncSessionOrdersToCheck",
      metadata: {
        sessionId: input.sessionId,
        checkId: input.checkId,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

/** Called when Check is voided — soft-deactivate memberships (best-effort). */
export async function dualWriteDeactivateMembershipsOnVoid(input: {
  restaurantId: number;
  checkId: number;
}): Promise<void> {
  if (!dualWriteEnabled()) return;
  try {
    await deactivateMembershipsForCheck(input);
  } catch (e) {
    opsLog({
      type: OPS_EVENT.check_membership_dual_write_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: "dualWriteDeactivateMembershipsOnVoid",
      metadata: {
        checkId: input.checkId,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}
