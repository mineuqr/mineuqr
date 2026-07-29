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

export const MANAGEMENT_SECTION_LABELS: Record<
  CommercialCatalogDashboardSection,
  string
> = {
  plans: "Plans",
  plan_versions: "Plan Versions",
  pricing: "Pricing",
  billing_cycles: "Billing Cycles",
  feature_bundles: "Feature Bundles",
  limit_profiles: "Limit Profiles",
  regional_policies: "Regional Policies",
  trial_policies: "Trial Policies",
  promotions: "Promotions",
  migration_policies: "Migration Policies",
  retirement_policies: "Retirement Policies",
  publication_status: "Publication",
  commercial_health: "Commercial Health",
  commercial_validation: "Commercial Validation",
};

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
