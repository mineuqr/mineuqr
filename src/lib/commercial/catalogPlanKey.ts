import type { CatalogPlan } from "./planTypes";

/**
 * COMMERCIAL-OD-4 — business-key → catalog tier.
 * Not an integer identity bridge. Codes are commercial_plans.code.
 */
export function catalogPlanKeyFromCode(
  code: string | null | undefined
): CatalogPlan | null {
  if (!code) return null;
  const key = code.trim().toLowerCase();
  if (key === "basic") return "BASIC";
  if (key === "professional" || key === "pro") return "PROFESSIONAL";
  if (key === "enterprise") return "ENTERPRISE";
  return null;
}
