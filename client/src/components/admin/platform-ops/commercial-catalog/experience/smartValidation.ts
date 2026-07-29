/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — Smart Validation mapping.
 * Maps CC-16 issue codes to actionable remediation (no re-validation logic).
 */

import type { CommercialCatalogDashboardSection } from "@shared/commercial-catalog";
import type { PublicationValidationIssue } from "@shared/commercial-catalog";

export type SmartValidationAction = {
  code: string;
  title: string;
  description: string;
  ctaLabel: string;
  navigateTo: CommercialCatalogDashboardSection;
  severity: "blocking" | "warning";
};

const MAP: Record<
  string,
  Omit<SmartValidationAction, "code" | "description" | "severity">
> = {
  pricing_exists: {
    title: "Missing Pricing",
    ctaLabel: "Create Pricing",
    navigateTo: "pricing",
  },
  billing_cycle_exists: {
    title: "Missing Billing Cycle",
    ctaLabel: "Create Cycle",
    navigateTo: "billing_cycles",
  },
  feature_bundle_exists: {
    title: "Missing Feature Bundle",
    ctaLabel: "Create Bundle",
    navigateTo: "feature_bundles",
  },
  limit_profile_exists: {
    title: "Missing Limits",
    ctaLabel: "Create Limits",
    navigateTo: "limit_profiles",
  },
  migration_policy_exists: {
    title: "Missing Migration Policy",
    ctaLabel: "Create Policy",
    navigateTo: "migration_policies",
  },
  retirement_policy_exists: {
    title: "Missing Retirement Policy",
    ctaLabel: "Create Policy",
    navigateTo: "retirement_policies",
  },
  regional_pricing: {
    title: "Missing Regional Policy / Pricing",
    ctaLabel: "Create Policy",
    navigateTo: "regional_policies",
  },
  compatibility_defined: {
    title: "Missing Compatibility",
    ctaLabel: "Open Versions",
    navigateTo: "plan_versions",
  },
  invalid_state: {
    title: "Invalid Version State",
    ctaLabel: "Open Versions",
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
        title: mapped.title,
        description: issue.message,
        ctaLabel: mapped.ctaLabel,
        navigateTo: mapped.navigateTo,
        severity: "blocking",
      });
    } else {
      actions.push({
        code: issue.code,
        title: issue.code,
        description: issue.message,
        ctaLabel: "Open Validation",
        navigateTo: "commercial_validation",
        severity: "warning",
      });
    }
  }
  // Soft hint for trial (optional in CC-16 but requested by experience)
  return actions;
}

export function uniqueSlug(base: string): string {
  return `${base}-copy-${Date.now().toString(36).slice(-5)}`;
}
