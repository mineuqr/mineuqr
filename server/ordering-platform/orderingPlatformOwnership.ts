/**
 * ORDERING-PLATFORM-ARCHITECTURE-1 / ORDERING-RUNTIME-CONTEXT-1 —
 * server-side platform boundary registry.
 * Documents authoritative owners; does not duplicate order domain logic.
 */

/** Authoritative place-order mutation — all channels must route here. */
export const ORDERING_PLATFORM_PLACE_ORDER_SERVICE =
  "server/order/application/PlaceOrderService" as const;

/** Authoritative pricing resolution — client prices are never trusted. */
export const ORDERING_PLATFORM_PRICING_AUTHORITY = "server/orderPricing.ts" as const;

/** Authoritative order aggregate — single mutation owner. */
export const ORDERING_PLATFORM_ORDER_AGGREGATE = "server/order/domain/aggregate/Order.ts" as const;

/** Guest ordering commercial gate. */
export const ORDERING_PLATFORM_GUEST_ENTITLEMENT =
  "server/commercial/guestOrderingAuthority.ts" as const;

/** Current production place-order router entry (QR channel today). */
export const ORDERING_PLATFORM_PLACE_ORDER_ROUTER_ENTRY =
  "server/routers.ts:order.create" as const;

/**
 * ORDERING-RUNTIME-CONTEXT-1 — sole constructor for OrderingRuntimeContext.
 * Clients must never construct runtime context independently.
 */
export const ORDERING_PLATFORM_RUNTIME_CONTEXT_FACTORY =
  "server/ordering-platform/OrderingRuntimeContextFactory" as const;

/** Shared immutable runtime contract. */
export const ORDERING_PLATFORM_RUNTIME_CONTEXT_CONTRACT =
  "shared/ordering-platform/orderingRuntimeContract.ts" as const;

/** Channels that consume the platform today. */
export const ORDERING_PLATFORM_ACTIVE_CHANNELS = ["qr"] as const;

/** Channels registered for future consumption — not implemented in this program. */
export const ORDERING_PLATFORM_FUTURE_CHANNELS = ["kiosk", "mobile", "waiter_tablet"] as const;
