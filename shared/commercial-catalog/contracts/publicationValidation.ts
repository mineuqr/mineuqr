/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * Publication Validation Gate contract (CC-16).
 */

import type {
  CommercialBillingCycle,
  CommercialFeatureBundle,
  CommercialLimitProfile,
  CommercialMigrationPolicy,
  CommercialPlanVersion,
  CommercialPrice,
  CommercialRetirementPolicy,
  PublicationValidationIssue,
  PublicationValidationResult,
  VersionCompatibility,
} from "../types";

export const PUBLICATION_MANDATORY_CHECKS = [
  "pricing_exists",
  "billing_cycle_exists",
  "feature_bundle_exists",
  "limit_profile_exists",
  "migration_policy_exists",
  "retirement_policy_exists",
  "compatibility_defined",
] as const;

export type PublicationMandatoryCheck =
  (typeof PUBLICATION_MANDATORY_CHECKS)[number];

export type PublicationValidationContext = {
  version: CommercialPlanVersion;
  prices: CommercialPrice[];
  billingCycles: CommercialBillingCycle[];
  featureBundle: CommercialFeatureBundle | null;
  limitProfile: CommercialLimitProfile | null;
  migrationPolicy: CommercialMigrationPolicy | null;
  retirementPolicy: CommercialRetirementPolicy | null;
  /** When true, at least one regional price is required (CC-15). */
  requiresRegionalPricing?: boolean;
};

function issue(
  code: string,
  message: string,
  field?: string
): PublicationValidationIssue {
  return { code, message, field };
}

function compatibilityDefined(c: VersionCompatibility): boolean {
  return (
    Array.isArray(c.upgradeTargets) &&
    Array.isArray(c.downgradeTargets) &&
    Array.isArray(c.migrationRequirements) &&
    Array.isArray(c.breakingCommercialChanges)
  );
}

/**
 * Pure, reusable CC-16 publication validator.
 * Fail-closed: Draft→Published requires all mandatory commercial metadata.
 */
export function validatePublication(
  ctx: PublicationValidationContext
): PublicationValidationResult {
  const issues: PublicationValidationIssue[] = [];
  const { version, prices } = ctx;

  if (version.state !== "draft") {
    issues.push(
      issue(
        "invalid_state",
        `Only draft versions can be published (current: ${version.state})`,
        "state"
      )
    );
  }

  if (!prices.length) {
    issues.push(
      issue("pricing_exists", "Pricing must exist before publication", "prices")
    );
    issues.push(
      issue(
        "billing_cycle_exists",
        "Billing Cycle must exist via pricing before publication",
        "billingCycleId"
      )
    );
  } else {
    const cycleIds = new Set(ctx.billingCycles.map((c) => c.id));
    for (const price of prices) {
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

  if (!version.featureBundleId || !ctx.featureBundle) {
    issues.push(
      issue(
        "feature_bundle_exists",
        "Feature Bundle must exist before publication",
        "featureBundleId"
      )
    );
  }

  if (!version.limitProfileId || !ctx.limitProfile) {
    issues.push(
      issue(
        "limit_profile_exists",
        "Limit Profile must exist before publication",
        "limitProfileId"
      )
    );
  }

  if (!version.migrationPolicyId || !ctx.migrationPolicy) {
    issues.push(
      issue(
        "migration_policy_exists",
        "Migration Policy must be defined before publication",
        "migrationPolicyId"
      )
    );
  }

  if (!version.retirementPolicyId || !ctx.retirementPolicy) {
    issues.push(
      issue(
        "retirement_policy_exists",
        "Retirement Policy must be defined before publication",
        "retirementPolicyId"
      )
    );
  }

  if (!compatibilityDefined(version.compatibility)) {
    issues.push(
      issue(
        "compatibility_defined",
        "Version Compatibility (upgrade/downgrade/migration/breaking) must be defined (CC-14)",
        "compatibility"
      )
    );
  }

  if (ctx.requiresRegionalPricing) {
    const regional = prices.filter((p) => p.regionId != null);
    if (!regional.length) {
      issues.push(
        issue(
          "regional_pricing",
          "Regional sale requires at least one regional price (CC-15)",
          "regionId"
        )
      );
    }
  }

  return { ok: issues.length === 0, issues };
}
