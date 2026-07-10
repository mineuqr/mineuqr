/**
 * TABLE-MANAGEMENT-1 UX-1B — owner-facing dining session workspace (read-only).
 */
import { getOrdersBySessionId, type SessionLinkedOrderRow } from "../db";
import type { PublicDiningSessionStatus } from "./sessionPublicStatus";
import { mapTableEventToOwnerTimeline, type OwnerTimelineEvent } from "./sessionOwnerTimeline";
import { findEventsBySessionId, findSessionById } from "./sessionRepository";
import { resolveSessionAggregates, type AggregateSource } from "./sessionAggregateReaders";
import { mapOrderDisplayIdentityFields } from "../order/read/presentation/mapOrderDisplayIdentity";
import {
  DiningSessionNotFoundError,
  OWNER_TIMELINE_OPERATIONAL_EVENT_TYPES,
} from "./sessionTypes";

export { computeOrdersTotalAmount } from "./sessionOrderTotals";

export type OwnerSessionOrder = {
  id: number;
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  displayOrderNumber: string;
  displayReference: string;
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
  /** Operational observability — not displayed in UI. */
  aggregateSource: AggregateSource;
  orders: OwnerSessionOrder[];
  events: OwnerTimelineEvent[];
};

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
  const identity = mapOrderDisplayIdentityFields({
    orderNumber: row.orderNumber,
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
  });

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    businessDay: identity.businessDay,
    dailyDisplayNumber: identity.dailyDisplayNumber,
    displayOrderNumber: identity.displayOrderNumber,
    displayReference: identity.displayReference,
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
      eventTypes: OWNER_TIMELINE_OPERATIONAL_EVENT_TYPES,
    }),
  ]);

  const orders = orderRows.map(mapOrderRow);
  const displayReferenceByOrderId = new Map(
    orders.map((order) => [order.id, order.displayReference] as const)
  );
  const aggregates = resolveSessionAggregates({
    session,
    orderRows,
    restaurantId,
    procedure: "session.getOwnerWorkspace",
  });

  return {
    sessionId: session.id,
    tableNumber: session.tableNumber,
    status: session.status as PublicDiningSessionStatus,
    openedAt: session.openedAt,
    closedAt: session.closedAt ?? null,
    orderCount: aggregates.orderCount,
    ordersTotalAmount: aggregates.ordersTotalAmount,
    aggregateSource: aggregates.aggregateSource,
    orders,
    events: eventRows.map((row) => {
      const event = mapTableEventToOwnerTimeline(row);
      if (event.orderId == null) return event;
      const displayReference = displayReferenceByOrderId.get(event.orderId);
      return displayReference != null ? { ...event, displayReference } : event;
    }),
  };
}
