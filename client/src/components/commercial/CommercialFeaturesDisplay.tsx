import { Badge } from "@/components/ui/badge";
import {
  getFeatureDisplayName,
  splitFeaturesByAccess,
  type CommercialUiLanguage,
} from "@/lib/commercial/entitlementsDisplay";
import type { CommercialEntitlements } from "@commercial/types";

type CommercialFeaturesDisplayProps = {
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** Read-only enabled / disabled feature lists (no action gating). */
export function CommercialFeaturesDisplay({
  entitlements,
  language,
}: CommercialFeaturesDisplayProps) {
  if (!entitlements) {
    return (
      <p className="text-sm text-muted-foreground">
        {language === "ar" ? "لا توجد بيانات" : "No data"}
      </p>
    );
  }

  const { enabled, disabled } = splitFeaturesByAccess(entitlements.features);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h4 className="mb-2 text-sm font-medium text-green-600 dark:text-green-400">
          {language === "ar" ? "الميزات المفعّلة" : "Enabled features"} ({enabled.length})
        </h4>
        <ul className="flex flex-wrap gap-1.5">
          {enabled.map((key) => (
            <li key={key}>
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300">
                {getFeatureDisplayName(key, language)}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="mb-2 text-sm font-medium text-muted-foreground">
          {language === "ar" ? "الميزات المعطّلة" : "Disabled features"} ({disabled.length})
        </h4>
        <ul className="flex flex-wrap gap-1.5">
          {disabled.map((key) => (
            <li key={key}>
              <Badge variant="outline" className="opacity-70">
                {getFeatureDisplayName(key, language)}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
