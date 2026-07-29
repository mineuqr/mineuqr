/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 — Platform Ops dashboard sections.
 */

export const COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH =
  "/admin/platform/commercial-catalog" as const;

export const COMMERCIAL_CATALOG_DASHBOARD_SECTIONS = [
  "plans",
  "plan_versions",
  "pricing",
  "billing_cycles",
  "feature_bundles",
  "limit_profiles",
  "regional_policies",
  "trial_policies",
  "promotions",
  "migration_policies",
  "retirement_policies",
  "publication_status",
  "commercial_health",
  "commercial_validation",
] as const;

export type CommercialCatalogDashboardSection =
  (typeof COMMERCIAL_CATALOG_DASHBOARD_SECTIONS)[number];
