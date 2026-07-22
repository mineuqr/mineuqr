/**
 * Check-owned membership service (ADR-ARCH-020).
 * Membership belongs to Check. Not an aggregate.
 * COMPATIBILITY-CLEANUP-1 — dual-write helpers removed; authoritative enroll/sync/void only.
 */

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
import { ensureOrderSettlementForEnrollment } from "./checkOrderSettlementIntegration";

export class CheckMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckMembershipError";
  }
}

/**
 * Enroll one Order into an open Check (idempotent).
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
 * Authoritative enroll for Session-linked Order.
 * Best-effort (ops-logged) for Session aggregate writers.
 */
export async function enrollOrderForSessionCheck(
  input: {
    restaurantId: number;
    sessionId: number;
    orderId: number;
    checkId?: number | null;
    enrolledReason?: CheckMembershipEnrolledReason;
  },
  client?: SessionDbClient
): Promise<void> {
  try {
    let checkId = input.checkId ?? null;
    if (checkId == null) {
      const open = await findOpenCheckBySessionId(
        input.restaurantId,
        input.sessionId,
        client
      );
      checkId = open?.id ?? null;
    }
    if (checkId == null) return;

    await enrollOrderInCheck(
      {
        restaurantId: input.restaurantId,
        checkId,
        orderId: input.orderId,
        enrolledReason: input.enrolledReason ?? "session_attach",
      },
      client
    );
    // Check Aggregate OS surface — Membership does not mutate OS directly.
    await ensureOrderSettlementForEnrollment(
      {
        restaurantId: input.restaurantId,
        checkId,
        orderId: input.orderId,
      },
      client
    );
  } catch (e) {
    opsLog({
      type: OPS_EVENT.check_membership_dual_write_failed,
      category: "ORDER",
      severity: "error",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: "enrollOrderForSessionCheck",
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
 * Authoritative sync of Session Orders → Check Membership.
 * Visit order list is operational seed; Membership owns finance after.
 */
export async function syncSessionOrdersToCheck(
  input: {
    restaurantId: number;
    sessionId: number;
    checkId: number;
  },
  client?: SessionDbClient
): Promise<void> {
  try {
    const orders = await getOrdersBySessionId(
      input.restaurantId,
      input.sessionId
    );
    for (const order of orders) {
      await enrollOrderInCheck(
        {
          restaurantId: input.restaurantId,
          checkId: input.checkId,
          orderId: order.id,
          enrolledReason: "session_attach",
        },
        client
      );
      await ensureOrderSettlementForEnrollment(
        {
          restaurantId: input.restaurantId,
          checkId: input.checkId,
          orderId: order.id,
        },
        client
      );
    }
  } catch (e) {
    opsLog({
      type: OPS_EVENT.check_membership_dual_write_failed,
      category: "ORDER",
      severity: "error",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: "syncSessionOrdersToCheck",
      metadata: {
        sessionId: input.sessionId,
        checkId: input.checkId,
        error: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

/**
 * Authoritative void deactivate.
 * ORDER-SETTLEMENT-INTEGRATION-1 — must participate in Check Aggregate
 * transaction; failures rethrow so financial mutations roll back atomically.
 */
export async function deactivateMembershipsOnCheckVoid(
  input: {
    restaurantId: number;
    checkId: number;
  },
  client?: SessionDbClient
): Promise<void> {
  try {
    await deactivateMembershipsForCheck(input, client);
  } catch (e) {
    opsLog({
      type: OPS_EVENT.check_membership_dual_write_failed,
      category: "ORDER",
      severity: "error",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: "deactivateMembershipsOnCheckVoid",
      metadata: {
        checkId: input.checkId,
        error: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}
