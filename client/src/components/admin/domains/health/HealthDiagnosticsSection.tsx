import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlements } from "@commercial/types";
import { CommercialFeaturesDisplay } from "@/components/commercial/CommercialFeaturesDisplay";
import { HealthMonitoringSection } from "./HealthMonitoringSection";
import { HealthReliabilitySection } from "./HealthReliabilitySection";
import { HealthRuntimeSection } from "./HealthRuntimeSection";

type HealthDiagnosticsSectionProps = {
  context: CommercialContext | null;
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/**
 * REBUILD-5F — operational diagnostics composition.
 * Wraps existing commercial diagnostics panels; markup preserved verbatim.
 */
export function HealthDiagnosticsSection({
  context,
  entitlements,
  language,
}: HealthDiagnosticsSectionProps) {
  return (
    <div className="space-y-6">
      <HealthRuntimeSection
        context={context}
        entitlements={entitlements}
        language={language}
      />

      <HealthMonitoringSection language={language} />

      <HealthReliabilitySection entitlements={entitlements} language={language} />

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
