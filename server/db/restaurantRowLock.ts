/**
 * COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1
 *
 * Restaurant-row lifecycle serialization. Not Commercial occupancy.
 * Callers that mutate restaurant-owned children, and restaurant deletion,
 * lock the same parent row so a child cannot commit after the parent is gone.
 */
import { sql } from "drizzle-orm";

export class RestaurantGoneError extends Error {
  readonly code = "RESTAURANT_GONE";
  readonly restaurantId: number;

  constructor(restaurantId: number) {
    super(`Restaurant ${restaurantId} no longer exists`);
    this.name = "RestaurantGoneError";
    this.restaurantId = restaurantId;
  }
}

export type RestaurantRowLockTx = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

function executeRows(result: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(result)) return [];
  const first = result[0];
  if (Array.isArray(first)) {
    return first as Array<Record<string, unknown>>;
  }
  if (first && typeof first === "object" && "id" in first) {
    return result as Array<Record<string, unknown>>;
  }
  return [];
}

export async function lockRestaurantRowForUpdate(
  tx: RestaurantRowLockTx,
  restaurantId: number
): Promise<{ id: number; userId: number } | null> {
  const result = await tx.execute(sql`
    SELECT id, userId
    FROM restaurants
    WHERE id = ${restaurantId}
    FOR UPDATE
  `);
  const row = executeRows(result)[0];
  if (!row) return null;
  const id = Number(row.id);
  const userId = Number(row.userId);
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(userId) || userId <= 0) {
    return null;
  }
  return { id, userId };
}

export async function requireRestaurantRowForUpdate(
  tx: RestaurantRowLockTx,
  restaurantId: number
): Promise<{ id: number; userId: number }> {
  const row = await lockRestaurantRowForUpdate(tx, restaurantId);
  if (!row) throw new RestaurantGoneError(restaurantId);
  return row;
}
