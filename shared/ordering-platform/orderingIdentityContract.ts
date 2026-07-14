/**
 * ORDER-IDENTITY-RUNTIME-1 / ADR-ARCH-019 — Order Identity runtime contracts.
 *
 * Canonical runtime representation of:
 * - Service Mode
 * - Fulfilment Anchor
 * - Operational Session Identity
 *
 * Channels supply facts; Ordering Platform owns types and derivation.
 * Table is one Fulfilment Anchor type — not the universal identity law.
 */

/** Closed platform vocabulary — channels must not invent modes. */
export const ORDERING_SERVICE_MODES = [
  "table_service",
  "counter",
  "take_away",
  "pickup",
  "delivery",
  "drive_thru",
] as const;

export type OrderingServiceMode = (typeof ORDERING_SERVICE_MODES)[number];

/** Closed platform vocabulary — channels must not invent anchor types. */
export const ORDERING_FULFILMENT_ANCHOR_TYPES = [
  "table",
  "station",
  "pickup_point",
  "queue",
  "drive_lane",
] as const;

export type OrderingFulfilmentAnchorType =
  (typeof ORDERING_FULFILMENT_ANCHOR_TYPES)[number];

export type OrderingTableFulfilmentAnchor = Readonly<{
  anchorType: "table";
  tableId: number;
  tableNumber: number;
  /** Ops display label — for table anchors defaults to String(tableNumber). */
  fulfilmentLabel: string;
}>;

export type OrderingStationFulfilmentAnchor = Readonly<{
  anchorType: "station";
  stationId: string;
  fulfilmentLabel: string;
}>;

export type OrderingPickupPointFulfilmentAnchor = Readonly<{
  anchorType: "pickup_point";
  pickupPointId: string;
  fulfilmentLabel: string;
}>;

export type OrderingQueueFulfilmentAnchor = Readonly<{
  anchorType: "queue";
  queueId: string;
  ticketLabel: string;
  fulfilmentLabel: string;
}>;

export type OrderingDriveLaneFulfilmentAnchor = Readonly<{
  anchorType: "drive_lane";
  laneId: string;
  fulfilmentLabel: string;
}>;

/** Discriminated Fulfilment Anchor — platform-owned union. */
export type OrderingFulfilmentAnchor =
  | OrderingTableFulfilmentAnchor
  | OrderingStationFulfilmentAnchor
  | OrderingPickupPointFulfilmentAnchor
  | OrderingQueueFulfilmentAnchor
  | OrderingDriveLaneFulfilmentAnchor;

/**
 * Runtime pointer to an Operational Session.
 * Operational Session Platform owns lifecycle (OPERATIONAL-SESSION-PLATFORM-1).
 * Ordering Identity carries the pointer only — not session ownership.
 */
export type OrderingOperationalSessionIdentity = Readonly<{
  sessionId: number | null;
  sessionToken?: string | null;
  /** Session Anchor type when known (table specialization today). */
  anchorType?: OrderingFulfilmentAnchorType | null;
}>;

/** Canonical Order Identity stamped / carried at PlaceOrder time. */
export type OrderingOrderIdentity = Readonly<{
  serviceMode: OrderingServiceMode;
  fulfilmentAnchor: OrderingFulfilmentAnchor;
  operationalSession: OrderingOperationalSessionIdentity;
}>;

/**
 * Runtime policy projection — which modes/anchors this runtime snapshot allows.
 * Foundation default: table_service + table only (QR-compatible).
 */
export type OrderingRuntimeOrderIdentityPolicies = Readonly<{
  supportedServiceModes: readonly OrderingServiceMode[];
  supportedFulfilmentAnchorTypes: readonly OrderingFulfilmentAnchorType[];
  defaultServiceMode: OrderingServiceMode;
}>;

export const DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES: OrderingRuntimeOrderIdentityPolicies =
  Object.freeze({
    supportedServiceModes: Object.freeze(["table_service"] as const),
    supportedFulfilmentAnchorTypes: Object.freeze(["table"] as const),
    defaultServiceMode: "table_service",
  });

/** Build table Fulfilment Anchor (QR / waiter table path). */
export function createTableFulfilmentAnchor(input: {
  tableId: number;
  tableNumber: number;
  fulfilmentLabel?: string;
}): OrderingTableFulfilmentAnchor {
  return {
    anchorType: "table",
    tableId: input.tableId,
    tableNumber: input.tableNumber,
    fulfilmentLabel:
      input.fulfilmentLabel?.trim() || String(input.tableNumber),
  };
}

/** Build canonical Order Identity for table_service + table anchor. */
export function createTableOrderIdentity(input: {
  tableId: number;
  tableNumber: number;
  sessionId?: number | null;
  sessionToken?: string | null;
  fulfilmentLabel?: string;
}): OrderingOrderIdentity {
  return {
    serviceMode: "table_service",
    fulfilmentAnchor: createTableFulfilmentAnchor(input),
    operationalSession: {
      sessionId: input.sessionId ?? null,
      sessionToken: input.sessionToken ?? null,
      anchorType: "table",
    },
  };
}

/** Derive ops display label from any anchor. */
export function deriveFulfilmentLabel(
  anchor: OrderingFulfilmentAnchor
): string {
  return anchor.fulfilmentLabel;
}

/**
 * Bridge to legacy table fields for Order Domain dual-write.
 * Returns null when anchor is not table (non-table paths not activated in this program).
 */
export function legacyTableFieldsFromIdentity(
  identity: OrderingOrderIdentity
): { tableId: number; tableNumber: number } | null {
  if (identity.fulfilmentAnchor.anchorType !== "table") return null;
  return {
    tableId: identity.fulfilmentAnchor.tableId,
    tableNumber: identity.fulfilmentAnchor.tableNumber,
  };
}

/** Resolve table fields: prefer identity table anchor, else legacy command fields. */
export function resolvePlaceOrderTableFields(input: {
  identity?: OrderingOrderIdentity | null;
  tableId: number;
  tableNumber: number;
}): { tableId: number; tableNumber: number } {
  const fromIdentity = input.identity
    ? legacyTableFieldsFromIdentity(input.identity)
    : null;
  if (fromIdentity) return fromIdentity;
  return { tableId: input.tableId, tableNumber: input.tableNumber };
}

export function resolvePlaceOrderSessionId(input: {
  identity?: OrderingOrderIdentity | null;
  sessionId?: number | null;
}): number | null {
  if (input.identity) {
    return input.identity.operationalSession.sessionId;
  }
  return input.sessionId ?? null;
}
