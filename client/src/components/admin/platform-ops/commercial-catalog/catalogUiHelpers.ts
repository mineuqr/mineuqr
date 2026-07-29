/**
 * COMMERCIAL-CATALOG-MANAGEMENT-UI-1 — shared UI helpers.
 */

import type { CommercialCatalogDashboardSection } from "@shared/commercial-catalog";

/** Normative feature keys for visual bundle editor (aligned with entitlement FEATURE_KEYS). */
export const CATALOG_FEATURE_KEYS = [
  "qrMenu",
  "categories",
  "menuImages",
  "search",
  "ordering",
  "cart",
  "checkout",
  "requestBill",
  "callWaiter",
  "orderTracking",
  "reports",
  "excelExport",
  "hotelMode",
  "roomQr",
  "dynamicServiceCatalog",
  "templates",
  "customColors",
  "customFonts",
] as const;

export const CATALOG_LIMIT_KEYS = [
  "restaurants",
  "items",
  "categories",
] as const;

export const MANAGEMENT_SECTION_I18N_KEYS: Record<
  CommercialCatalogDashboardSection,
  string
> = {
  plans: "admin.platformOps.commercialCatalog.manage.sections.plans",
  plan_versions:
    "admin.platformOps.commercialCatalog.manage.sections.plan_versions",
  pricing: "admin.platformOps.commercialCatalog.manage.sections.pricing",
  billing_cycles:
    "admin.platformOps.commercialCatalog.manage.sections.billing_cycles",
  feature_bundles:
    "admin.platformOps.commercialCatalog.manage.sections.feature_bundles",
  limit_profiles:
    "admin.platformOps.commercialCatalog.manage.sections.limit_profiles",
  regional_policies:
    "admin.platformOps.commercialCatalog.manage.sections.regional_policies",
  trial_policies:
    "admin.platformOps.commercialCatalog.manage.sections.trial_policies",
  promotions: "admin.platformOps.commercialCatalog.manage.sections.promotions",
  migration_policies:
    "admin.platformOps.commercialCatalog.manage.sections.migration_policies",
  retirement_policies:
    "admin.platformOps.commercialCatalog.manage.sections.retirement_policies",
  publication_status:
    "admin.platformOps.commercialCatalog.manage.sections.publication_status",
  commercial_health:
    "admin.platformOps.commercialCatalog.manage.sections.commercial_health",
  commercial_validation:
    "admin.platformOps.commercialCatalog.manage.sections.commercial_validation",
};

/** @deprecated Use MANAGEMENT_SECTION_I18N_KEYS + t() */
export const MANAGEMENT_SECTION_LABELS = MANAGEMENT_SECTION_I18N_KEYS;

export function versionStateTone(
  state: string
): "healthy" | "warning" | "degraded" | "unavailable" | "unknown" {
  if (state === "published") return "healthy";
  if (state === "draft") return "warning";
  if (state === "deprecated") return "degraded";
  if (state === "retired") return "unavailable";
  return "unknown";
}

export function filterByQuery<T>(
  rows: T[],
  query: string,
  fields: (row: T) => Array<string | null | undefined>
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields(row).some((f) => (f ?? "").toLowerCase().includes(q))
  );
}
