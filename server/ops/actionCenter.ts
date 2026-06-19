/**
 * OPS-DASHBOARD-2D.1 — action center operational read model.
 * SETTLEMENT-ARCHITECTURE-1A — bill/payment-pending queues removed.
 */
import { and, eq } from "drizzle-orm";
import { diningSessions, restaurantTables } from "../../drizzle/schema";
import { getDb } from "../db";
import { computeSessionDurationMs } from "../diningSession/sessionOwnerWorkspace";
import { activeDiningSessionRestaurantConditions } from "./activeSessionQuery";
import { LONG_RUNNING_SESSION_THRESHOLD_MINUTES } from "./operationalConstants";
import { formatOpsTableName } from "./tableDisplayName";

export type ActionCenterLongRunningSession = {
  sessionId: string;
  tableId: number;
  tableName: string;
  durationMinutes: number;
};

export type ActionCenterResult = {
  generatedAt: string;
  longRunningSessions: ActionCenterLongRunningSession[];
};

export type ActionCenterSessionRow = {
  sessionId: number;
  tableId: number;
  tableNumber: number;
  sessionStatus: "open";
  openedAt: string;
  nameAr: string | null;
  nameEn: string | null;
};

export function computeSessionDurationMinutes(openedAt: string, now: Date): number {
  const ms = computeSessionDurationMs(openedAt, null, "open", now);
  return Math.floor(ms / 60_000);
}

function baseSessionFields(row: ActionCenterSessionRow, now: Date) {
  return {
    sessionId: String(row.sessionId),
    tableId: row.tableId,
    tableName: formatOpsTableName(row),
    durationMinutes: computeSessionDurationMinutes(row.openedAt, now),
  };
}

export function mapActionCenterRows(
  rows: ActionCenterSessionRow[],
  now: Date = new Date(),
  longRunningThresholdMinutes: number = LONG_RUNNING_SESSION_THRESHOLD_MINUTES
): Omit<ActionCenterResult, "generatedAt"> {
  const longRunningSessions: ActionCenterLongRunningSession[] = [];

  for (const row of rows) {
    const base = baseSessionFields(row, now);

    if (base.durationMinutes >= longRunningThresholdMinutes) {
      longRunningSessions.push({
        sessionId: base.sessionId,
        tableId: base.tableId,
        tableName: base.tableName,
        durationMinutes: base.durationMinutes,
      });
    }
  }

  longRunningSessions.sort((a, b) => b.durationMinutes - a.durationMinutes);

  return { longRunningSessions };
}

async function resolveActionCenterSessionRows(
  restaurantId: number
): Promise<ActionCenterSessionRow[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      sessionId: diningSessions.id,
      tableId: diningSessions.tableId,
      tableNumber: diningSessions.tableNumber,
      sessionStatus: diningSessions.status,
      openedAt: diningSessions.openedAt,
      nameAr: restaurantTables.nameAr,
      nameEn: restaurantTables.nameEn,
    })
    .from(diningSessions)
    .leftJoin(
      restaurantTables,
      and(
        eq(restaurantTables.id, diningSessions.tableId),
        eq(restaurantTables.restaurantId, diningSessions.restaurantId)
      )
    )
    .where(activeDiningSessionRestaurantConditions(restaurantId));

  return rows as ActionCenterSessionRow[];
}

export async function getActionCenter(
  restaurantId: number,
  now: Date = new Date()
): Promise<ActionCenterResult> {
  const rows = await resolveActionCenterSessionRows(restaurantId);
  const mapped = mapActionCenterRows(rows, now);

  return {
    generatedAt: now.toISOString(),
    ...mapped,
  };
}
