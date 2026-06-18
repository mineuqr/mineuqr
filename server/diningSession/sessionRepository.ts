/**
 * TABLE-MANAGEMENT-1 D2 — dining_sessions / table_events persistence boundary.
 * Only this module performs INSERT/SELECT on session tables.
 */
import { and, eq, inArray } from "drizzle-orm";
import {
  diningSessions,
  tableEvents,
  type InsertDiningSession,
  type InsertTableEvent,
  type SelectDiningSession,
} from "../../drizzle/schema";
import { getDb } from "../db";
import {
  DINING_SESSION_ACTIVE_OPEN_GUARD,
  DINING_SESSION_ACTIVE_STATUSES,
  DiningSessionUnavailableError,
} from "./sessionTypes";

type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type SessionDbClient = DbClient | Parameters<Parameters<DbClient["transaction"]>[0]>[0];

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

export type InsertSessionData = {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  sessionToken: string;
  openedAt: string;
};

export type InsertSessionEventData = {
  restaurantId: number;
  tableId: number;
  sessionId: number;
  orderId?: number;
  eventType: string;
  metadata?: Record<string, unknown>;
};

export async function insertSession(
  data: InsertSessionData,
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const values: InsertDiningSession = {
    restaurantId: data.restaurantId,
    tableId: data.tableId,
    tableNumber: data.tableNumber,
    sessionToken: data.sessionToken,
    status: "open",
    openGuard: DINING_SESSION_ACTIVE_OPEN_GUARD,
    openedAt: data.openedAt,
    totalOrders: 0,
  };

  const result = await db.insert(diningSessions).values(values);
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new DiningSessionUnavailableError("dining_sessions insert did not return an id");
  }
  return insertId;
}

export async function findActiveSession(
  restaurantId: number,
  tableId: number,
  client?: SessionDbClient
): Promise<SelectDiningSession | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(diningSessions)
    .where(
      and(
        eq(diningSessions.restaurantId, restaurantId),
        eq(diningSessions.tableId, tableId),
        eq(diningSessions.openGuard, DINING_SESSION_ACTIVE_OPEN_GUARD),
        inArray(diningSessions.status, [...DINING_SESSION_ACTIVE_STATUSES])
      )
    )
    .limit(1);

  return row ?? null;
}

export async function findSessionByToken(
  restaurantId: number,
  sessionToken: string,
  client?: SessionDbClient
): Promise<SelectDiningSession | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(diningSessions)
    .where(
      and(
        eq(diningSessions.restaurantId, restaurantId),
        eq(diningSessions.sessionToken, sessionToken)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function findSessionById(
  sessionId: number,
  client?: SessionDbClient
): Promise<SelectDiningSession | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(diningSessions)
    .where(eq(diningSessions.id, sessionId))
    .limit(1);

  return row ?? null;
}

export async function insertSessionEvent(
  data: InsertSessionEventData,
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const values: InsertTableEvent = {
    restaurantId: data.restaurantId,
    tableId: data.tableId,
    sessionId: data.sessionId,
    orderId: data.orderId,
    eventType: data.eventType,
    metadata: data.metadata ?? null,
  };

  const result = await db.insert(tableEvents).values(values);
  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new DiningSessionUnavailableError("table_events insert did not return an id");
  }
  return insertId;
}
