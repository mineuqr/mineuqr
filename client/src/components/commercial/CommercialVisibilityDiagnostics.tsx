import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SemanticTableScroll,
  SemanticTableRoot,
  SemanticTableHeader,
  SemanticTableBody,
  SemanticTableRow,
  SemanticTableHead,
  SemanticTableCell,
} from "@/design-system/semantic-table";
import { OutlineBadge, SemanticBadge } from "@/design-system/semantic-badge";
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
        <SemanticTableScroll>
          <SemanticTableRoot density="comfortable" className="text-left">
            <SemanticTableHeader density="comfortable">
              <SemanticTableRow density="comfortable">
                <SemanticTableHead density="comfortable" className="pr-4">
                  {language === "ar" ? "الملف" : "File"}
                </SemanticTableHead>
                <SemanticTableHead density="comfortable" className="pr-4">
                  {language === "ar" ? "القديم" : "Legacy"}
                </SemanticTableHead>
                <SemanticTableHead density="comfortable" className="pr-4">
                  {language === "ar" ? "المفتاح" : "Feature key"}
                </SemanticTableHead>
                <SemanticTableHead density="comfortable" className="pr-4">
                  {language === "ar" ? "الحالة" : "Status"}
                </SemanticTableHead>
                <SemanticTableHead density="comfortable">
                  {language === "ar" ? "مرئي؟" : "Visible?"}
                </SemanticTableHead>
              </SemanticTableRow>
            </SemanticTableHeader>
            <SemanticTableBody>
              {UI_VISIBILITY_INVENTORY.map((entry) => {
                const visible = resolveVisibilityForInventory(entitlements, entry);
                const keyLabel =
                  entry.featureKey === "commercial.plan" ||
                  entry.featureKey === "commercial.isTrial"
                    ? entry.featureKey
                    : getFeatureDisplayName(entry.featureKey, language);

                return (
                  <SemanticTableRow
                    key={entry.id}
                    density="comfortable"
                    className="align-top"
                  >
                    <SemanticTableCell density="comfortable" className="pr-4 font-mono text-xs">
                      {entry.file.split("/").pop()}
                    </SemanticTableCell>
                    <SemanticTableCell
                      density="comfortable"
                      className="max-w-[200px] pr-4 text-xs text-muted-foreground"
                    >
                      {entry.legacyLogic}
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable" className="pr-4">
                      <code className="text-xs">{keyLabel}</code>
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable" className="pr-4">
                      <OutlineBadge className="text-xs">
                        {entry.replacementStatus}
                      </OutlineBadge>
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable">
                      {visible === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : visible ? (
                        <SemanticBadge tone="success" className="text-xs">
                          {language === "ar" ? "نعم" : "Yes"}
                        </SemanticBadge>
                      ) : (
                        <SemanticBadge tone="disabled" className="text-xs">
                          {language === "ar" ? "لا" : "No"}
                        </SemanticBadge>
                      )}
                    </SemanticTableCell>
                  </SemanticTableRow>
                );
              })}
            </SemanticTableBody>
          </SemanticTableRoot>
        </SemanticTableScroll>
      </CardContent>
    </Card>
  );
}
