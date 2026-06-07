import type { FeatureKey } from "@commercial/featureKeys";
import { mapPlanIdToCatalogPlan } from "@commercial/planIdMapping";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlements } from "@commercial/types";

export type SubscriptionExpiryWarning = {
  type: "expired" | "warning";
  daysLeft: number;
};

/** Unified visibility check — single authority path for UI (PG-1C.3C). */
export function isFeatureVisible(
  entitlements: CommercialEntitlements | null | undefined,
  key: FeatureKey
): boolean {
  return hasCommercialFeature(entitlements, key);
}

/** Admin accounts see all features in UI visibility (matches resolver). */
export function hasCommercialFeature(
  entitlements: CommercialEntitlements | null | undefined,
  key: FeatureKey
): boolean {
  if (!entitlements) return false;
  if (entitlements.commercial.isAdmin) return true;
  return entitlements.features[key] === true;
}

/** Premium template grid lock (classic always visible). */
export function isPremiumTemplateLocked(
  templateIsPremium: boolean,
  entitlements: CommercialEntitlements | null | undefined
): boolean {
  if (!templateIsPremium) return false;
  return !hasCommercialFeature(entitlements, "templates");
}

/** Whether to show the premium templates upgrade notice. */
export function shouldShowTemplatesUpgradeNotice(
  entitlements: CommercialEntitlements | null | undefined
): boolean {
  if (!entitlements) return false;
  if (entitlements.commercial.isAdmin) return false;
  return !entitlements.features.templates;
}

export function isTrialActiveForMessaging(
  entitlements: CommercialEntitlements | null | undefined
): boolean {
  return (
    entitlements?.commercial.isTrial === true || entitlements?.plan === "TRIAL"
  );
}

export function showCustomColorsPanel(
  entitlements: CommercialEntitlements | null | undefined
): boolean {
  return hasCommercialFeature(entitlements, "customColors");
}

export function showCustomFontsPanel(
  entitlements: CommercialEntitlements | null | undefined
): boolean {
  return hasCommercialFeature(entitlements, "customFonts");
}

export function showReportsUpgradeNotice(
  entitlements: CommercialEntitlements | null | undefined
): boolean {
  if (!entitlements || entitlements.commercial.isAdmin) return false;
  return !entitlements.features.reports;
}

export function showExcelUpgradeLabel(
  entitlements: CommercialEntitlements | null | undefined
): boolean {
  if (!entitlements || entitlements.commercial.isAdmin) return false;
  return !entitlements.features.excelExport;
}

/** Highlight current catalog plan on pricing grid without planId branching in UI. */
export function isCanonicalCurrentPlan(
  entitlements: CommercialEntitlements | null | undefined,
  catalogPlanId: number
): boolean {
  if (!entitlements) return false;
  const catalog = mapPlanIdToCatalogPlan(catalogPlanId);
  if (!catalog) return false;
  if (entitlements.plan === "TRIAL") {
    return catalog === "PROFESSIONAL";
  }
  return entitlements.plan === catalog;
}

/** Canonical subscription expiry warning from CommercialContext. */
export function getSubscriptionExpiryWarning(
  context: CommercialContext | null | undefined
): SubscriptionExpiryWarning | null {
  if (!context?.subscription) return null;
  const sub = context.subscription;
  if (sub.subscriptionStatus !== "active" && sub.subscriptionStatus !== "trial") {
    return null;
  }
  const endDateStr =
    sub.subscriptionStatus === "trial"
      ? sub.trialEndsAt || sub.currentPeriodEnd
      : sub.currentPeriodEnd;
  if (!endDateStr) return null;
  const endDate = new Date(endDateStr);
  const now = new Date();
  const daysLeft = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft <= 0) return { type: "expired", daysLeft: 0 };
  if (daysLeft <= 7) return { type: "warning", daysLeft };
  return null;
}

export function isTrialExpiredForMessaging(
  entitlements: CommercialEntitlements | null | undefined,
  context: CommercialContext | null | undefined
): boolean {
  if (!entitlements || !context?.subscription) return false;
  return (
    context.subscription.subscriptionStatus === "trial" &&
    entitlements.plan === "NONE"
  );
}

