/**
 * OPS-DASHBOARD-2C.1 — active tables board operational read model.
 * SETTLEMENT-ARCHITECTURE-1A — board status simplified to available/occupied.
 */
import { and, asc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { diningSessions, orders, restaurantTables } from "../../drizzle/schema";
import { getDb } from "../db";
import { computeSessionDurationMs } from "../diningSession/sessionOwnerWorkspace";
import { activeDiningSessionStateConditions } from "./activeSessionQuery";
import { formatOpsTableName } from "./tableDisplayName";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";

export type ActiveTableBoardStatus = "available" | "occupied";

export type ActiveTableBoardRow = {
  tableId: number;
  tableName: string;
  sessionId: string | null;
  status: ActiveTableBoardStatus;
  guestCount: number;
  durationMinutes: number;
  totalOrders: number;
  pendingOrders: number;
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

function mapSessionToBoardStatus(hasSession: boolean): ActiveTableBoardStatus {
  return hasSession ? "occupied" : "available";
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
        inArray(orders.status, [...PENDING_ORDER_STATUSES]),
        or(
          isNull(orders.orderingChannel),
          ne(orders.orderingChannel, ORDERING_CHANNEL_CASHIER_POS)
        )
      )
    )
    .groupBy(orders.sessionId);

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.sessionId!, toCount(row.pendingOrders));
  }
  return map;
}

type TableSessionRow = {
  tableId: number;
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
  sessionId: number | null;
  sessionStatus: string | null;
  openedAt: string | null;
  totalOrders: number | null;
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
  const hasSession = row.sessionId != null && row.sessionStatus === "open";
  const boardStatus = mapSessionToBoardStatus(hasSession);

  return {
    tableId: row.tableId,
    tableName: formatTableName(row),
    sessionId: hasSession ? String(row.sessionId) : null,
    status: boardStatus,
    guestCount: 0,
    durationMinutes: hasSession ? computeDurationMinutes(row.openedAt, now) : 0,
    totalOrders: hasSession ? toCount(row.totalOrders) : 0,
    pendingOrders: hasSession ? (pendingBySession.get(row.sessionId!) ?? 0) : 0,
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
