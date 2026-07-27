/**
 * ORDERING-PLATFORM-ARCHITECTURE-1 — platform channel identifiers + concerns.
 * Channel ids are governed by ORDERING-CHANNEL-GOVERNANCE-1 registry.
 */

export {
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_MOBILE,
  ORDERING_CHANNEL_WAITER_TABLET,
  ORDERING_CHANNEL_MARKETPLACE,
  ORDERING_CHANNEL_DELIVERY_PARTNER,
  ORDERING_CHANNEL_CALL_CENTER,
  ORDERING_CHANNEL_IDS,
  type OrderingChannelId,
} from "./orderingChannelRegistry";

/** Platform-owned concerns — must not be duplicated in channel code. */
export const ORDERING_PLATFORM_OWNED_CONCERNS = [
  "restaurant_ordering_context",
  "ordering_runtime_context",
  "ordering_runtime_context_factory",
  "ordering_runtime_materialization",
  "business_availability",
  "business_day_awareness",
  "working_hours",
  "ordering_availability",
  "ordering_policies",
  "menu_projection",
  "category_hierarchy",
  "product_projection",
  "modifier_projection",
  "availability_rules",
  "price_calculation",
  "taxes",
  "service_charges",
  "discount_pipeline",
  "cart_validation",
  "checkout_validation",
  "place_order_orchestration",
  "ordering_events",
  "ordering_notes",
  "order_notes",
  "item_notes",
] as const;

export type OrderingPlatformOwnedConcern = (typeof ORDERING_PLATFORM_OWNED_CONCERNS)[number];

/** Channel-owned concerns — presentation and interaction only. */
export const ORDERING_CHANNEL_OWNED_CONCERNS = [
  "responsive_layout",
  "screen_orientation",
  "touch_interaction",
  "idle_screen",
  "language_selection_ux",
  "table_context_presentation",
  "navigation_flow",
] as const;

export type OrderingChannelOwnedConcern = (typeof ORDERING_CHANNEL_OWNED_CONCERNS)[number];

/** Form factors are presentation concerns — never affect ordering logic. */
export const ORDERING_FORM_FACTORS = [
  "mobile_phone",
  "tablet",
  "portrait_kiosk",
  "landscape_kiosk",
  "counter_touch",
  "table_display",
  "large_interactive_display",
] as const;

export type OrderingFormFactor = (typeof ORDERING_FORM_FACTORS)[number];

/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 — primary interaction model for kiosk channel.
 * Experience-layer only; never encoded in OrderingRuntimeContext business fields.
 */
export const ORDERING_KIOSK_PRIMARY_INPUT = "touch" as const;
export const ORDERING_KIOSK_COMPATIBILITY_INPUTS = [
  "mouse",
  "keyboard",
  "accessibility_device",
] as const;
