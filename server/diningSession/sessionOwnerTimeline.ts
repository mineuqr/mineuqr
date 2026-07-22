/**
 * TABLE-MANAGEMENT-1 UX-1C — owner-facing dining session timeline (read-only).
 */
import type { SelectTableEvent } from "../../drizzle/schema";
import type { PublicDiningSessionStatus } from "./sessionPublicStatus";
import { findEventsBySessionId, findSessionById } from "./sessionRepository";
import {
  DiningSessionNotFoundError,
  OWNER_TIMELINE_V1_EVENT_TYPES,
  type OwnerTimelineOperationalEventType,
} from "./sessionTypes";

export type OwnerTimelineEvent = {
  id: number;
  eventType: OwnerTimelineOperationalEventType;
  createdAt: string;
  orderId: number | null;
  orderNumber: string | null;
  displayReference: string | null;
  totalAmount: string | null;
};

export type OwnerSessionTimeline = {
  sessionId: number;
  tableNumber: number;
  status: PublicDiningSessionStatus;
  openedAt: string;
  events: OwnerTimelineEvent[];
};

function parseEventMetadata(metadata: SelectTableEvent["metadata"]): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

export function mapTableEventToOwnerTimeline(row: SelectTableEvent): OwnerTimelineEvent {
  const metadata = parseEventMetadata(row.metadata);
  const orderNumber =
    typeof metadata.orderNumber === "string" ? metadata.orderNumber : null;
  // M5 — prefer Check grandTotal on settlement events; fall back to legacy totalAmount.
  const totalAmount =
    metadata.checkGrandTotal != null && metadata.checkGrandTotal !== ""
      ? String(metadata.checkGrandTotal)
      : metadata.totalAmount != null && metadata.totalAmount !== ""
        ? String(metadata.totalAmount)
        : null;

  return {
    id: row.id,
    eventType: row.eventType as OwnerTimelineOperationalEventType,
    createdAt: row.createdAt,
    orderId: row.orderId ?? null,
    orderNumber,
    displayReference: null,
    totalAmount,
  };
}

export async function getOwnerSessionTimeline(
  restaurantId: number,
  sessionId: number
): Promise<OwnerSessionTimeline> {
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

  const rows = await findEventsBySessionId(
    restaurantId,
    sessionId,
    { eventTypes: OWNER_TIMELINE_V1_EVENT_TYPES }
  );

  return {
    sessionId: session.id,
    tableNumber: session.tableNumber,
    status: session.status as PublicDiningSessionStatus,
    openedAt: session.openedAt,
    events: rows.map(mapTableEventToOwnerTimeline),
  };
}
