/**
 * OPS-DASHBOARD-2C.1 — active tables board operational read model.
 */
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { diningSessions, orders, restaurantTables } from "../../drizzle/schema";
import { getDb } from "../db";
import { computeSessionDurationMs } from "../diningSession/sessionOwnerWorkspace";
import type { DiningSessionActiveStatus } from "../diningSession/sessionTypes";
import { activeDiningSessionStateConditions } from "./activeSessionQuery";
import { formatOpsTableName } from "./tableDisplayName";

export type ActiveTableBoardStatus =
  | "available"
  | "occupied"
  | "bill_requested"
  | "payment_pending";

export type ActiveTableBoardRow = {
  tableId: number;
  tableName: string;
  sessionId: string | null;
  status: ActiveTableBoardStatus;
  guestCount: number;
  durationMinutes: number;
  totalOrders: number;
  pendingOrders: number;
  billRequested: boolean;
};

export type ActiveTablesBoardResult = {
  generatedAt: string;
  tables: ActiveTableBoardRow[];
};

const PENDING_ORDER_STATUSES = ["pending", "preparing", "ready"] as const;

function toCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatTableName(row: {
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
}): string {
  return formatOpsTableName(row);
}

function mapSessionToBoardStatus(
  sessionStatus: DiningSessionActiveStatus | null
): ActiveTableBoardStatus {
  if (!sessionStatus) return "available";
  if (sessionStatus === "open") return "occupied";
  if (sessionStatus === "bill_requested") return "bill_requested";
  return "payment_pending";
}

function computeDurationMinutes(openedAt: string | null, now: Date): number {
  if (!openedAt) return 0;
  const ms = computeSessionDurationMs(openedAt, null, "open", now);
  return Math.floor(ms / 60_000);
}

async function resolvePendingOrdersBySessionId(
  restaurantId: number
): Promise<Map<number, number>> {
  const db = await getDb();
  if (!db) return new Map();

  const rows = await db
    .select({
      sessionId: orders.sessionId,
      pendingOrders: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        isNotNull(orders.sessionId),
        inArray(orders.status, [...PENDING_ORDER_STATUSES])
      )
    )
    .groupBy(orders.sessionId);

  const map = new Map<number, number>();
  for (const row of rows) {
    if (row.sessionId != null) {
      map.set(row.sessionId, toCount(row.pendingOrders));
    }
  }
  return map;
}

type TableSessionRow = {
  tableId: number;
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
  sessionId: number | null;
  sessionStatus: DiningSessionActiveStatus | null;
  openedAt: string | null;
  totalOrders: number | null;
  billRequestedAt: string | null;
};

async function resolveTableSessionRows(restaurantId: number): Promise<TableSessionRow[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      tableId: restaurantTables.id,
      tableNumber: restaurantTables.tableNumber,
      nameAr: restaurantTables.nameAr,
      nameEn: restaurantTables.nameEn,
      sessionId: diningSessions.id,
      sessionStatus: diningSessions.status,
      openedAt: diningSessions.openedAt,
      totalOrders: diningSessions.totalOrders,
      billRequestedAt: diningSessions.billRequestedAt,
    })
    .from(restaurantTables)
    .leftJoin(
      diningSessions,
      and(
        eq(diningSessions.tableId, restaurantTables.id),
        eq(diningSessions.restaurantId, restaurantTables.restaurantId),
        activeDiningSessionStateConditions()
      )
    )
    .where(
      and(eq(restaurantTables.restaurantId, restaurantId), eq(restaurantTables.isActive, true))
    )
    .orderBy(asc(restaurantTables.tableNumber));

  return rows as TableSessionRow[];
}

export function mapTableSessionRowToBoardRow(
  row: TableSessionRow,
  pendingBySession: Map<number, number>,
  now: Date
): ActiveTableBoardRow {
  const sessionStatus = row.sessionStatus as DiningSessionActiveStatus | null;
  const hasSession = row.sessionId != null && sessionStatus != null;
  const boardStatus = mapSessionToBoardStatus(sessionStatus);

  return {
    tableId: row.tableId,
    tableName: formatTableName(row),
    sessionId: hasSession ? String(row.sessionId) : null,
    status: boardStatus,
    guestCount: 0,
    durationMinutes: hasSession ? computeDurationMinutes(row.openedAt, now) : 0,
    totalOrders: hasSession ? toCount(row.totalOrders) : 0,
    pendingOrders: hasSession ? (pendingBySession.get(row.sessionId!) ?? 0) : 0,
    billRequested:
      hasSession &&
      (boardStatus === "bill_requested" ||
        boardStatus === "payment_pending" ||
        row.billRequestedAt != null),
  };
}

export async function getActiveTablesBoard(
  restaurantId: number,
  now: Date = new Date()
): Promise<ActiveTablesBoardResult> {
  const [tableRows, pendingBySession] = await Promise.all([
    resolveTableSessionRows(restaurantId),
    resolvePendingOrdersBySessionId(restaurantId),
  ]);

  return {
    generatedAt: now.toISOString(),
    tables: tableRows.map((row) => mapTableSessionRowToBoardRow(row, pendingBySession, now)),
  };
}
