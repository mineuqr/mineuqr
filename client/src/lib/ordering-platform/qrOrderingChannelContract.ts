import {
  ORDERING_CHANNEL_QR,
  ORDERING_PLATFORM_OWNED_CONCERNS,
  ORDERING_CHANNEL_OWNED_CONCERNS,
  ORDERING_FORM_FACTORS,
} from "@shared/ordering-platform/orderingPlatformContracts";

/**
 * ORDERING-PLATFORM-ARCHITECTURE-1 / ORDERING-RUNTIME-CONTEXT-1 /
 * ORDERING-RUNTIME-MATERIALIZATION-1 — QR ordering channel contract.
 * QR is a client of the Ordering Platform; it owns mobile/table presentation only.
 * QR must not construct or materialize OrderingRuntimeContext.
 */
export const QR_ORDERING_CHANNEL = ORDERING_CHANNEL_QR;

/** QR routes — experience layer; business rules remain platform-owned. */
export const QR_ORDERING_ROUTES = {
  menu: "/menu/:slug",
  tableMenu: "/menu/:slug/table/:tableNumber",
  checkout: "/menu/:slug/table/:tableNumber/checkout",
  orderStatus: "/menu/:slug/order/:trackingToken",
  confirmation: "/menu/:slug/table/:tableNumber/confirmed",
} as const;

/** QR presentation surfaces — may adapt to form factor without changing platform logic. */
export const QR_SUPPORTED_FORM_FACTORS = ORDERING_FORM_FACTORS;

/** Concerns QR must NOT implement — platform owns these. */
export const QR_FORBIDDEN_PLATFORM_CONCERNS = ORDERING_PLATFORM_OWNED_CONCERNS;

/**
 * QR must consume runtime, never construct or materialize it.
 * Construction: OrderingRuntimeContextFactory
 * Composition: OrderingRuntimeMaterializer
 */
export const QR_FORBIDDEN_RUNTIME_CONSTRUCTION = [
  "OrderingRuntimeContextFactory",
  "OrderingRuntimeMaterializer",
  "createOrderingRuntimeContext",
  "freezeOrderingRuntimeContext",
  "orderingRuntimeMaterializer",
  "composeInput",
  "loadQrOrderingRuntimeSources",
] as const;

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — QR is a runtime consumer.
 * Platform API: ordering.getRuntimeBySlug
 */
export const QR_RUNTIME_CONSUMPTION_ENTRY = "ordering.getRuntimeBySlug" as const;

/** Concerns QR may own — presentation and interaction only. */
export const QR_CHANNEL_CONCERNS = [
  ...ORDERING_CHANNEL_OWNED_CONCERNS,
  "table_context_presentation",
  "mobile_responsive_layout",
] as const;
