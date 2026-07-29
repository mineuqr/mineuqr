/**
 * SUBSCRIPTION-PLATFORM-UI-FOUNDATION-1
 * Shared Subscription Platform presentation SSOT.
 * Presentation / architecture catalog only — no entitlement engine, billing, or runtime.
 */

export const SUBSCRIPTION_PLATFORM_UI_PROGRAM =
  "SUBSCRIPTION-PLATFORM-UI-FOUNDATION-1" as const;

export const SUBSCRIPTION_PLATFORM_ARCHITECTURE_PROGRAM =
  "SUBSCRIPTION-PLATFORM-ARCHITECTURE-1" as const;

/** Product maturity labels for honest UI (not operational Live). */
export const SUBSCRIPTION_UI_STATUS_LABELS = [
  "Architecture Certified",
  "Foundation Pending",
  "Implementation Pending",
] as const;

export type SubscriptionUiStatusLabel =
  (typeof SUBSCRIPTION_UI_STATUS_LABELS)[number];

export type SubscriptionPlaceholderSectionId =
  | "plans"
  | "feature_catalog"
  | "entitlements"
  | "limits"
  | "trials"
  | "commercial_policies"
  | "feature_flags"
  | "usage"
  | "roadmap";

export type SubscriptionPlaceholderMaturity =
  | "architecture_certified"
  | "foundation_pending"
  | "implementation_pending";

export type SubscriptionPlaceholderSection = {
  id: SubscriptionPlaceholderSectionId;
  title: string;
  description: string;
  maturity: SubscriptionPlaceholderMaturity;
  statusLabel: SubscriptionUiStatusLabel;
  readOnly: true;
};

/**
 * Read-only placeholder sections — presentation only.
 * No billing, payments, entitlement evaluation, or APIs.
 */
export const SUBSCRIPTION_PLACEHOLDER_SECTIONS: readonly SubscriptionPlaceholderSection[] =
  [
    {
      id: "plans",
      title: "Plans",
      description:
        "Commercial plan catalog (Starter → Custom). Packaging only — domains evaluate features, not plans.",
      maturity: "architecture_certified",
      statusLabel: "Architecture Certified",
      readOnly: true,
    },
    {
      id: "feature_catalog",
      title: "Feature Catalog",
      description:
        "Immutable commercial feature keys. Contracts outlive plans (SP-17 / SP-20).",
      maturity: "architecture_certified",
      statusLabel: "Architecture Certified",
      readOnly: true,
    },
    {
      id: "entitlements",
      title: "Entitlements",
      description:
        "Server-authoritative feature availability for a Tenant. Not permissions, not ownership.",
      maturity: "foundation_pending",
      statusLabel: "Foundation Pending",
      readOnly: true,
    },
    {
      id: "limits",
      title: "Limits",
      description:
        "Quantitative commercial caps (soft / hard / grace). Independent of RBAC.",
      maturity: "foundation_pending",
      statusLabel: "Foundation Pending",
      readOnly: true,
    },
    {
      id: "trials",
      title: "Trials",
      description:
        "Trial policy, activation, conversion. Trial never grants Identity or RBAC roles.",
      maturity: "implementation_pending",
      statusLabel: "Implementation Pending",
      readOnly: true,
    },
    {
      id: "commercial_policies",
      title: "Commercial Policies",
      description:
        "Grace, upgrades, overrides, multi-trial policy — centralized commercial governance.",
      maturity: "foundation_pending",
      statusLabel: "Foundation Pending",
      readOnly: true,
    },
    {
      id: "feature_flags",
      title: "Feature Flags",
      description:
        "Commercial enablement (platform / plan / override / beta / emergency). Not domain logic.",
      maturity: "foundation_pending",
      statusLabel: "Foundation Pending",
      readOnly: true,
    },
    {
      id: "usage",
      title: "Usage",
      description:
        "Usage metering presentation for future limits (API, AI, exports). No collectors here.",
      maturity: "implementation_pending",
      statusLabel: "Implementation Pending",
      readOnly: true,
    },
    {
      id: "roadmap",
      title: "Roadmap",
      description:
        "Foundation → adoption → usage/add-ons/marketplace. Architecture Certified prerequisite.",
      maturity: "architecture_certified",
      statusLabel: "Architecture Certified",
      readOnly: true,
    },
  ] as const;

export const SUBSCRIPTION_PLATFORM_OWNS = [
  "plan_catalog_presentation",
  "feature_catalog_presentation",
  "entitlement_status_presentation",
  "limit_status_presentation",
  "trial_status_presentation",
  "commercial_policy_presentation",
  "commercial_enablement_presentation",
] as const;

export const SUBSCRIPTION_PLATFORM_DOES_NOT_OWN = [
  "billing",
  "payments",
  "invoices",
  "tax",
  "entitlement_evaluation_runtime",
  "rbac",
  "tenant_identity",
  "domain_business_logic",
  "database_schema",
] as const;

export const SUBSCRIPTION_ARCHITECTURE_PRINCIPLES = [
  "plans_are_presentation",
  "features_are_contracts",
  "no_billing_in_ui_foundation",
  "no_entitlement_engine",
  "read_only_placeholders",
  "honest_architecture_status",
  "platform_ops_ui_reuse",
] as const;

export const SUBSCRIPTION_DASHBOARD_HOST_PATH =
  "/admin/platform/subscription" as const;

export {
  SUBSCRIPTION_PLACEHOLDER_SECTIONS as SUBSCRIPTION_DASHBOARD_SECTIONS,
};
