/**
 * ORDERING-CLIENT-GOVERNANCE-1 — normative Client Platform ownership + dependency rules.
 * Channels compose the platform; they never own shared ordering experience orchestration.
 */

/** Sole supported execution path (presentation → platform). */
export const ORDERING_CLIENT_LAYER_STACK = [
  "channel_shell",
  "ordering_client_platform",
  "ordering_runtime",
  "ordering_platform",
] as const;

export type OrderingClientLayer = (typeof ORDERING_CLIENT_LAYER_STACK)[number];

/** Concerns owned exclusively by Ordering Client Platform. */
export const ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS = [
  "runtime_consumption",
  "runtime_gate_derivation",
  "cart_lifecycle",
  "browse_lifecycle",
  "checkout_lifecycle",
  "order_summary_presentation",
  "notes_entry_presentation",
  "submission_orchestration",
  "in_experience_navigation_state",
  "ordering_loading_error_presentation",
] as const;

export type OrderingClientPlatformOwnedConcern =
  (typeof ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS)[number];

/** Concerns channels may own (shell / channel UX only). */
export const ORDERING_CHANNEL_SHELL_OWNED_CONCERNS = [
  "entry_bootstrap",
  "deep_links",
  "route_hosting",
  "form_factor_chrome",
  "idle_language_auth",
  "table_session_resolution",
  "dining_session_recovery",
  "post_submission_guest_tracking",
  "channel_tracking_side_effects",
  "cart_scope_adapter_factory",
  "ordering_navigator_factory",
] as const;

export type OrderingChannelShellOwnedConcern =
  (typeof ORDERING_CHANNEL_SHELL_OWNED_CONCERNS)[number];

/** Required composition adapters — every channel must supply these. */
export const ORDERING_CLIENT_REQUIRED_ADAPTERS = [
  "CartScopeAdapter",
  "OrderingNavigator",
] as const;

/**
 * Dependency rule (normative):
 * channel → ordering-client → (runtime delivery) → shared ordering-platform contracts
 * Forbidden: channel → useOrderingRuntime / getRuntimeBySlug
 * Forbidden: channel pages → @shared/ordering-platform business modules
 * Forbidden: channel ↔ channel experience imports
 */
export const ORDERING_CLIENT_DEPENDENCY_RULES = [
  "channels_compose_via_hosts_and_adapters_only",
  "sole_getRuntimeBySlug_consumer_is_useOrderingRuntime",
  "cart_browse_checkout_owned_by_client_platform",
  "channels_must_not_import_channel_experience_of_peers",
  "client_platform_must_not_construct_OrderingRuntimeContext",
] as const;
