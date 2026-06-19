/**
 * OPS-DASHBOARD-2E.1 — restaurant operational activity feed (read-only).
 *
 * Authoritative event source mapping (V1):
 *
 * | Feed eventType          | Authoritative source | Writer / ownership                          |
 * |-------------------------|----------------------|---------------------------------------------|
 * | session_opened          | table_events         | sessionService.createSession (SESSION_OPENED) |
 * | order_created           | table_events         | order.create via recordSessionEvent         |
 * | bill_requested          | table_events         | sessionService bill-request transitions     |
 * | payment_pending         | table_events         | sessionService payment-pending transitions  |
 * | session_closed          | table_events         | sessionService closeSession                 |
 * | order_status_changed    | orders               | order.updateStatus (updatedAt proxy)        |
 *
 * NOT used: audit_events, notifications, analytics, workspace/timeline readers.
 *
 * order_status_changed note: only the latest status change per order is available
 * (orders.updatedAt when updatedAt > createdAt). Intermediate hops are not persisted.
 *
 * order_created note: emitted only when TABLE_SESSION_DUAL_WRITE records ORDER_CREATED
 * in table_events; orders without that row will not appear as order_created.
 */
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { orders, restaurantTables, tableEvents } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  TABLE_EVENT_TYPES,
  type TableEventType,
} from "../diningSession/sessionTypes";
import {
  ACTIVITY_FEED_DEFAULT_LIMIT,
  ACTIVITY_FEED_MAX_LIMIT,
} from "./operationalConstants";
import { formatOpsTableName } from "./tableDisplayName";

export type ActivityFeedEventType =
  | "session_opened"
  | "order_created"
  | "order_status_changed"
  | "bill_requested"
  | "payment_pending"
  | "session_closed";

export type ActivityFeedEvent = {
  eventType: ActivityFeedEventType;
  occurredAt: string;
  sessionId: string | null;
  tableId: number | null;
  tableName: string | null;
  title: string;
  subtitle: string | null;
};

export type ActivityFeedResult = {
  generatedAt: string;
  events: ActivityFeedEvent[];
};

/** table_events rows included in the restaurant activity feed. */
export const ACTIVITY_FEED_TABLE_EVENT_TYPES = [
  TABLE_EVENT_TYPES.SESSION_OPENED,
  TABLE_EVENT_TYPES.ORDER_CREATED,
  TABLE_EVENT_TYPES.BILL_REQUESTED,
  TABLE_EVENT_TYPES.PAYMENT_PENDING,
  TABLE_EVENT_TYPES.SESSION_CLOSED,
] as const satisfies readonly TableEventType[];

const TABLE_EVENT_TO_FEED_TYPE: Record<
  (typeof ACTIVITY_FEED_TABLE_EVENT_TYPES)[number],
  ActivityFeedEventType
> = {
  [TABLE_EVENT_TYPES.SESSION_OPENED]: "session_opened",
  [TABLE_EVENT_TYPES.ORDER_CREATED]: "order_created",
  [TABLE_EVENT_TYPES.BILL_REQUESTED]: "bill_requested",
  [TABLE_EVENT_TYPES.PAYMENT_PENDING]: "payment_pending",
  [TABLE_EVENT_TYPES.SESSION_CLOSED]: "session_closed",
};

export type ActivityFeedTableEventRow = {
  eventType: string;
  occurredAt: string;
  sessionId: number | null;
  tableId: number;
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
  metadata: unknown;
};

export type ActivityFeedOrderStatusRow = {
  occurredAt: string;
  sessionId: number | null;
  tableId: number;
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
  orderNumber: string;
  status: string;
};

