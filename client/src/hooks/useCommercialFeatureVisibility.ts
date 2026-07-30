import { getPlanDisplayName, type CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import {
  getSubscriptionExpiryWarning,
  hasCommercialFeature,
  isCanonicalCurrentPlan,
  isCanonicalCurrentPlanByCode,
  isPremiumTemplateLocked,
  isTrialActiveForMessaging,
  isTrialExpiredForMessaging,
  showCustomColorsPanel,
  showCustomFontsPanel,
  showExcelUpgradeLabel,
  showReportsUpgradeNotice,
  shouldShowTemplatesUpgradeNotice,
} from "@/lib/commercial/featureVisibility";
import type { FeatureKey } from "@commercial/featureKeys";
import {
  useCommercialEntitlements,
  type UseCommercialEntitlementsOptions,
} from "./useCommercialEntitlements";

/**
 * PG-1C.3C — unified client commercial visibility hook.
 * All UI visibility decisions should flow through this hook + featureVisibility.ts.
 */
export function useCommercialFeatureVisibility(
  options?: UseCommercialEntitlementsOptions
) {
  const base = useCommercialEntitlements(options);
  const { entitlements, context, isReady } = base;

  return {
    ...base,
    hasFeature: (key: FeatureKey) =>
      isReady && hasCommercialFeature(entitlements, key),
    isTemplateLocked: (templateIsPremium: boolean) =>
      isReady && isPremiumTemplateLocked(templateIsPremium, entitlements),
    showTemplatesUpgrade:
      isReady && shouldShowTemplatesUpgradeNotice(entitlements),
    showCustomColors: isReady && showCustomColorsPanel(entitlements),
    showCustomFonts: isReady && showCustomFontsPanel(entitlements),
    showReportsUpgrade: isReady && showReportsUpgradeNotice(entitlements),
    showExcelUpgrade: isReady && showExcelUpgradeLabel(entitlements),
    subscriptionExpiryWarning: isReady
      ? getSubscriptionExpiryWarning(context)
      : null,
    isCurrentCatalogPlan: (catalogPlanId: number) =>
      isReady && isCanonicalCurrentPlan(entitlements, catalogPlanId),
    isCurrentCatalogPlanByCode: (planCode: string) =>
      isReady && isCanonicalCurrentPlanByCode(entitlements, planCode),
    isTrialActive:
      isReady && isTrialActiveForMessaging(entitlements),
    isTrialExpired:
      isReady && isTrialExpiredForMessaging(entitlements, context),
    canonicalPlanLabel: (language: CommercialUiLanguage) =>
      entitlements ? getPlanDisplayName(entitlements.plan, language) : null,
  };
}
