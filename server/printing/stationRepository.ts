/**
 * THERMAL-PRINTING-12A — print station persistence queries.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  categories,
  menuItems,
  printJobs,
  printStations,
  type SelectMenuItem,
  type SelectPrintStation,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { PrintJobUnavailableError } from "./printJobTypes";

async function resolveDb() {
  const db = await getDb();
  if (!db) {
    throw new PrintJobUnavailableError();
  }
  return db;
}

export async function listPrintStationsForRestaurant(
  restaurantId: number
): Promise<SelectPrintStation[]> {
  const db = await resolveDb();
  return db
    .select()
    .from(printStations)
    .where(eq(printStations.restaurantId, restaurantId))
    .orderBy(printStations.sortOrder, printStations.id);
}

export async function findPrintStationById(
  stationId: number
): Promise<SelectPrintStation | null> {
  const db = await resolveDb();
  const [row] = await db
    .select()
    .from(printStations)
    .where(eq(printStations.id, stationId))
    .limit(1);
  return row ?? null;
}

export async function getCategoryStationIds(
  restaurantId: number,
  categoryIds: number[]
): Promise<Map<number, number | null>> {
  if (categoryIds.length === 0) {
    return new Map();
  }

  const db = await resolveDb();
  const rows = await db
    .select({
      id: categories.id,
      stationId: categories.stationId,
    })
    .from(categories)
    .where(
      and(eq(categories.restaurantId, restaurantId), inArray(categories.id, categoryIds))
    );

  const map = new Map<number, number | null>();
  for (const row of rows) {
    map.set(row.id, row.stationId ?? null);
  }
  return map;
}

export async function getMenuItemsByIds(menuItemIds: number[]): Promise<SelectMenuItem[]> {
  if (menuItemIds.length === 0) {
    return [];
  }
  const db = await resolveDb();
  return db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds));
}

export async function countPrintJobsByStationForRestaurant(
  restaurantId: number
): Promise<Map<number | null, number>> {
  const db = await resolveDb();
  const rows = await db
    .select({
      stationId: printJobs.stationId,
      count: sql<number>`count(*)`,
    })
    .from(printJobs)
    .where(eq(printJobs.restaurantId, restaurantId))
    .groupBy(printJobs.stationId);

  const counts = new Map<number | null, number>();
  for (const row of rows) {
    counts.set(row.stationId ?? null, Number(row.count));
  }
  return counts;
}
