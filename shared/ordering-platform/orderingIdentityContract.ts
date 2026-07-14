/**
 * ORDER-IDENTITY-RUNTIME-1 / NON-TABLE-PLACE-ORDER-1 / ADR-ARCH-019 —
 * Order Identity runtime contracts.
 *
 * Canonical runtime representation of:
 * - Service Mode
 * - Fulfilment Anchor
 * - Operational Session Identity
 *
 * PlaceOrder is identity-driven. Table is one Fulfilment Anchor type.
 * Non-table anchors use the same model (channel-agnostic).
 *
 * Legacy NOT NULL `orders.tableId` / `tableNumber` dual-write:
 * - table anchors → real table fields
 * - non-table → LEGACY_NON_TABLE_* sentinels (not fake restaurant_tables rows)
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

/**
 * Temporary dual-write sentinels for non-table orders while `orders.tableId` /
 * `tableNumber` remain NOT NULL. Not a restaurant_tables row. Not occupancy.
 * Kitchen already treats tableNumber <= 0 as takeaway presentation.
 */
export const LEGACY_NON_TABLE_TABLE_ID = 0 as const;
export const LEGACY_NON_TABLE_TABLE_NUMBER = 0 as const;

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
 * Operational Session Platform owns lifecycle.
 */
export type OrderingOperationalSessionIdentity = Readonly<{
  sessionId: number | null;
  sessionToken?: string | null;
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
 * QR materializer default remains table_service + table only.
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

/**
 * Platform-wide identity capability (NON-TABLE-PLACE-ORDER-1).
 * All modes/anchors accepted by the identity PlaceOrder path.
 * Does not change QR runtime materializer defaults.
 */
export const ORDERING_RUNTIME_ORDER_IDENTITY_PLATFORM_CAPABILITIES: OrderingRuntimeOrderIdentityPolicies =
  Object.freeze({
    supportedServiceModes: Object.freeze([...ORDERING_SERVICE_MODES]),
    supportedFulfilmentAnchorTypes: Object.freeze([
      ...ORDERING_FULFILMENT_ANCHOR_TYPES,
    ]),
    defaultServiceMode: "table_service",
  });

export function isOrderingServiceMode(
  value: string
): value is OrderingServiceMode {
  return (ORDERING_SERVICE_MODES as readonly string[]).includes(value);
}

export function isOrderingFulfilmentAnchorType(
  value: string
): value is OrderingFulfilmentAnchorType {
  return (ORDERING_FULFILMENT_ANCHOR_TYPES as readonly string[]).includes(value);
}

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

export function createStationFulfilmentAnchor(input: {
  stationId: string;
  fulfilmentLabel?: string;
}): OrderingStationFulfilmentAnchor {
  const stationId = input.stationId.trim();
  return {
    anchorType: "station",
    stationId,
    fulfilmentLabel: input.fulfilmentLabel?.trim() || stationId,
  };
}

export function createPickupPointFulfilmentAnchor(input: {
  pickupPointId: string;
  fulfilmentLabel?: string;
}): OrderingPickupPointFulfilmentAnchor {
  const pickupPointId = input.pickupPointId.trim();
  return {
    anchorType: "pickup_point",
    pickupPointId,
    fulfilmentLabel: input.fulfilmentLabel?.trim() || pickupPointId,
  };
}

export function createQueueFulfilmentAnchor(input: {
  queueId: string;
  ticketLabel: string;
  fulfilmentLabel?: string;
}): OrderingQueueFulfilmentAnchor {
  const queueId = input.queueId.trim();
  const ticketLabel = input.ticketLabel.trim();
  return {
    anchorType: "queue",
    queueId,
    ticketLabel,
    fulfilmentLabel: input.fulfilmentLabel?.trim() || ticketLabel || queueId,
  };
}

export function createDriveLaneFulfilmentAnchor(input: {
  laneId: string;
  fulfilmentLabel?: string;
}): OrderingDriveLaneFulfilmentAnchor {
  const laneId = input.laneId.trim();
  return {
    anchorType: "drive_lane",
    laneId,
    fulfilmentLabel: input.fulfilmentLabel?.trim() || laneId,
  };
}

/** Assemble canonical Order Identity (any supported mode + anchor). */
export function createOrderIdentity(input: {
  serviceMode: OrderingServiceMode;
  fulfilmentAnchor: OrderingFulfilmentAnchor;
  sessionId?: number | null;
  sessionToken?: string | null;
}): OrderingOrderIdentity {
  return {
    serviceMode: input.serviceMode,
    fulfilmentAnchor: input.fulfilmentAnchor,
    operationalSession: {
      sessionId: input.sessionId ?? null,
      sessionToken: input.sessionToken ?? null,
      anchorType: input.fulfilmentAnchor.anchorType,
    },
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
  return createOrderIdentity({
    serviceMode: "table_service",
    fulfilmentAnchor: createTableFulfilmentAnchor(input),
    sessionId: input.sessionId,
    sessionToken: input.sessionToken,
  });
}

/** Derive ops display label from any anchor. */
export function deriveFulfilmentLabel(
  anchor: OrderingFulfilmentAnchor
): string {
  return anchor.fulfilmentLabel;
}

/**
 * Bridge to legacy table fields for Order Domain dual-write.
 * Returns null when anchor is not table (caller applies non-table sentinels).
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

/** True when identity uses a non-table Fulfilment Anchor. */
export function isNonTableOrderIdentity(
  identity: OrderingOrderIdentity
): boolean {
  return identity.fulfilmentAnchor.anchorType !== "table";
}

/**
 * Canonical persist dual-write for Order Domain NOT NULL table columns.
 * Identity is preferred; legacy command fields remain QR dual-compat.
 */
export function resolvePlaceOrderPersistFields(input: {
  identity?: OrderingOrderIdentity | null;
  tableId?: number;
  tableNumber?: number;
}): { tableId: number; tableNumber: number } {
  if (input.identity) {
    const fromTable = legacyTableFieldsFromIdentity(input.identity);
    if (fromTable) return fromTable;
    return {
      tableId: LEGACY_NON_TABLE_TABLE_ID,
      tableNumber: LEGACY_NON_TABLE_TABLE_NUMBER,
    };
  }
  if (
    input.tableId != null &&
    input.tableNumber != null &&
    Number.isInteger(input.tableId) &&
    Number.isInteger(input.tableNumber)
  ) {
    return { tableId: input.tableId, tableNumber: input.tableNumber };
  }
  throw new Error(
    "PlaceOrder requires OrderingOrderIdentity or legacy tableId/tableNumber"
  );
}

/**
 * @deprecated Prefer resolvePlaceOrderPersistFields — kept for dual-compat callers.
 * When identity is non-table, returns LEGACY_NON_TABLE sentinels (not command fields).
 */
export function resolvePlaceOrderTableFields(input: {
  identity?: OrderingOrderIdentity | null;
  tableId: number;
  tableNumber: number;
}): { tableId: number; tableNumber: number } {
  return resolvePlaceOrderPersistFields(input);
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

/**
 * Validate identity against platform capabilities (mode + anchor vocabulary).
 * Does not enforce restaurant-specific policies (future program).
 */
export function assertPlatformOrderIdentity(
  identity: OrderingOrderIdentity
): void {
  if (!isOrderingServiceMode(identity.serviceMode)) {
    throw new Error(`Unsupported Service Mode: ${identity.serviceMode}`);
  }
  if (!isOrderingFulfilmentAnchorType(identity.fulfilmentAnchor.anchorType)) {
    throw new Error(
      `Unsupported Fulfilment Anchor type: ${identity.fulfilmentAnchor.anchorType}`
    );
  }
  if (
    identity.serviceMode === "table_service" &&
    identity.fulfilmentAnchor.anchorType !== "table"
  ) {
    throw new Error(
      "table_service requires Fulfilment Anchor type table"
    );
  }
}
