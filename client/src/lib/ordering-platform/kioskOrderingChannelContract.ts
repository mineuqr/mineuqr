import {
  ORDERING_CHANNEL_KIOSK,
  ORDERING_PLATFORM_OWNED_CONCERNS,
  ORDERING_CHANNEL_OWNED_CONCERNS,
  ORDERING_FORM_FACTORS,
} from "@shared/ordering-platform/orderingPlatformContracts";

/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 — Self Ordering Kiosk channel contract.
 *
 * Kiosk is the second Ordering Platform client.
 * It owns customer experience only; business rules remain platform-owned.
 * UI implementation is deferred — this contract binds future experience work.
 */

export const KIOSK_ORDERING_CHANNEL = ORDERING_CHANNEL_KIOSK;

/**
 * Planned experience routes (not mounted in this program).
 * Reserved path vocabulary for future Kiosk UI — not production routes yet.
 */
export const KIOSK_ORDERING_ROUTES = {
  idle: "/kiosk/:slug",
  welcome: "/kiosk/:slug/welcome",
  language: "/kiosk/:slug/language",
  menu: "/kiosk/:slug/menu",
  product: "/kiosk/:slug/product/:productId",
  cart: "/kiosk/:slug/cart",
  checkout: "/kiosk/:slug/checkout",
  confirmation: "/kiosk/:slug/confirmed",
} as const;

/** Form factors the kiosk experience may adapt to — presentation only. */
export const KIOSK_SUPPORTED_FORM_FACTORS = [
  "portrait_kiosk",
  "landscape_kiosk",
  "counter_touch",
  "table_display",
  "large_interactive_display",
  "tablet",
] as const satisfies readonly (typeof ORDERING_FORM_FACTORS)[number][];

/** Platform concerns the kiosk must NEVER implement. */
export const KIOSK_FORBIDDEN_PLATFORM_CONCERNS = ORDERING_PLATFORM_OWNED_CONCERNS;

/**
 * Kiosk must consume OrderingRuntimeContext — never construct or materialize it.
 */
export const KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION = [
  "OrderingRuntimeContextFactory",
  "OrderingRuntimeMaterializer",
  "createOrderingRuntimeContext",
  "freezeOrderingRuntimeContext",
  "orderingRuntimeMaterializer",
  "composeInput",
  "loadQrOrderingRuntimeSources",
] as const;

/**
 * Runtime consumption entry (same platform delivery API as QR).
 * Channel identity in materialized context: OrderingChannelId = "kiosk".
 */
export const KIOSK_RUNTIME_CONSUMPTION_ENTRY = "ordering.getRuntimeBySlug" as const;

/** Operational device role that may host kiosk UX later — not an ordering authority. */
export const KIOSK_OPERATIONAL_DEVICE_ROLE = "self_ordering_kiosk" as const;

/** Concerns the kiosk may own — experience / interaction only. */
export const KIOSK_CHANNEL_CONCERNS = [
  ...ORDERING_CHANNEL_OWNED_CONCERNS,
  "idle_experience",
  "welcome_screen",
  "language_selection_ux",
  "customer_guidance",
  "order_confirmation_ux",
  "return_to_idle",
  "session_isolation_ux",
  "touch_first_interaction",
  "accessibility",
] as const;
