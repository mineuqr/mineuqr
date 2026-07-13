import {
  ORDERING_CHANNEL_QR,
  ORDERING_PLATFORM_OWNED_CONCERNS,
  ORDERING_CHANNEL_OWNED_CONCERNS,
  ORDERING_FORM_FACTORS,
} from "@shared/ordering-platform/orderingPlatformContracts";

/**
 * ORDERING-PLATFORM-ARCHITECTURE-1 — QR ordering channel contract.
 * QR is a client of the Ordering Platform; it owns mobile/table presentation only.
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

/** Concerns QR may own — presentation and interaction only. */
export const QR_CHANNEL_CONCERNS = [
  ...ORDERING_CHANNEL_OWNED_CONCERNS,
  "table_context_presentation",
  "mobile_responsive_layout",
] as const;
