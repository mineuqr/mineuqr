import type { CatalogPlan } from "./planTypes";

/** PG-1C.2D / PLAN-ID-MAPPING.md §3.1 — normative planId → catalogPlan table. */
export const PLAN_ID_TO_CATALOG_PLAN: Record<number, CatalogPlan> = {
  30001: "BASIC",
  30002: "PROFESSIONAL",
  30003: "ENTERPRISE",
};

/**
 * Maps a database `subscription_plans.id` to a catalog plan key.
 * Returns `null` for unknown IDs (caller treats as NONE for authority).
 */
export function mapPlanIdToCatalogPlan(planId: number): CatalogPlan | null {
  return PLAN_ID_TO_CATALOG_PLAN[planId] ?? null;
}
