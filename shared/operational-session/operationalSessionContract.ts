/**
 * OPERATIONAL-SESSION-PLATFORM-1 / ADR-ARCH-019 —
 * Operational Session Platform contracts.
 *
 * Ownership model (certified — Option B):
 *
 *   Operational Session
 *     ├── Session Identity (id, token)
 *     ├── Session Anchor (typed — uniqueness / occupancy key)
 *     ├── Status + Lifecycle
 *     ├── Active Check reference (CHECK-MANAGEMENT-ARCHITECTURE-1)
 *     └── Orders (attached via sessionId)
 *
 * Check sub-domain owns monetary state / settlement outcome / snapshots.
 * Check id is never Session id. Split Check is out of scope.
 *
 * Fulfilment Anchor remains Order Identity (ORDER-IDENTITY-RUNTIME-1).
 * Session Anchor keys the session; it does not make Fulfilment Anchor
 * the parent aggregate of Operational Session (Option A rejected).
 *
 * Dining Session = table Session Anchor specialization (production today).
 * Channels must not own session identity or invent anchor types.
 */

/** Closed platform vocabulary — extend only via Architecture programs. */
export const OPERATIONAL_SESSION_ANCHOR_TYPES = [
  "table",
  "station",
  "pickup_point",
  "queue",
  "drive_lane",
] as const;

export type OperationalSessionAnchorType =
  (typeof OPERATIONAL_SESSION_ANCHOR_TYPES)[number];

/**
 * Opaque string key for uniqueness / lookup within an anchor type.
 * Table specialization: String(tableId).
 */
export type OperationalSessionAnchorIdentity = string;

export type TableSessionAnchor = Readonly<{
  anchorType: "table";
  identity: OperationalSessionAnchorIdentity;
  tableId: number;
  tableNumber: number;
}>;

export type StationSessionAnchor = Readonly<{
  anchorType: "station";
  identity: OperationalSessionAnchorIdentity;
  stationId: string;
}>;

export type PickupPointSessionAnchor = Readonly<{
  anchorType: "pickup_point";
  identity: OperationalSessionAnchorIdentity;
  pickupPointId: string;
}>;

export type QueueSessionAnchor = Readonly<{
  anchorType: "queue";
  identity: OperationalSessionAnchorIdentity;
  queueId: string;
}>;

export type DriveLaneSessionAnchor = Readonly<{
  anchorType: "drive_lane";
  identity: OperationalSessionAnchorIdentity;
  laneId: string;
}>;

/** Discriminated Session Anchor — platform-owned union. */
export type SessionAnchor =
  | TableSessionAnchor
  | StationSessionAnchor
  | PickupPointSessionAnchor
  | QueueSessionAnchor
  | DriveLaneSessionAnchor;

/**
 * Status vocabulary — aligned with Dining Session specialization today.
 * Non-table activations may use a subset; channels must not invent statuses.
 */
export const OPERATIONAL_SESSION_STATUSES = [
  "open",
  "paid",
  "complimentary",
  "closed",
] as const;

export type OperationalSessionStatus =
  (typeof OPERATIONAL_SESSION_STATUSES)[number];

/** Statuses that hold occupancy / accept new orders (table path today). */
export const OPERATIONAL_SESSION_ACTIVE_STATUSES = ["open"] as const;

export type OperationalSessionActiveStatus =
  (typeof OPERATIONAL_SESSION_ACTIVE_STATUSES)[number];

/**
 * Open-session uniqueness policy by anchor type (ADR-ARCH-019).
 * Only `table` is enforced in production persistence today.
 */
export type OperationalSessionUniquenessPolicy =
  | "one_open_per_anchor"
  | "none"
  | "configurable";

export const OPERATIONAL_SESSION_UNIQUENESS_BY_ANCHOR: Readonly<
  Record<OperationalSessionAnchorType, OperationalSessionUniquenessPolicy>
> = Object.freeze({
  table: "one_open_per_anchor",
  station: "configurable",
  pickup_point: "none",
  queue: "none",
  drive_lane: "none",
});

/**
 * Canonical Operational Session projection.
 * Persistence for table anchors remains `dining_sessions` (specialization).
 */
export type OperationalSession = Readonly<{
  id: number;
  restaurantId: number;
  status: OperationalSessionStatus;
  sessionToken: string;
  anchor: SessionAnchor;
  openedAt: string;
  settledAt: string | null;
  closedAt: string | null;
  settlementOutcome: "paid" | "complimentary" | null;
  totalAmount: string | null;
  totalOrders: number;
  /** Active Check id (own identity) — null when unset / legacy. */
  activeCheckId: number | null;
}>;

/** Resolve (reuse or create) an operational session for Order attach. */
export type ResolveOperationalSessionRequest = Readonly<{
  restaurantId: number;
  anchor: SessionAnchor;
  /** Optional customer hint — table path rejects terminal tokens. */
  sessionToken?: string;
}>;

export type ResolveOperationalSessionResult = Readonly<{
  /**
   * Persistent table specialization returns a Dining Session projection.
   * Non-table uniqueness policies return null (ephemeral / order-scoped).
   */
  session: OperationalSession | null;
  created: boolean;
  /**
   * persistent — dining_sessions row (table specialization, production).
   * ephemeral — no dining_sessions row; order may attach with sessionId null.
   */
  persistence: "persistent" | "ephemeral";
}>;

/**
 * NON-TABLE-PLACE-ORDER-1 — all Session Anchor types are resolution-capable.
 * Only `table` uses persistent Dining Session specialization.
 * Other types resolve ephemerally (no fake tables / no dining_sessions rows).
 */
export const OPERATIONAL_SESSION_ACTIVATED_ANCHOR_TYPES = Object.freeze([
  ...OPERATIONAL_SESSION_ANCHOR_TYPES,
] as const satisfies readonly OperationalSessionAnchorType[]);

export function isOperationalSessionAnchorActivated(
  anchorType: OperationalSessionAnchorType
): boolean {
  return (OPERATIONAL_SESSION_ACTIVATED_ANCHOR_TYPES as readonly string[]).includes(
    anchorType
  );
}

export function uniquenessPolicyForAnchor(
  anchorType: OperationalSessionAnchorType
): OperationalSessionUniquenessPolicy {
  return OPERATIONAL_SESSION_UNIQUENESS_BY_ANCHOR[anchorType];
}

/** Build table Session Anchor (QR / waiter table specialization). */
export function createTableSessionAnchor(input: {
  tableId: number;
  tableNumber: number;
}): TableSessionAnchor {
  return {
    anchorType: "table",
    identity: String(input.tableId),
    tableId: input.tableId,
    tableNumber: input.tableNumber,
  };
}

export function isTerminalOperationalSessionStatus(
  status: OperationalSessionStatus
): boolean {
  return status === "closed" || status === "paid" || status === "complimentary";
}

export function isActiveOperationalSessionStatus(
  status: OperationalSessionStatus
): boolean {
  return (OPERATIONAL_SESSION_ACTIVE_STATUSES as readonly string[]).includes(
    status
  );
}
