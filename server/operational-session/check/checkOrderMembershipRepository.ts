/**
 * CHECK-GENERALIZATION-M1 — persistence for Check-owned Order membership.
 * Not a separate aggregate. Dual-write only; Session discovery remains money authority.
 */

import { and, eq, inArray } from "drizzle-orm";
import {
  checkOrderMembership,
  operationalChecks,
  type SelectCheckOrderMembership,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type { CheckMembershipEnrolledReason } from "@shared/operational-session";

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

export type MembershipRow = SelectCheckOrderMembership;

/** Active membership on a paid or complimentary Check (operational complete). */
export async function findFinanciallyCompleteMembershipForOrder(
  restaurantId: number,
  orderId: number,
  client?: SessionDbClient
): Promise<{ membership: MembershipRow; checkOutcome: string } | null> {
  const db = await resolveDb(client);
  const rows = await db
    .select({
      membership: checkOrderMembership,
      checkOutcome: operationalChecks.outcome,
    })
    .from(checkOrderMembership)
    .innerJoin(
      operationalChecks,
      eq(checkOrderMembership.checkId, operationalChecks.id)
    )
    .where(
      and(
        eq(checkOrderMembership.restaurantId, restaurantId),
        eq(checkOrderMembership.orderId, orderId),
        eq(checkOrderMembership.active, 1),
        inArray(operationalChecks.outcome, ["paid", "complimentary"])
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { membership: row.membership, checkOutcome: row.checkOutcome };
}

/** Active membership on a non-void Check (blocks second enrollment). */
export async function findBlockingMembershipForOrder(
  restaurantId: number,
  orderId: number,
  client?: SessionDbClient
): Promise<{ membership: MembershipRow; checkOutcome: string } | null> {
  const db = await resolveDb(client);
  const rows = await db
    .select({
      membership: checkOrderMembership,
      checkOutcome: operationalChecks.outcome,
    })
    .from(checkOrderMembership)
    .innerJoin(
      operationalChecks,
      eq(checkOrderMembership.checkId, operationalChecks.id)
    )
    .where(
      and(
        eq(checkOrderMembership.restaurantId, restaurantId),
        eq(checkOrderMembership.orderId, orderId),
        eq(checkOrderMembership.active, 1),
        inArray(operationalChecks.outcome, ["open", "paid", "complimentary"])
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { membership: row.membership, checkOutcome: row.checkOutcome };
}

export async function findMembershipOnCheck(
  restaurantId: number,
  checkId: number,
  orderId: number,
  client?: SessionDbClient
): Promise<MembershipRow | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(checkOrderMembership)
    .where(
      and(
        eq(checkOrderMembership.restaurantId, restaurantId),
        eq(checkOrderMembership.checkId, checkId),
        eq(checkOrderMembership.orderId, orderId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function listActiveOrderIdsForCheck(
  restaurantId: number,
  checkId: number,
  client?: SessionDbClient
): Promise<number[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select({ orderId: checkOrderMembership.orderId })
    .from(checkOrderMembership)
    .where(
      and(
        eq(checkOrderMembership.restaurantId, restaurantId),
        eq(checkOrderMembership.checkId, checkId),
        eq(checkOrderMembership.active, 1)
      )
    );
  return rows.map((r) => r.orderId);
}

export async function insertCheckOrderMembership(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
    enrolledAt: string;
    enrolledReason: CheckMembershipEnrolledReason;
  },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const result = await db.insert(checkOrderMembership).values({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    orderId: input.orderId,
    enrolledAt: input.enrolledAt,
    enrolledReason: input.enrolledReason,
    active: 1,
  });
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new DiningSessionUnavailableError(
      "check_order_membership insert did not return an id"
    );
  }
  return insertId;
}

export async function reactivateCheckOrderMembership(
  input: { restaurantId: number; checkId: number; orderId: number },
  client?: SessionDbClient
): Promise<void> {
  const db = await resolveDb(client);
  await db
    .update(checkOrderMembership)
    .set({ active: 1 })
    .where(
      and(
        eq(checkOrderMembership.restaurantId, input.restaurantId),
        eq(checkOrderMembership.checkId, input.checkId),
        eq(checkOrderMembership.orderId, input.orderId)
      )
    );
}

/** Soft-deactivate all memberships when a Check is voided (allows later re-enroll). */
export async function deactivateMembershipsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<void> {
  const db = await resolveDb(client);
  await db
    .update(checkOrderMembership)
    .set({ active: 0 })
    .where(
      and(
        eq(checkOrderMembership.restaurantId, input.restaurantId),
        eq(checkOrderMembership.checkId, input.checkId),
        eq(checkOrderMembership.active, 1)
      )
    );
}
