/**
 * OPERATIONAL-FULFILMENT-PROJECTION-1 — deterministic fulfilment projection facts.
 *
 * Derived at write time (dual-write stamp) and projected into the Order Read Model.
 * Operational screens consume projected fields only — no Session/Runtime queries.
 */

import {
  deriveFulfilmentLabel,
  type OrderingFulfilmentAnchorType,
  type OrderingOrderIdentity,
  type OrderingServiceMode,
} from "./orderingIdentityContract";

/** Canonical projected fulfilment slice for Order Read Model / Operational DTOs. */
export type OrderFulfilmentProjection = Readonly<{
  serviceMode: OrderingServiceMode;
  fulfilmentAnchorType: OrderingFulfilmentAnchorType;
  fulfilmentLabel: string;
  /** Operational Session pointer — same meaning as orders.sessionId. */
  operationalSessionId: number | null;
}>;

export function fulfilmentProjectionFromIdentity(
  identity: OrderingOrderIdentity
): OrderFulfilmentProjection {
  return {
    serviceMode: identity.serviceMode,
    fulfilmentAnchorType: identity.fulfilmentAnchor.anchorType,
    fulfilmentLabel: deriveFulfilmentLabel(identity.fulfilmentAnchor),
    operationalSessionId: identity.operationalSession.sessionId,
  };
}

/**
 * Deterministic backfill / QR dual-compat when stamps are absent.
 * tableNumber > 0 → table_service + table; else take_away + station (legacy 0/0).
 */
export function fulfilmentProjectionFromLegacyTable(input: {
  tableNumber: number;
  sessionId?: number | null;
}): OrderFulfilmentProjection {
  if (input.tableNumber > 0) {
    return {
      serviceMode: "table_service",
      fulfilmentAnchorType: "table",
      fulfilmentLabel: String(input.tableNumber),
      operationalSessionId: input.sessionId ?? null,
    };
  }
  return {
    serviceMode: "take_away",
    fulfilmentAnchorType: "station",
    fulfilmentLabel: "Take Away",
    operationalSessionId: input.sessionId ?? null,
  };
}

/** Prefer stored stamps; fall back to legacy tableNumber derivation. */
export function resolveFulfilmentProjection(input: {
  serviceMode?: string | null;
  fulfilmentAnchorType?: string | null;
  fulfilmentLabel?: string | null;
  tableNumber: number;
  sessionId?: number | null;
}): OrderFulfilmentProjection {
  const mode = input.serviceMode?.trim();
  const anchor = input.fulfilmentAnchorType?.trim();
  const label = input.fulfilmentLabel?.trim();
  if (mode && anchor && label) {
    return {
      serviceMode: mode as OrderingServiceMode,
      fulfilmentAnchorType: anchor as OrderingFulfilmentAnchorType,
      fulfilmentLabel: label,
      operationalSessionId: input.sessionId ?? null,
    };
  }
  return fulfilmentProjectionFromLegacyTable({
    tableNumber: input.tableNumber,
    sessionId: input.sessionId,
  });
}
