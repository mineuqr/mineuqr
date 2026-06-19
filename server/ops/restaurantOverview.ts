/**
 * OPS-DASHBOARD-2B.1 — restaurant operational overview metrics (read-only).
 * SETTLEMENT-ARCHITECTURE-1A — bill request metric removed.
 */
import { sql } from "drizzle-orm";
import { diningSessions } from "../../drizzle/schema";
import { getActiveOrdersCount, getDb } from "../db";
import { activeDiningSessionRestaurantConditions } from "./activeSessionQuery";

export type RestaurantOverviewMetrics = {
  activeSessions: number;
  occupiedTables: number;
  pendingOrders: number;
};

function toCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Active dining session rollups for one restaurant (single indexed query). */
export async function resolveActiveSessionOverviewMetrics(
  restaurantId: number
): Promise<Pick<RestaurantOverviewMetrics, "activeSessions" | "occupiedTables">> {
  const db = await getDb();
  if (!db) {
    return { activeSessions: 0, occupiedTables: 0 };
  }

  const [row] = await db
    .select({
      activeSessions: sql<number>`COUNT(*)`,
      occupiedTables: sql<number>`COUNT(DISTINCT ${diningSessions.tableId})`,
    })
    .from(diningSessions)
    .where(activeDiningSessionRestaurantConditions(restaurantId));

  return {
    activeSessions: toCount(row?.activeSessions),
    occupiedTables: toCount(row?.occupiedTables),
  };
}

export async function getRestaurantOverview(
  restaurantId: number
): Promise<RestaurantOverviewMetrics> {
  const [sessionMetrics, pendingOrders] = await Promise.all([
    resolveActiveSessionOverviewMetrics(restaurantId),
    getActiveOrdersCount(restaurantId),
  ]);

  return {
    ...sessionMetrics,
    pendingOrders,
  };
}
