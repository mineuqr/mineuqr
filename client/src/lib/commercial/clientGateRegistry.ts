import type { FeatureKey } from "@commercial/featureKeys";

export type ClientGateStatus =
  | "ACTIVE"
  | "REDUNDANT"
  | "NEEDS_MIGRATION"
  | "KEEP_TEMPORARY"
  | "MIGRATED";

export type ClientGateEntry = {
  id: string;
  file: string;
  legacyLogic: string;
  featureKey?: FeatureKey | "commercial.plan" | "commercial.isTrial" | "none";
  status: ClientGateStatus;
  authorityPath: string;
  notes?: string;
};

/**
 * PG-1C.3C — authoritative client commercial gate registry.
 * Diagnostics and audits consume this list.
 */
export const CLIENT_GATE_REGISTRY: ClientGateEntry[] = [
  {
    id: "template-premium-lock",
    file: "client/src/pages/TemplateSelector.tsx",
    legacyLogic: "isSubscribed / checkTrialStatus",
    featureKey: "templates",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility().isTemplateLocked()",
  },
  {
    id: "template-upgrade-notice",
    file: "client/src/pages/TemplateSelector.tsx",
    legacyLogic: "!isSubscribed premium notice",
    featureKey: "templates",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility().showTemplatesUpgrade",
  },
  {
    id: "custom-colors-panel",
    file: "client/src/components/ColorCustomizer.tsx",
    legacyLogic: "isSubscribed || isAdmin",
    featureKey: "customColors",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility().showCustomColors",
  },
  {
    id: "custom-fonts-panel",
    file: "client/src/components/FontCustomizer.tsx",
    legacyLogic: "isSubscribed || isAdmin",
    featureKey: "customFonts",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility().showCustomFonts",
  },
  {
    id: "pricing-trial-banner",
    file: "client/src/pages/Pricing.tsx",
    legacyLogic: "checkTrialStatus",
    featureKey: "commercial.isTrial",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility() trial messaging",
  },
  {
    id: "pricing-current-plan",
    file: "client/src/pages/Pricing.tsx",
    legacyLogic: "currentSub?.plan?.id === plan.id",
    featureKey: "commercial.plan",
    status: "MIGRATED",
    authorityPath: "isCanonicalCurrentPlan()",
  },
  {
    id: "dashboard-expiry-warning",
    file: "client/src/pages/Dashboard.tsx",
    legacyLogic: "subscription.getByRestaurant",
    featureKey: "commercial.plan",
    status: "MIGRATED",
    authorityPath: "getSubscriptionExpiryWarning()",
  },
  {
    id: "reports-upgrade-banner",
    file: "client/src/pages/Dashboard.tsx",
    legacyLogic: "ungated reports",
    featureKey: "reports",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility().showReportsUpgrade",
  },
  {
    id: "excel-upgrade-label",
    file: "client/src/pages/Dashboard.tsx",
    legacyLogic: "ungated Excel",
    featureKey: "excelExport",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility().showExcelUpgrade",
  },
  {
    id: "subscription-plan-badge",
    file: "client/src/pages/SubscriptionManagement.tsx",
    legacyLogic: "plan.nameAr only",
    featureKey: "commercial.plan",
    status: "MIGRATED",
    authorityPath: "canonicalPlanLabel",
  },
  {
    id: "payment-history-plan-label",
    file: "client/src/pages/PaymentHistory.tsx",
    legacyLogic: "getCurrentSubscription plan name",
    featureKey: "commercial.plan",
    status: "MIGRATED",
    authorityPath: "canonicalPlanLabel with legacy fallback",
    notes: "Invoice rows keep historical label; canonical used when ready",
  },
  {
    id: "subscription-success-display",
    file: "client/src/pages/SubscriptionSuccess.tsx",
    legacyLogic: "getCurrentSubscription display",
    featureKey: "commercial.plan",
    status: "MIGRATED",
    authorityPath: "canonicalPlanLabel with legacy fallback",
  },
  {
    id: "screen-management-devices",
    file: "client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx",
    legacyLogic: "ungated Screens nav",
    featureKey: "devices",
    status: "MIGRATED",
    authorityPath: "useCommercialFeatureVisibility().hasFeature(\"devices\")",
  },
  {
    id: "guest-ordering-ui",
    file: "client/src/pages/MenuView.tsx",
    legacyLogic: "order.canOrder",
    featureKey: "ordering",
    status: "KEEP_TEMPORARY",
    authorityPath: "server order.canOrder",
    notes: "Guest-facing; owner entitlements not applicable",
  },
  {
    id: "admin-plan-id-forms",
    file: "client/src/pages/AdminManagement.tsx",
    legacyLogic: "planId CRUD / subscription.planId",
    featureKey: "none",
    status: "KEEP_TEMPORARY",
    authorityPath: "admin operational tooling",
    notes: "Not owner feature visibility",
  },
  {
    id: "admin-kpi-hints",
    file: "client/src/components/admin/layout/AdminKPISection.tsx",
    legacyLogic: "active/trial subscription hints",
    featureKey: "none",
    status: "KEEP_TEMPORARY",
    authorityPath: "server admin KPIs",
  },
  {
    id: "menu-templates-ispremium",
    file: "client/src/components/MenuTemplates.tsx",
    legacyLogic: "isPremium catalog metadata",
    featureKey: "templates",
    status: "ACTIVE",
    authorityPath: "isPremiumTemplateLocked(isPremium, entitlements)",
    notes: "Catalog metadata; lock via featureVisibility",
  },
  {
    id: "pricing-checkout-planid",
    file: "client/src/pages/Pricing.tsx",
    legacyLogic: "planId in checkout mutations",
    featureKey: "none",
    status: "KEEP_TEMPORARY",
    authorityPath: "billing API requires numeric planId",
    notes: "Not a visibility gate",
  },
];

export function getClientGateConsolidationStats(registry = CLIENT_GATE_REGISTRY) {
  const migrated = registry.filter((e) => e.status === "MIGRATED").length;
  const active = registry.filter((e) => e.status === "ACTIVE").length;
  const legacy = registry.filter(
    (e) => e.status === "NEEDS_MIGRATION" || e.status === "REDUNDANT"
  ).length;
  const temporary = registry.filter((e) => e.status === "KEEP_TEMPORARY").length;
  const total = registry.length;
  return {
    total,
    migrated,
    active,
    legacy,
    temporary,
    progressPct: total === 0 ? 100 : Math.round((migrated / total) * 100),
  };
}
