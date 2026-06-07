import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getFeatureDisplayName,
  type CommercialUiLanguage,
} from "@/lib/commercial/entitlementsDisplay";
import {
  resolveVisibilityForInventory,
  UI_VISIBILITY_INVENTORY,
} from "@/lib/commercial/featureVisibility";
import type { CommercialEntitlements } from "@commercial/types";

type CommercialVisibilityDiagnosticsProps = {
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** PG-1C.3B — visibility decision trace for migration verification. */
export function CommercialVisibilityDiagnostics({
  entitlements,
  language,
}: CommercialVisibilityDiagnosticsProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">
          {language === "ar" ? "قرارات الظهور (موحّدة)" : "Visibility decisions (unified)"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {language === "ar"
            ? "مصدر الظهور: entitlements.features — للعرض فقط"
            : "Visibility source: entitlements.features — display only"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-4">{language === "ar" ? "الملف" : "File"}</th>
                <th className="py-2 pr-4">{language === "ar" ? "القديم" : "Legacy"}</th>
                <th className="py-2 pr-4">{language === "ar" ? "المفتاح" : "Feature key"}</th>
                <th className="py-2 pr-4">{language === "ar" ? "الحالة" : "Status"}</th>
                <th className="py-2">{language === "ar" ? "مرئي؟" : "Visible?"}</th>
              </tr>
            </thead>
            <tbody>
              {UI_VISIBILITY_INVENTORY.map((entry) => {
                const visible = resolveVisibilityForInventory(entitlements, entry);
                const keyLabel =
                  entry.featureKey === "commercial.plan" ||
                  entry.featureKey === "commercial.isTrial"
                    ? entry.featureKey
                    : getFeatureDisplayName(entry.featureKey, language);

                return (
                  <tr key={entry.id} className="border-b border-border/50 align-top">
                    <td className="py-2 pr-4 font-mono text-xs">{entry.file.split("/").pop()}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground max-w-[200px]">
                      {entry.legacyLogic}
                    </td>
                    <td className="py-2 pr-4">
                      <code className="text-xs">{keyLabel}</code>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {entry.replacementStatus}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {visible === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : visible ? (
                        <Badge className="bg-green-500/15 text-green-700 dark:text-green-300">
                          {language === "ar" ? "نعم" : "Yes"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {language === "ar" ? "لا" : "No"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
