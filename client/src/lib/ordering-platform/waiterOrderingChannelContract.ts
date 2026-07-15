import {
  ORDERING_CHANNEL_WAITER_TABLET,
  ORDERING_PLATFORM_OWNED_CONCERNS,
  ORDERING_CHANNEL_OWNED_CONCERNS,
} from "@shared/ordering-platform/orderingPlatformContracts";

/**
 * WAITER-ORDERING-FOUNDATION-1 — Waiter Ordering channel contract.
 * Waiter owns staff chrome + table workspace only; platforms own the rest.
 */

export const WAITER_ORDERING_CHANNEL = ORDERING_CHANNEL_WAITER_TABLET;

export const WAITER_ORDERING_ROUTES = {
  entry: "/waiter/:slug",
  tables: "/waiter/:slug/tables",
  menu: "/waiter/:slug/menu",
  cart: "/waiter/:slug/cart",
  checkout: "/waiter/:slug/checkout",
  confirmation: "/waiter/:slug/confirmed",
} as const;

export const WAITER_FORBIDDEN_PLATFORM_CONCERNS = ORDERING_PLATFORM_OWNED_CONCERNS;

export const WAITER_CHANNEL_CONCERNS = [
  ...ORDERING_CHANNEL_OWNED_CONCERNS,
  "staff_authentication_ux",
  "table_workspace",
  "session_selection_ux",
  "ordering_host_integration",
] as const;

export const WAITER_RUNTIME_CONSUMPTION_ENTRY =
  "ordering.getRuntimeBySlug" as const;
