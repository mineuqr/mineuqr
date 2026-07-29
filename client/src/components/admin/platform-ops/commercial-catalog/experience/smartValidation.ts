/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — Smart Validation mapping.
 * Maps CC-16 issue codes to actionable remediation (no re-validation logic).
 */

import type { CommercialCatalogDashboardSection } from "@shared/commercial-catalog";
import type { PublicationValidationIssue } from "@shared/commercial-catalog";

export type SmartValidationAction = {
  code: string;
  titleKey: string;
  description: string;
  ctaKey: string;
  navigateTo: CommercialCatalogDashboardSection;
  severity: "blocking" | "warning";
};

export type ResolvedSmartValidationAction = SmartValidationAction & {
  title: string;
  ctaLabel: string;
};

const PREFIX = "admin.platformOps.commercialCatalog.";

const MAP: Record<
  string,
  Omit<SmartValidationAction, "code" | "description" | "severity">
> = {
  pricing_exists: {
    titleKey: "validation.pricingExists.title",
    ctaKey: "validation.pricingExists.cta",
    navigateTo: "pricing",
  },
  billing_cycle_exists: {
    titleKey: "validation.billingCycleExists.title",
    ctaKey: "validation.billingCycleExists.cta",
    navigateTo: "billing_cycles",
  },
  feature_bundle_exists: {
    titleKey: "validation.featureBundleExists.title",
    ctaKey: "validation.featureBundleExists.cta",
    navigateTo: "feature_bundles",
  },
  limit_profile_exists: {
    titleKey: "validation.limitProfileExists.title",
    ctaKey: "validation.limitProfileExists.cta",
    navigateTo: "limit_profiles",
  },
  migration_policy_exists: {
    titleKey: "validation.migrationPolicyExists.title",
    ctaKey: "validation.migrationPolicyExists.cta",
    navigateTo: "migration_policies",
  },
  retirement_policy_exists: {
    titleKey: "validation.retirementPolicyExists.title",
    ctaKey: "validation.retirementPolicyExists.cta",
    navigateTo: "retirement_policies",
  },
  regional_pricing: {
    titleKey: "validation.regionalPricing.title",
    ctaKey: "validation.regionalPricing.cta",
    navigateTo: "regional_policies",
  },
  compatibility_defined: {
    titleKey: "validation.compatibilityDefined.title",
    ctaKey: "validation.compatibilityDefined.cta",
    navigateTo: "plan_versions",
  },
  invalid_state: {
    titleKey: "validation.invalidState.title",
    ctaKey: "validation.invalidState.cta",
    navigateTo: "plan_versions",
  },
};

export function toSmartValidationActions(
  issues: PublicationValidationIssue[]
): SmartValidationAction[] {
  const seen = new Set<string>();
  const actions: SmartValidationAction[] = [];
  for (const issue of issues) {
    if (seen.has(issue.code)) continue;
    seen.add(issue.code);
    const mapped = MAP[issue.code];
    if (mapped) {
      actions.push({
        code: issue.code,
        titleKey: mapped.titleKey,
        description: issue.message,
        ctaKey: mapped.ctaKey,
        navigateTo: mapped.navigateTo,
        severity: "blocking",
      });
    } else {
      actions.push({
        code: issue.code,
        titleKey: "validation.fallback.title",
        description: issue.message,
        ctaKey: "validation.fallback.cta",
        navigateTo: "commercial_validation",
        severity: "warning",
      });
    }
  }
  return actions;
}

export function resolveSmartValidationActions(
  issues: PublicationValidationIssue[],
  t: (key: string) => string
): ResolvedSmartValidationAction[] {
  return toSmartValidationActions(issues).map((action) => ({
    ...action,
    title: t(PREFIX + action.titleKey),
    ctaLabel: t(PREFIX + action.ctaKey),
  }));
}

export function uniqueSlug(base: string): string {
  return `${base}-copy-${Date.now().toString(36).slice(-5)}`;
}
