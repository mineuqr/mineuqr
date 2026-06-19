import type { SelectDiningSession } from "../../drizzle/schema";

/** Active sessions use openGuard = 1; closed sessions set openGuard NULL. */
export const DINING_SESSION_ACTIVE_OPEN_GUARD = 1 as const;

/** Only `open` sessions accept new orders and hold table occupancy. */
export const DINING_SESSION_ACTIVE_STATUSES = ["open"] as const;

export type DiningSessionActiveStatus = (typeof DINING_SESSION_ACTIVE_STATUSES)[number];

export type DiningSessionSettlementOutcome = "paid" | "complimentary";

export const TABLE_EVENT_TYPES = {
  SESSION_OPENED: "SESSION_OPENED",
  ORDER_CREATED: "ORDER_CREATED",
  SESSION_PAID: "SESSION_PAID",
  SESSION_COMPLIMENTARY: "SESSION_COMPLIMENTARY",
  SESSION_CLOSED: "SESSION_CLOSED",
} as const;

export type TableEventType =
  (typeof TABLE_EVENT_TYPES)[keyof typeof TABLE_EVENT_TYPES];

/** Written by sessionService (lifecycle + order integration). */
export const TABLE_EVENT_TYPE_VALUES: readonly TableEventType[] = [
  TABLE_EVENT_TYPES.SESSION_OPENED,
  TABLE_EVENT_TYPES.ORDER_CREATED,
  TABLE_EVENT_TYPES.SESSION_PAID,
  TABLE_EVENT_TYPES.SESSION_COMPLIMENTARY,
  TABLE_EVENT_TYPES.SESSION_CLOSED,
];

/** Owner timeline V1 — events rendered in dashboard session view. */
export const OWNER_TIMELINE_V1_EVENT_TYPES = [
  TABLE_EVENT_TYPES.SESSION_OPENED,
  TABLE_EVENT_TYPES.ORDER_CREATED,
] as const;

/** UX-1D — workspace timeline includes lifecycle events. */
export const OWNER_TIMELINE_OPERATIONAL_EVENT_TYPES = [
  ...OWNER_TIMELINE_V1_EVENT_TYPES,
  TABLE_EVENT_TYPES.SESSION_PAID,
  TABLE_EVENT_TYPES.SESSION_COMPLIMENTARY,
  TABLE_EVENT_TYPES.SESSION_CLOSED,
] as const;

export type OwnerTimelineV1EventType = (typeof OWNER_TIMELINE_V1_EVENT_TYPES)[number];

export type OwnerTimelineOperationalEventType =
  (typeof OWNER_TIMELINE_OPERATIONAL_EVENT_TYPES)[number];

export type DiningSessionStatus = "open" | "paid" | "complimentary" | "closed";

/** All event types with owner timeline copy (V1 + settlement). */
export const OWNER_TIMELINE_KNOWN_EVENT_TYPES = [
  ...OWNER_TIMELINE_V1_EVENT_TYPES,
  TABLE_EVENT_TYPES.SESSION_PAID,
  TABLE_EVENT_TYPES.SESSION_COMPLIMENTARY,
  TABLE_EVENT_TYPES.SESSION_CLOSED,
] as const;

export type GetActiveSessionInput = {
  restaurantId: number;
  tableId: number;
};

export type GetOrCreateSessionInput = {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
};

export type RecordSessionEventInput = {
  restaurantId: number;
  tableId: number;
  sessionId: number;
  orderId?: number;
  eventType: TableEventType;
  metadata?: Record<string, unknown>;
};

export type GetOrCreateSessionResult = {
  session: SelectDiningSession;
  created: boolean;
};

export type RecordSessionEventResult = {
  eventId: number;
};

export class DiningSessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiningSessionValidationError";
  }
}

export class DiningSessionNotFoundError extends Error {
  constructor(message = "Dining session not found") {
    super(message);
    this.name = "DiningSessionNotFoundError";
  }
}

export class DiningSessionConflictError extends Error {
  constructor(message = "An active dining session already exists for this table") {
    super(message);
    this.name = "DiningSessionConflictError";
  }
}

export class DiningSessionTransitionError extends Error {
  constructor(message = "Invalid session status transition") {
    super(message);
    this.name = "DiningSessionTransitionError";
  }
}

export class DiningSessionUnavailableError extends Error {
  constructor(message = "Database not available") {
    super(message);
    this.name = "DiningSessionUnavailableError";
  }
}

export function isMysqlDuplicateKeyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; errno?: number };
  return e.code === "ER_DUP_ENTRY" || e.errno === 1062;
}

/** Naive datetime for MySQL timestamp columns (`YYYY-MM-DD HH:mm:ss`). */
export function formatDiningSessionTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
