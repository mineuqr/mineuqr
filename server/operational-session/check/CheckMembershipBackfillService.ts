/**
 * CHECK-GENERALIZATION-M1 — prepare membership backfill from Session Orders.
 *
 * Does NOT run against production from app boot.
 * Execute only via confirm-gated CLI (see scripts/).
 *
 * Backfill writes membership only — does not change Check money or cut over reads.
 */

import { and, eq, inArray } from "drizzle-orm";
import { operationalChecks } from "../../../drizzle/schema";
import { getDb, getOrdersBySessionId } from "../../db";
import { enrollOrderInCheck } from "./checkMembershipService";
import { ensureOrderSettlementForEnrollment } from "./checkOrderSettlementIntegration";

/** Voided Checks are skipped — membership was deactivated / not authoritative history. */
const BACKFILL_OUTCOMES = ["open", "paid", "complimentary"] as const;

export type MembershipBackfillScope = "full" | "tenant";

export type MembershipBackfillResult = {
  restaurantsProcessed: number;
  checksProcessed: number;
  membershipsEnrolled: number;
  membershipsAlready: number;
  errors: string[];
};

/**
 * Enroll Session Orders onto each Check that has a sessionId.
 * Idempotent. Safe to re-run.
 */
export async function backfillCheckOrderMembership(input: {
  scope: MembershipBackfillScope;
  restaurantId?: number;
}): Promise<MembershipBackfillResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const result: MembershipBackfillResult = {
    restaurantsProcessed: 0,
    checksProcessed: 0,
    membershipsEnrolled: 0,
    membershipsAlready: 0,
    errors: [],
  };

  const checkRows =
    input.scope === "tenant" && input.restaurantId != null
      ? await db
          .select({
            id: operationalChecks.id,
            restaurantId: operationalChecks.restaurantId,
            sessionId: operationalChecks.sessionId,
          })
          .from(operationalChecks)
          .where(
            and(
              eq(operationalChecks.restaurantId, input.restaurantId),
              inArray(operationalChecks.outcome, [...BACKFILL_OUTCOMES])
            )
          )
      : await db
          .select({
            id: operationalChecks.id,
            restaurantId: operationalChecks.restaurantId,
            sessionId: operationalChecks.sessionId,
          })
          .from(operationalChecks)
          .where(inArray(operationalChecks.outcome, [...BACKFILL_OUTCOMES]));

  const restaurantIds = new Set<number>();

  for (const check of checkRows) {
    restaurantIds.add(check.restaurantId);
    result.checksProcessed += 1;
    try {
      const orders = await getOrdersBySessionId(
        check.restaurantId,
        check.sessionId
      );
      for (const order of orders) {
        try {
          const status = await enrollOrderInCheck({
            restaurantId: check.restaurantId,
            checkId: check.id,
            orderId: order.id,
            enrolledReason: "backfill",
          });
          await ensureOrderSettlementForEnrollment({
            restaurantId: check.restaurantId,
            checkId: check.id,
            orderId: order.id,
          });
          if (status === "enrolled") result.membershipsEnrolled += 1;
          else if (status === "already") result.membershipsAlready += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push(`check=${check.id} order=${order.id}: ${msg}`);
        }
      }
    } catch (e) {
      result.errors.push(
        `check=${check.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  result.restaurantsProcessed = restaurantIds.size;
  return result;
}

/** Dry-run counts only — no writes. */
export async function dryRunCheckOrderMembershipBackfill(input: {
  scope: MembershipBackfillScope;
  restaurantId?: number;
}): Promise<{ checks: number; sessionOrders: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const checkRows =
    input.scope === "tenant" && input.restaurantId != null
      ? await db
          .select({
            id: operationalChecks.id,
            restaurantId: operationalChecks.restaurantId,
            sessionId: operationalChecks.sessionId,
          })
          .from(operationalChecks)
          .where(
            and(
              eq(operationalChecks.restaurantId, input.restaurantId),
              inArray(operationalChecks.outcome, [...BACKFILL_OUTCOMES])
            )
          )
      : await db
          .select({
            id: operationalChecks.id,
            restaurantId: operationalChecks.restaurantId,
            sessionId: operationalChecks.sessionId,
          })
          .from(operationalChecks)
          .where(inArray(operationalChecks.outcome, [...BACKFILL_OUTCOMES]));

  let sessionOrders = 0;
  for (const check of checkRows) {
    const orders = await getOrdersBySessionId(
      check.restaurantId,
      check.sessionId
    );
    sessionOrders += orders.length;
  }
  return { checks: checkRows.length, sessionOrders };
}
