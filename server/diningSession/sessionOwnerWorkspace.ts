/**
 * TABLE-MANAGEMENT-1 UX-1B — owner-facing dining session workspace (read-only).
 */
import { getOrdersBySessionId, type SessionLinkedOrderRow } from "../db";
import type { PublicDiningSessionStatus } from "./sessionPublicStatus";
import { mapTableEventToOwnerTimeline, type OwnerTimelineEvent } from "./sessionOwnerTimeline";
import { findEventsBySessionId, findSessionById } from "./sessionRepository";
import {
  DiningSessionNotFoundError,
  OWNER_TIMELINE_V1_EVENT_TYPES,
} from "./sessionTypes";

export type OwnerSessionOrder = {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

export type OwnerSessionWorkspace = {
  sessionId: number;
  tableNumber: number;
  status: PublicDiningSessionStatus;
  openedAt: string;
  closedAt: string | null;
  orderCount: number;
  ordersTotalAmount: string;
  orders: OwnerSessionOrder[];
  events: OwnerTimelineEvent[];
};

export function computeOrdersTotalAmount(
  orderRows: ReadonlyArray<Pick<SessionLinkedOrderRow, "status" | "totalAmount">>
): string {
  const sum = orderRows.reduce((acc, row) => {
    if (row.status === "cancelled") return acc;
    const amount = Number.parseFloat(String(row.totalAmount ?? "0"));
    return acc + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return sum.toFixed(2);
}

export function computeSessionDurationMs(
  openedAt: string,
  closedAt: string | null,
  status: string,
  now: Date = new Date()
): number {
  const start = Date.parse(openedAt.replace(" ", "T") + (openedAt.includes("T") ? "" : "Z"));
  if (!Number.isFinite(start)) return 0;

  let endMs = now.getTime();
  if (status === "closed" && closedAt) {
    const closed = Date.parse(closedAt.replace(" ", "T") + (closedAt.includes("T") ? "" : "Z"));
    if (Number.isFinite(closed)) {
      endMs = closed;
    }
  }

  return Math.max(0, endMs - start);
}

function mapOrderRow(row: SessionLinkedOrderRow): OwnerSessionOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    totalAmount: String(row.totalAmount),
    createdAt: row.createdAt,
  };
}

export async function getOwnerSessionWorkspace(
  restaurantId: number,
  sessionId: number
): Promise<OwnerSessionWorkspace> {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new DiningSessionNotFoundError();
  }
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new DiningSessionNotFoundError();
  }

  const session = await findSessionById(sessionId);
  if (!session || session.restaurantId !== restaurantId) {
    throw new DiningSessionNotFoundError();
  }

  const [orderRows, eventRows] = await Promise.all([
    getOrdersBySessionId(restaurantId, sessionId),
    findEventsBySessionId(restaurantId, sessionId, {
      eventTypes: OWNER_TIMELINE_V1_EVENT_TYPES,
    }),
  ]);

  const orders = orderRows.map(mapOrderRow);

  return {
    sessionId: session.id,
    tableNumber: session.tableNumber,
    status: session.status as PublicDiningSessionStatus,
    openedAt: session.openedAt,
    closedAt: session.closedAt ?? null,
    orderCount: orders.length,
    ordersTotalAmount: computeOrdersTotalAmount(orderRows),
    orders,
    events: eventRows.map(mapTableEventToOwnerTimeline),
  };
}
