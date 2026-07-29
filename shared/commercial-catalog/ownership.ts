/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 — ownership boundaries.
 */

export const COMMERCIAL_CATALOG_PLATFORM_OWNS = [
  "plan_identity",
  "plan_version",
  "pricing_catalog",
  "billing_cycles",
  "feature_bundles",
  "limit_profiles",
  "trial_policies",
  "promotion_definitions",
  "migration_policies",
  "retirement_policies",
  "regional_commercial_policies",
  "commercial_snapshot_definitions",
  "publication_validation",
  "version_compatibility",
] as const;

export const COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN = [
  "payment_gateways",
  "stripe",
  "moyasar",
  "hyperpay",
  "invoices",
  "charging",
  "entitlement_engine",
  "feature_enforcement",
  "subscription_runtime",
  "subscription_tables",
  "portal_integration",
  "tax_calculation",
  "rbac_authorization",
  "tenant_identity",
] as const;

export const COMMERCIAL_CATALOG_ARCHITECTURE_PRINCIPLES = [
  "catalog_ssot",
  "published_versions_immutable",
  "commercial_snapshot_integrity",
  "version_compatibility_governance",
  "regional_policies_in_catalog",
  "publication_validation_gate",
  "no_payment_logic",
  "no_subscription_runtime",
  "platform_ops_ui_reuse",
] as const;