function parseEventMetadata(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

export function parseFeedTimestampMs(value: string): number {
  const normalized = value.replace(" ", "T") + (value.includes("T") ? "" : "Z");
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

export function resolveTableDisplayName(row: {
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
}): string {
  return formatOpsTableName(row);
}

export function mapTableEventTypeToFeedType(
  eventType: string
): ActivityFeedEventType | null {
  if (!(ACTIVITY_FEED_TABLE_EVENT_TYPES as readonly string[]).includes(eventType)) {
    return null;
  }
  return TABLE_EVENT_TO_FEED_TYPE[eventType as (typeof ACTIVITY_FEED_TABLE_EVENT_TYPES)[number]];
}

export function buildTableEventFeedCopy(
  feedType: ActivityFeedEventType,
  tableName: string,
  metadata: Record<string, unknown>
): { title: string; subtitle: string | null } {
  switch (feedType) {
    case "session_opened":
      return { title: "Session opened", subtitle: tableName };
    case "order_created": {
      const orderNumber =
        typeof metadata.orderNumber === "string" ? metadata.orderNumber : null;
      return {
        title: "Order created",
        subtitle: orderNumber ? `#${orderNumber} · ${tableName}` : tableName,
      };
    }
    case "bill_requested":
      return { title: "Bill requested", subtitle: tableName };
    case "payment_pending":
      return { title: "Payment pending", subtitle: tableName };
    case "session_closed":
      return { title: "Session closed", subtitle: tableName };
    default:
      return { title: feedType, subtitle: tableName };
  }
}

export function mapTableEventRowToFeedEvent(row: ActivityFeedTableEventRow): ActivityFeedEvent | null {
  const feedType = mapTableEventTypeToFeedType(row.eventType);
  if (!feedType) return null;

  const tableName = resolveTableDisplayName(row);
  const metadata = parseEventMetadata(row.metadata);
  const { title, subtitle } = buildTableEventFeedCopy(feedType, tableName, metadata);

  return {
    eventType: feedType,
    occurredAt: row.occurredAt,
    sessionId: row.sessionId != null ? String(row.sessionId) : null,
    tableId: row.tableId,
    tableName,
    title,
    subtitle,
  };
}

export function mapOrderStatusRowToFeedEvent(row: ActivityFeedOrderStatusRow): ActivityFeedEvent {
  const tableName = resolveTableDisplayName(row);

  return {
    eventType: "order_status_changed",
    occurredAt: row.occurredAt,
    sessionId: row.sessionId != null ? String(row.sessionId) : null,
    tableId: row.tableId,
    tableName,
    title: "Order status updated",
    subtitle: `#${row.orderNumber} · ${row.status} · ${tableName}`,
  };
}

export function mergeActivityFeedEvents(
  events: ActivityFeedEvent[],
  limit: number
): ActivityFeedEvent[] {
  const cappedLimit = Math.max(1, Math.min(limit, ACTIVITY_FEED_MAX_LIMIT));

  return [...events]
    .sort((a, b) => {
      const bMs = parseFeedTimestampMs(b.occurredAt);
      const aMs = parseFeedTimestampMs(a.occurredAt);
      if (Number.isFinite(bMs) && Number.isFinite(aMs) && bMs !== aMs) {
        return bMs - aMs;
      }
      if (Number.isFinite(bMs) && !Number.isFinite(aMs)) return -1;
      if (!Number.isFinite(bMs) && Number.isFinite(aMs)) return 1;
      return 0;
    })
    .slice(0, cappedLimit);
}

export function normalizeActivityFeedLimit(limit?: number): number {
  if (limit == null) return ACTIVITY_FEED_DEFAULT_LIMIT;
  if (!Number.isFinite(limit) || limit <= 0) return ACTIVITY_FEED_DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), ACTIVITY_FEED_MAX_LIMIT);
}

async function resolveTableEventFeedRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  restaurantId: number,
  limit: number
): Promise<ActivityFeedTableEventRow[]> {
  const rows = await db
    .select({
      eventType: tableEvents.eventType,
      occurredAt: tableEvents.createdAt,
      sessionId: tableEvents.sessionId,
      tableId: tableEvents.tableId,
      tableNumber: restaurantTables.tableNumber,
      nameAr: restaurantTables.nameAr,
      nameEn: restaurantTables.nameEn,
      metadata: tableEvents.metadata,
    })
    .from(tableEvents)
    .leftJoin(
      restaurantTables,
      and(
        eq(restaurantTables.id, tableEvents.tableId),
        eq(restaurantTables.restaurantId, tableEvents.restaurantId)
      )
    )
    .where(
      and(
        eq(tableEvents.restaurantId, restaurantId),
        inArray(tableEvents.eventType, [...ACTIVITY_FEED_TABLE_EVENT_TYPES])
      )
    )
    .orderBy(desc(tableEvents.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    eventType: row.eventType,
    occurredAt: row.occurredAt,
    sessionId: row.sessionId,
    tableId: row.tableId,
    tableNumber: row.tableNumber ?? 0,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    metadata: row.metadata,
  }));
}

async function resolveOrderStatusFeedRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  restaurantId: number,
  limit: number
): Promise<ActivityFeedOrderStatusRow[]> {
  const rows = await db
    .select({
      occurredAt: orders.updatedAt,
      sessionId: orders.sessionId,
      tableId: orders.tableId,
      tableNumber: orders.tableNumber,
      nameAr: restaurantTables.nameAr,
      nameEn: restaurantTables.nameEn,
      orderNumber: orders.orderNumber,
      status: orders.status,
    })
    .from(orders)
    .leftJoin(
      restaurantTables,
      and(
        eq(restaurantTables.id, orders.tableId),
        eq(restaurantTables.restaurantId, orders.restaurantId)
      )
    )
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gt(orders.updatedAt, orders.createdAt)
      )
    )
    .orderBy(desc(orders.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    occurredAt: row.occurredAt,
    sessionId: row.sessionId,
    tableId: row.tableId,
    tableNumber: row.tableNumber,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    orderNumber: row.orderNumber,
    status: row.status,
  }));
}

export async function getActivityFeed(
  restaurantId: number,
  options?: { limit?: number; now?: Date }
): Promise<ActivityFeedResult> {
  const now = options?.now ?? new Date();
  const limit = normalizeActivityFeedLimit(options?.limit);

  const db = await getDb();
  if (!db) {
    return { generatedAt: now.toISOString(), events: [] };
  }

  const [tableEventRows, orderStatusRows] = await Promise.all([
    resolveTableEventFeedRows(db, restaurantId, limit),
    resolveOrderStatusFeedRows(db, restaurantId, limit),
  ]);

  const events = mergeActivityFeedEvents(
    [
      ...tableEventRows
        .map(mapTableEventRowToFeedEvent)
        .filter((event): event is ActivityFeedEvent => event != null),
      ...orderStatusRows.map(mapOrderStatusRowToFeedEvent),
    ],
    limit
  );

  return {
    generatedAt: now.toISOString(),
    events,
  };
}
