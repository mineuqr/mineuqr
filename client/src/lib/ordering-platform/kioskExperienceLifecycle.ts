/**
 * SELF-ORDERING-KIOSK-ARCHITECTURE-1 — customer experience lifecycle.
 *
 * Owns presentation flow only. Does not own Order aggregate lifecycle
 * (that belongs to Operational Platform after PlaceOrderService).
 */

export const KIOSK_EXPERIENCE_LIFECYCLE_STAGES = [
  "idle",
  "welcome",
  "language",
  "browse_menu",
  "category_navigation",
  "product_details",
  "modifiers",
  "cart",
  "review",
  "checkout",
  "place_order",
  "confirmation",
  "automatic_reset",
] as const;

export type KioskExperienceLifecycleStage =
  (typeof KIOSK_EXPERIENCE_LIFECYCLE_STAGES)[number];

/**
 * Canonical customer journey transitions.
 * `place_order` hands off to Ordering Platform PlaceOrderService;
 * confirmation UX remains channel-owned, then resets to idle.
 */
export const KIOSK_EXPERIENCE_LIFECYCLE_FLOW = [
  ["idle", "welcome"],
  ["welcome", "language"],
  ["language", "browse_menu"],
  ["browse_menu", "category_navigation"],
  ["browse_menu", "product_details"],
  ["category_navigation", "product_details"],
  ["product_details", "modifiers"],
  ["product_details", "cart"],
  ["modifiers", "cart"],
  ["cart", "review"],
  ["review", "checkout"],
  ["checkout", "place_order"],
  ["place_order", "confirmation"],
  ["confirmation", "automatic_reset"],
  ["automatic_reset", "idle"],
] as const satisfies ReadonlyArray<
  readonly [KioskExperienceLifecycleStage, KioskExperienceLifecycleStage]
>;

/** Stages that must not encode business rules (pricing, hours, policies). */
export const KIOSK_EXPERIENCE_PRESENTATION_ONLY_STAGES = KIOSK_EXPERIENCE_LIFECYCLE_STAGES;