export type VisibilityInventoryEntry = {
  id: string;
  file: string;
  legacyLogic: string;
  featureKey: FeatureKey | "commercial.plan" | "commercial.isTrial";
  replacementStatus: "replaced" | "messaging-only" | "server-driven";
};

/** PG-1C.3B visibility inventory for diagnostics. */
export const UI_VISIBILITY_INVENTORY: VisibilityInventoryEntry[] = [
  {
    id: "template-premium-lock",
    file: "client/src/pages/TemplateSelector.tsx",
    legacyLogic: "isSubscribed = checkTrialStatus.isActive || admin",
    featureKey: "templates",
    replacementStatus: "replaced",
  },
  {
    id: "template-upgrade-notice",
    file: "client/src/pages/TemplateSelector.tsx",
    legacyLogic: "!isSubscribed premium notice",
    featureKey: "templates",
    replacementStatus: "replaced",
  },
  {
    id: "custom-colors-panel",
    file: "client/src/components/ColorCustomizer.tsx",
    legacyLogic: "canCustomizeColors = isSubscribed || isAdmin",
    featureKey: "customColors",
    replacementStatus: "replaced",
  },
  {
    id: "custom-fonts-panel",
    file: "client/src/components/FontCustomizer.tsx",
    legacyLogic: "canCustomizeFonts = isSubscribed || isAdmin",
    featureKey: "customFonts",
    replacementStatus: "replaced",
  },
  {
    id: "pricing-trial-banner",
    file: "client/src/pages/Pricing.tsx",
    legacyLogic: "checkTrialStatus.isActive / trialEndDate",
    featureKey: "commercial.isTrial",
    replacementStatus: "replaced",
  },
  {
    id: "dashboard-expiry-warning",
    file: "client/src/pages/Dashboard.tsx",
    legacyLogic: "subscription.getByRestaurant period warning",
    featureKey: "commercial.plan",
    replacementStatus: "replaced",
  },
  {
    id: "reports-excel-badge",
    file: "client/src/pages/Dashboard.tsx (ReportsTab)",
    legacyLogic: "ungated Excel export",
    featureKey: "excelExport",
    replacementStatus: "messaging-only",
  },
  {
    id: "reports-section-notice",
    file: "client/src/pages/Dashboard.tsx (ReportsTab)",
    legacyLogic: "ungated reports tab",
    featureKey: "reports",
    replacementStatus: "messaging-only",
  },
  {
    id: "guest-ordering-ui",
    file: "client/src/pages/MenuView.tsx",
    legacyLogic: "order.canOrder (server)",
    featureKey: "ordering",
    replacementStatus: "server-driven",
  },
  {
    id: "subscription-plan-badge",
    file: "client/src/pages/SubscriptionManagement.tsx",
    legacyLogic: "plan.nameAr from getCurrentSubscription",
    featureKey: "commercial.plan",
    replacementStatus: "replaced",
  },
  {
    id: "pricing-current-plan",
    file: "client/src/pages/Pricing.tsx",
    legacyLogic: "currentSub?.plan?.id === plan.id",
    featureKey: "commercial.plan",
    replacementStatus: "replaced",
  },
  {
    id: "payment-history-plan-label",
    file: "client/src/pages/PaymentHistory.tsx",
    legacyLogic: "getCurrentSubscription plan name",
    featureKey: "commercial.plan",
    replacementStatus: "replaced",
  },
  {
    id: "subscription-success-display",
    file: "client/src/pages/SubscriptionSuccess.tsx",
    legacyLogic: "getCurrentSubscription display",
    featureKey: "commercial.plan",
    replacementStatus: "replaced",
  },
];

export function resolveVisibilityForInventory(
  entitlements: CommercialEntitlements | null | undefined,
  entry: VisibilityInventoryEntry
): boolean | null {
  if (!entitlements) return null;
  if (entry.featureKey === "commercial.plan") {
    return entitlements.plan !== "NONE";
  }
  if (entry.featureKey === "commercial.isTrial") {
    return isTrialActiveForMessaging(entitlements);
  }
  if (entry.replacementStatus === "server-driven") {
    return null;
  }
  return hasCommercialFeature(entitlements, entry.featureKey);
}
