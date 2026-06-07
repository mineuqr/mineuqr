import { Button } from "@/components/ui/button";
import { getFeatureDisplayName, getPlanDisplayName } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { FeatureKey } from "@commercial/featureKeys";
import type { CommercialEntitlements } from "@commercial/types";
import { Crown } from "lucide-react";
import { Link } from "wouter";

type CommercialUpgradeBannerProps = {
  entitlements: CommercialEntitlements | null;
  featureKey: FeatureKey;
  language: CommercialUiLanguage;
  title?: string;
  description?: string;
  className?: string;
};

/** Read-only upgrade / locked-feature indicator (visibility only). */
export function CommercialUpgradeBanner({
  entitlements,
  featureKey,
  language,
  title,
  description,
  className = "",
}: CommercialUpgradeBannerProps) {
  const featureName = getFeatureDisplayName(featureKey, language);
  const planName = entitlements
    ? getPlanDisplayName(entitlements.plan, language)
    : language === "ar"
      ? "—"
      : "—";

  const defaultTitle =
    language === "ar"
      ? `${featureName} — ترقية مطلوبة`
      : `${featureName} — upgrade available`;

  const defaultDescription =
    language === "ar"
      ? `خطتك الحالية (${planName}) لا تتضمن هذه الميزة في العقد التجاري.`
      : `Your current plan (${planName}) does not include this feature in the commercial contract.`;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4 ${className}`}
    >
      <Crown className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title ?? defaultTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {description ?? defaultDescription}
        </p>
        <Link href="/pricing" className="mt-3 inline-block">
          <Button variant="outline" size="sm" className="border-accent/30 text-accent">
            {language === "ar" ? "عرض الخطط" : "View plans"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
