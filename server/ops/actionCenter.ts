/**
 * OPS-DASHBOARD-2D.1 — action center operational read model.
 */
import { and, eq } from "drizzle-orm";
import { diningSessions, restaurantTables } from "../../drizzle/schema";
import { getDb } from "../db";
import { computeSessionDurationMs } from "../diningSession/sessionOwnerWorkspace";
import { activeDiningSessionRestaurantConditions } from "./activeSessionQuery";
import { LONG_RUNNING_SESSION_THRESHOLD_MINUTES } from "./operationalConstants";
import { formatOpsTableName } from "./tableDisplayName";

export type ActionCenterBillRequest = {
  sessionId: string;
  tableId: number;
  tableName: string;
  requestedAt: string;
  waitMinutes: number;
};

export type ActionCenterPaymentPending = {
  sessionId: string;
  tableId: number;
  tableName: string;
  pendingSince: string;
  waitMinutes: number;
};

export type ActionCenterLongRunningSession = {
  sessionId: string;
  tableId: number;
  tableName: string;
  durationMinutes: number;
};

export type ActionCenterResult = {
  generatedAt: string;
  billRequests: ActionCenterBillRequest[];
  paymentPending: ActionCenterPaymentPending[];
  longRunningSessions: ActionCenterLongRunningSession[];
};

export type ActionCenterSessionRow = {
  sessionId: number;
  tableId: number;
  tableNumber: number;
  sessionStatus: "open" | "bill_requested" | "payment_pending";
  openedAt: string;
  billRequestedAt: string | null;
  paymentPendingAt: string | null;
  nameAr: string | null;
  nameEn: string | null;
};

function parseTimestampMs(value: string): number {
  const normalized = value.replace(" ", "T") + (value.includes("T") ? "" : "Z");
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

export function computeWaitMinutes(from: string | null, now: Date): number {
  if (!from) return 0;
  const startMs = parseTimestampMs(from);
  if (!Number.isFinite(startMs)) return 0;
  return Math.max(0, Math.floor((now.getTime() - startMs) / 60_000));
}

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
  const billRequests: ActionCenterBillRequest[] = [];
  const paymentPending: ActionCenterPaymentPending[] = [];
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

    if (row.sessionStatus === "bill_requested") {
      const requestedAt = row.billRequestedAt ?? row.openedAt;
      billRequests.push({
        sessionId: base.sessionId,
        tableId: base.tableId,
        tableName: base.tableName,
        requestedAt,
        waitMinutes: computeWaitMinutes(requestedAt, now),
      });
    }

    if (row.sessionStatus === "payment_pending") {
      const pendingSince = row.paymentPendingAt ?? row.openedAt;
      paymentPending.push({
        sessionId: base.sessionId,
        tableId: base.tableId,
        tableName: base.tableName,
        pendingSince,
        waitMinutes: computeWaitMinutes(pendingSince, now),
      });
    }
  }

  billRequests.sort((a, b) => b.waitMinutes - a.waitMinutes);
  paymentPending.sort((a, b) => b.waitMinutes - a.waitMinutes);
  longRunningSessions.sort((a, b) => b.durationMinutes - a.durationMinutes);

  return { billRequests, paymentPending, longRunningSessions };
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
      billRequestedAt: diningSessions.billRequestedAt,
      paymentPendingAt: diningSessions.paymentPendingAt,
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
