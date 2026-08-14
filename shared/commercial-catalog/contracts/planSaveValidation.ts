/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Live plan save validation (replaces CC-16 publication gate).
 * Fail-closed: incomplete plans must not be saved.
 */

import type {
  CommercialBillingCycle,
  CommercialFeatureBundle,
  CommercialLimitProfile,
  CommercialLivePlan,
  CommercialPrice,
  PlanSaveValidationIssue,
  PlanSaveValidationResult,
} from "../types";

export const PLAN_SAVE_MANDATORY_CHECKS = [
  "pricing_exists",
  "billing_cycle_exists",
  "feature_bundle_exists",
  "limit_profile_exists",
] as const;

export type PlanSaveMandatoryCheck = (typeof PLAN_SAVE_MANDATORY_CHECKS)[number];

export type PlanSaveValidationContext = {
  plan: CommercialLivePlan;
  prices: CommercialPrice[];
  billingCycles: CommercialBillingCycle[];
  featureBundle: CommercialFeatureBundle | null;
  limitProfile: CommercialLimitProfile | null;
  requiresRegionalPricing?: boolean;
};

function issue(
  code: string,
  message: string,
  field?: string
): PlanSaveValidationIssue {
  return { code, message, field };
}

/**
 * Pure live-plan save validator.
 * Atomic save is refused unless mandatory commercial metadata is complete.
 */
export function validateLivePlanSave(
  ctx: PlanSaveValidationContext
): PlanSaveValidationResult {
  const issues: PlanSaveValidationIssue[] = [];
  const { plan, prices } = ctx;

  if (!prices.length) {
    issues.push(
      issue("pricing_exists", "Pricing must exist before save", "prices")
    );
    issues.push(
      issue(
        "billing_cycle_exists",
        "Billing Cycle must exist via pricing before save",
        "billingCycleId"
      )
    );
  } else {
    const cycleIds = new Set(ctx.billingCycles.map((c) => c.id));
    for (const price of prices) {
      if (price.planId !== plan.id) {
        issues.push(
          issue(
            "pricing_exists",
            `Price ${price.id} does not belong to plan ${plan.id}`,
            "planId"
          )
        );
      }
      if (!cycleIds.has(price.billingCycleId)) {
        issues.push(
          issue(
            "billing_cycle_exists",
            `Price ${price.id} references missing billing cycle ${price.billingCycleId}`,
            "billingCycleId"
          )
        );
      }
    }
  }

  if (!plan.featureBundleId || !ctx.featureBundle) {
    issues.push(
      issue(
        "feature_bundle_exists",
        "Feature Bundle must exist before save",
        "featureBundleId"
      )
    );
  }

  if (!plan.limitProfileId || !ctx.limitProfile) {
    issues.push(
      issue(
        "limit_profile_exists",
        "Limit Profile must exist before save",
        "limitProfileId"
      )
    );
  }

  if (ctx.requiresRegionalPricing) {
    const regional = prices.filter((p) => p.regionId != null);
    if (!regional.length) {
      issues.push(
        issue(
          "regional_pricing",
          "Regional sale requires at least one regional price",
          "regionId"
        )
      );
    }
  }

  return { ok: issues.length === 0, issues };
}
