/**
 * REPORTING-PLATFORM-ARCHITECTURE-1 — read adapter for Order Read P-06 / P-10.
 * Completes MySQL SELECT paths for analytics tables without redesigning Order Read writes.
 */

import { and, eq, gte, like, lte } from "drizzle-orm";
import {
  orderReadAnalyticsDaily,
  orderReadOperationalKpiDaily,
} from "../../drizzle/schema";
import { getDb } from "../db";

export type AnalyticsDayRow = Readonly<{
  dayKey: string;
  orderCount: number;
  completedOrderCount: number;
  completedSales: string;
}>;

export type OperationalKpiDayRow = Readonly<{
  dayKey: string;
  activeOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
}>;

export async function readAnalyticsDay(
  restaurantId: number,
  dayKey: string
): Promise<AnalyticsDayRow | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({
      dayKey: orderReadAnalyticsDaily.dayKey,
      orderCount: orderReadAnalyticsDaily.orderCount,
      completedOrderCount: orderReadAnalyticsDaily.completedOrderCount,
      completedSales: orderReadAnalyticsDaily.completedSales,
    })
    .from(orderReadAnalyticsDaily)
    .where(
      and(
        eq(orderReadAnalyticsDaily.restaurantId, restaurantId),
        eq(orderReadAnalyticsDaily.dayKey, dayKey)
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    dayKey: row.dayKey,
    orderCount: Number(row.orderCount ?? 0),
    completedOrderCount: Number(row.completedOrderCount ?? 0),
    completedSales: String(row.completedSales ?? "0.00"),
  };
}

export async function listAnalyticsDaysInMonth(
  restaurantId: number,
  year: number,
  month: number
): Promise<AnalyticsDayRow[]> {
  const db = await getDb();
  if (!db) return [];
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const rows = await db
    .select({
      dayKey: orderReadAnalyticsDaily.dayKey,
      orderCount: orderReadAnalyticsDaily.orderCount,
      completedOrderCount: orderReadAnalyticsDaily.completedOrderCount,
      completedSales: orderReadAnalyticsDaily.completedSales,
    })
    .from(orderReadAnalyticsDaily)
    .where(
      and(
        eq(orderReadAnalyticsDaily.restaurantId, restaurantId),
        like(orderReadAnalyticsDaily.dayKey, `${prefix}%`)
      )
    );
  return rows.map((row) => ({
    dayKey: row.dayKey,
    orderCount: Number(row.orderCount ?? 0),
    completedOrderCount: Number(row.completedOrderCount ?? 0),
    completedSales: String(row.completedSales ?? "0.00"),
  }));
}

export async function listAnalyticsDaysInRange(
  restaurantId: number,
  fromDayKey: string,
  toDayKey: string
): Promise<AnalyticsDayRow[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      dayKey: orderReadAnalyticsDaily.dayKey,
      orderCount: orderReadAnalyticsDaily.orderCount,
      completedOrderCount: orderReadAnalyticsDaily.completedOrderCount,
      completedSales: orderReadAnalyticsDaily.completedSales,
    })
    .from(orderReadAnalyticsDaily)
    .where(
      and(
        eq(orderReadAnalyticsDaily.restaurantId, restaurantId),
        gte(orderReadAnalyticsDaily.dayKey, fromDayKey),
        lte(orderReadAnalyticsDaily.dayKey, toDayKey)
      )
    );
  return rows.map((row) => ({
    dayKey: row.dayKey,
    orderCount: Number(row.orderCount ?? 0),
    completedOrderCount: Number(row.completedOrderCount ?? 0),
    completedSales: String(row.completedSales ?? "0.00"),
  }));
}

export async function readOperationalKpiDay(
  restaurantId: number,
  dayKey: string
): Promise<OperationalKpiDayRow | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({
      dayKey: orderReadOperationalKpiDaily.dayKey,
      activeOrders: orderReadOperationalKpiDaily.activeOrders,
      pendingOrders: orderReadOperationalKpiDaily.pendingOrders,
      preparingOrders: orderReadOperationalKpiDaily.preparingOrders,
      readyOrders: orderReadOperationalKpiDaily.readyOrders,
    })
    .from(orderReadOperationalKpiDaily)
    .where(
      and(
        eq(orderReadOperationalKpiDaily.restaurantId, restaurantId),
        eq(orderReadOperationalKpiDaily.dayKey, dayKey)
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    dayKey: row.dayKey,
    activeOrders: Number(row.activeOrders ?? 0),
    pendingOrders: Number(row.pendingOrders ?? 0),
    preparingOrders: Number(row.preparingOrders ?? 0),
    readyOrders: Number(row.readyOrders ?? 0),
  };
}
