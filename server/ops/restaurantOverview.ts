/**
 * OPS-DASHBOARD-2B.1 — restaurant operational overview metrics (read-only).
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { diningSessions } from "../../drizzle/schema";
import { getActiveOrdersCount, getDb } from "../db";
import {
  DINING_SESSION_ACTIVE_OPEN_GUARD,
  DINING_SESSION_ACTIVE_STATUSES,
} from "../diningSession/sessionTypes";

export type RestaurantOverviewMetrics = {
  activeSessions: number;
  occupiedTables: number;
  pendingOrders: number;
  billRequests: number;
};

function toCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Active dining session rollups for one restaurant (single indexed query). */
export async function resolveActiveSessionOverviewMetrics(
  restaurantId: number
): Promise<Pick<RestaurantOverviewMetrics, "activeSessions" | "occupiedTables" | "billRequests">> {
  const db = await getDb();
  if (!db) {
    return { activeSessions: 0, occupiedTables: 0, billRequests: 0 };
  }

  const [row] = await db
    .select({
      activeSessions: sql<number>`COUNT(*)`,
      occupiedTables: sql<number>`COUNT(DISTINCT ${diningSessions.tableId})`,
      billRequests: sql<number>`COALESCE(SUM(CASE WHEN ${diningSessions.status} = 'bill_requested' THEN 1 ELSE 0 END), 0)`,
    })
    .from(diningSessions)
    .where(
      and(
        eq(diningSessions.restaurantId, restaurantId),
        eq(diningSessions.openGuard, DINING_SESSION_ACTIVE_OPEN_GUARD),
        inArray(diningSessions.status, [...DINING_SESSION_ACTIVE_STATUSES])
      )
    );

  return {
    activeSessions: toCount(row?.activeSessions),
    occupiedTables: toCount(row?.occupiedTables),
    billRequests: toCount(row?.billRequests),
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
