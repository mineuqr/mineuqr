/**
 * ORDERING-PLATFORM-ARCHITECTURE-1 / ORDERING-RUNTIME-CONTEXT-1 /
 * ORDERING-RUNTIME-MATERIALIZATION-1 / QR-ORDERING-RUNTIME-MIGRATION-1 /
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 — server-side platform boundary registry.
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

/** QR table Place entry. Other live Place entries: ORDERING_PLATFORM_PLACE_ORDER_LIVE_ENTRIES. */
export const ORDERING_PLATFORM_PLACE_ORDER_ROUTER_ENTRY =
  "server/routers.ts:order.create" as const;

/**
 * ORDER-CREATE-COVERAGE-COMMAND-RESTORE-1 — every production Place entry.
 * All converge on PlaceOrderService → DrizzleOrderRepository.
 */
export const ORDERING_PLATFORM_PLACE_ORDER_LIVE_ENTRIES = [
  "server/routers.ts:order.create",
  "server/routers.ts:order.placeWithIdentity",
  "server/routers.ts:order.placeAsWaiter",
  "server/operational-device/services/WaiterDeviceOrderingService.ts:placeWaiterOrderForDevice",
  "server/pos/services/PosSaleService.ts",
] as const;

/**
 * ORDERING-RUNTIME-MATERIALIZATION-1 — sole runtime composition layer.
 * Collects / validates / normalizes / composes sources → factory input.
 */
export const ORDERING_PLATFORM_RUNTIME_MATERIALIZER =
  "server/ordering-platform/OrderingRuntimeMaterializer" as const;

/** Shared materialization source-bag contract. */
export const ORDERING_PLATFORM_RUNTIME_MATERIALIZATION_CONTRACT =
  "shared/ordering-platform/orderingRuntimeMaterializationContract.ts" as const;

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — QR source loader (repos only; no composition).
 */
export const ORDERING_PLATFORM_QR_RUNTIME_LOADER =
  "server/ordering-platform/loadQrOrderingRuntimeSources" as const;

/** Additive public QR runtime delivery entry. */
export const ORDERING_PLATFORM_QR_RUNTIME_ROUTER_ENTRY =
  "server/orderingRouter.ts:ordering.getRuntimeBySlug" as const;

/**
 * ORDERING-RUNTIME-CONTEXT-1 — sole constructor for OrderingRuntimeContext.
 * Clients must never construct runtime context independently.
 * Construction only — no business composition.
 */
export const ORDERING_PLATFORM_RUNTIME_CONTEXT_FACTORY =
  "server/ordering-platform/OrderingRuntimeContextFactory" as const;

/** Shared immutable runtime contract. */
export const ORDERING_PLATFORM_RUNTIME_CONTEXT_CONTRACT =
  "shared/ordering-platform/orderingRuntimeContract.ts" as const;

/**
 * ORDERING-NOTES-ARCHITECTURE-1 — canonical Item Notes + Order Notes contracts.
 */
export const ORDERING_PLATFORM_NOTES_CONTRACT =
  "shared/ordering-platform/orderingNotesContract.ts" as const;

/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 — kiosk channel architecture contracts.
 * Experience-only; UI deferred.
 */
export const ORDERING_PLATFORM_KIOSK_CHANNEL_CONTRACT =
  "client/src/lib/ordering-platform/kioskOrderingChannelContract.ts" as const;

export const ORDERING_PLATFORM_KIOSK_EXPERIENCE_LIFECYCLE =
  "client/src/lib/ordering-platform/kioskExperienceLifecycle.ts" as const;

export const ORDERING_PLATFORM_KIOSK_SESSION_LIFECYCLE =
  "client/src/lib/ordering-platform/kioskSessionLifecycle.ts" as const;

export const ORDERING_PLATFORM_KIOSK_RUNTIME_CONSUMER =
  "client/src/lib/ordering-platform/kioskRuntimeConsumerContract.ts" as const;

/**
 * Live production Place writers (ORDER-CREATE-COVERAGE-COMMAND-RESTORE-1).
 * Must match orderingChannelRegistry live Place channels — not reserved IDs.
 */
export const ORDERING_PLATFORM_ACTIVE_CHANNELS = [
  "qr",
  "waiter_tablet",
  "kiosk",
  "cashier_pos",
] as const;

/**
 * Channels with certified Ordering Platform client architecture.
 * Distinct from live Place writers (ACTIVE_CHANNELS).
 */
export const ORDERING_PLATFORM_ESTABLISHED_CHANNELS = ["qr", "kiosk"] as const;

/** Registered, no production Place writer yet. */
export const ORDERING_PLATFORM_FUTURE_CHANNELS = ["mobile"] as const;
