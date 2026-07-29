/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
 * Consumer inventory + SSOT adoption contracts.
 */

export const COMMERCIAL_CATALOG_ADOPTION_PROGRAM =
  "COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1" as const;

/** Modules that must consume Catalog (configuration SSOT). */
export const COMMERCIAL_CATALOG_ADOPTION_CONSUMERS = [
  "subscription_platform",
  "platform_portal",
  "signup_flow",
  "restaurant_onboarding",
  "workspace_creation",
  "trial_activation",
  "subscription_management",
  "upgrade_flow",
  "downgrade_flow",
  "renewal_flow",
  "plan_selection",
  "commercial_snapshot_creation",
  "feature_resolution",
  "limit_resolution",
  "regional_availability",
  "promotion_resolution",
  "reporting_attribution",
] as const;

export type CommercialCatalogAdoptionConsumer =
  (typeof COMMERCIAL_CATALOG_ADOPTION_CONSUMERS)[number];

/**
 * Legacy commercial configuration sources replaced as SSOT.
 * Rows may remain as compatibility bridges; they must not own commercial truth.
 */
export const LEGACY_COMMERCIAL_SOURCES_SUPERSEDED = [
  "subscription_plans.configuration_ssot",
  "src/lib/commercial/planFeatureMatrix.as_commercial_config",
  "server/seed-plans.mjs",
  "hardcoded_trial_days_as_policy_ssot",
  "hardcoded_regional_country_logic",
  "duplicated_promotion_logic",
] as const;

/**
 * Allowed to remain (not commercial configuration SSOT):
 * entitlement evaluation runtime, payment providers, subscription instance rows.
 */
export const LEGACY_RUNTIME_ALLOWED_TO_REMAIN = [
  "resolveCommercialEntitlements_entitlement_engine",
  "user_subscriptions_instance_lifecycle",
  "payment_webhook_activation",
  "subscription_period_status_checks",
] as const;

/** Published-only plan selection states. */
export const PLAN_SELECTION_VISIBLE_STATES = ["published"] as const;
export const PLAN_SELECTION_HIDDEN_STATES = [
  "draft",
  "deprecated",
  "retired",
] as const;
