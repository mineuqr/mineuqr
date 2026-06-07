import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlements } from "@commercial/types";
import { CommercialFeaturesDisplay } from "./CommercialFeaturesDisplay";
import { CommercialStatusPanel } from "./CommercialStatusPanel";
import { CommercialGateConsolidationDiagnostics } from "./CommercialGateConsolidationDiagnostics";
import { CommercialVisibilityDiagnostics } from "./CommercialVisibilityDiagnostics";

type CommercialEntitlementsDiagnosticsProps = {
  context: CommercialContext | null;
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** Operator-facing diagnostics: context + entitlements (read-only). */
export function CommercialEntitlementsDiagnostics({
  context,
  entitlements,
  language,
}: CommercialEntitlementsDiagnosticsProps) {
  return (
    <div className="space-y-6">
      <CommercialStatusPanel
        context={context}
        entitlements={entitlements}
        language={language}
      />

      <CommercialGateConsolidationDiagnostics language={language} />

      <CommercialVisibilityDiagnostics
        entitlements={entitlements}
        language={language}
      />

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">
            {language === "ar" ? "الميزات" : "Features"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CommercialFeaturesDisplay entitlements={entitlements} language={language} />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">
            {language === "ar" ? "البيانات الخام (تشخيص)" : "Raw data (diagnostics)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              CommercialContext
            </h4>
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
              {JSON.stringify(context, null, 2) ?? "null"}
            </pre>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              CommercialEntitlements
            </h4>
            <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
              {JSON.stringify(entitlements, null, 2) ?? "null"}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
