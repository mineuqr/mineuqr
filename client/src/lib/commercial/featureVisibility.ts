import type { FeatureKey } from "@commercial/featureKeys";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlements } from "@commercial/types";

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
    replacementStatus: "messaging-only",
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
