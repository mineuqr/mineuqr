/**
 * ORDER-SETTLEMENT-PERSISTENCE-1 — Order Settlement repository.
 *
 * Storage / retrieval / mapping / transactions / concurrency only.
 * MUST NOT evaluate lifecycle, calculate money, or enforce Domain invariants.
 *
 * Concurrency strategy (aligned with Financial Settlement Platform):
 * - Unique (checkId, orderId) prevents double create (ADR-021 safe retries).
 * - Updates use compare-and-set on `status` (`expectedStatus`) so concurrent
 *   writers cannot silently overwrite divergent lifecycle states.
 * - Optional `SessionDbClient` joins caller Check/Membership transactions
 *   (no nested transaction ownership).
 *
 * Hard delete is not provided — terminal rows are retained for history (ADR-022).
 */

import { and, eq } from "drizzle-orm";
import {
  checkOrderSettlements,
  type SelectCheckOrderSettlement,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type {
  OrderSettlement,
  OrderSettlementStatus,
} from "@shared/operational-session";
import {
  mapRowToOrderSettlement,
  toOrderSettlementInsertValues,
  toOrderSettlementUpdateValues,
} from "./orderSettlementMapper";

export class OrderSettlementPersistenceError extends Error {
  readonly code:
    | "NOT_FOUND"
    | "CONFLICT"
    | "DUPLICATE"
    | "UNAVAILABLE";

  constructor(
    code: OrderSettlementPersistenceError["code"],
    message: string
  ) {
    super(message);
    this.name = "OrderSettlementPersistenceError";
    this.code = code;
  }
}

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

function isMysqlDuplicateKeyError(error: unknown): boolean {
  const e = error as { code?: string | number; errno?: number; message?: string };
  return (
    e?.code === "ER_DUP_ENTRY" ||
    e?.errno === 1062 ||
    (typeof e?.message === "string" && e.message.includes("Duplicate"))
  );
}

export type OrderSettlementRow = SelectCheckOrderSettlement;

export async function insertOrderSettlement(
  settlement: OrderSettlement,
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  try {
    const result = await db
      .insert(checkOrderSettlements)
      .values(toOrderSettlementInsertValues(settlement));
    const insertId = Number(result[0].insertId);
    if (!Number.isFinite(insertId) || insertId <= 0) {
      throw new DiningSessionUnavailableError(
        "check_order_settlements insert did not return an id"
      );
    }
    return insertId;
  } catch (error) {
    if (isMysqlDuplicateKeyError(error)) {
      throw new OrderSettlementPersistenceError(
        "DUPLICATE",
        `OrderSettlement already persisted for check=${settlement.checkId} order=${settlement.orderId}`
      );
    }
    throw error;
  }
}

export async function findOrderSettlementByIdentity(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  },
  client?: SessionDbClient
): Promise<OrderSettlement | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(checkOrderSettlements)
    .where(
      and(
        eq(checkOrderSettlements.restaurantId, input.restaurantId),
        eq(checkOrderSettlements.checkId, input.checkId),
        eq(checkOrderSettlements.orderId, input.orderId)
      )
    )
    .limit(1);
  return row ? mapRowToOrderSettlement(row) : null;
}

export async function existsOrderSettlement(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  },
  client?: SessionDbClient
): Promise<boolean> {
  const found = await findOrderSettlementByIdentity(input, client);
  return found != null;
}

export async function listOrderSettlementsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<OrderSettlement[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(checkOrderSettlements)
    .where(
      and(
        eq(checkOrderSettlements.restaurantId, input.restaurantId),
        eq(checkOrderSettlements.checkId, input.checkId)
      )
    );
  return rows.map(mapRowToOrderSettlement);
}

export async function listOrderSettlementsForOrder(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<OrderSettlement[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(checkOrderSettlements)
    .where(
      and(
        eq(checkOrderSettlements.restaurantId, input.restaurantId),
        eq(checkOrderSettlements.orderId, input.orderId)
      )
    );
  return rows.map(mapRowToOrderSettlement);
}

export async function listOrderSettlementsForRestaurant(
  input: { restaurantId: number },
  client?: SessionDbClient
): Promise<OrderSettlement[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(checkOrderSettlements)
    .where(eq(checkOrderSettlements.restaurantId, input.restaurantId));
  return rows.map(mapRowToOrderSettlement);
}

/**
 * Persist Domain entity state.
 * Compare-and-set on `expectedStatus` prevents lost updates / concurrent overwrite.
 */
export async function updateOrderSettlement(
  settlement: OrderSettlement,
  options: { expectedStatus: OrderSettlementStatus },
  client?: SessionDbClient
): Promise<void> {
  const db = await resolveDb(client);
  const result = await db
    .update(checkOrderSettlements)
    .set(toOrderSettlementUpdateValues(settlement))
    .where(
      and(
        eq(checkOrderSettlements.restaurantId, settlement.restaurantId),
        eq(checkOrderSettlements.checkId, settlement.checkId),
        eq(checkOrderSettlements.orderId, settlement.orderId),
        eq(checkOrderSettlements.status, options.expectedStatus)
      )
    );

  const affected = Number(
    (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
  if (affected === 0) {
    const existing = await findOrderSettlementByIdentity(
      {
        restaurantId: settlement.restaurantId,
        checkId: settlement.checkId,
        orderId: settlement.orderId,
      },
      client
    );
    if (!existing) {
      throw new OrderSettlementPersistenceError(
        "NOT_FOUND",
        `OrderSettlement not found for check=${settlement.checkId} order=${settlement.orderId}`
      );
    }
    throw new OrderSettlementPersistenceError(
      "CONFLICT",
      `OrderSettlement concurrency conflict: expected status "${options.expectedStatus}", found "${existing.status}"`
    );
  }
}

/** Alias for update — persist current Domain snapshot with CAS. */
export async function persistOrderSettlement(
  settlement: OrderSettlement,
  options: { expectedStatus: OrderSettlementStatus },
  client?: SessionDbClient
): Promise<void> {
  return updateOrderSettlement(settlement, options, client);
}
