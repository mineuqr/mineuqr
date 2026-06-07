import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccountTypeDisplayName } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlements } from "@commercial/types";
import { CommercialFlagsDisplay } from "./CommercialFlagsDisplay";
import { CommercialLimitsDisplay } from "./CommercialLimitsDisplay";
import { CommercialPlanName } from "./CommercialPlanName";
import { CommercialTrialStatus } from "./CommercialTrialStatus";

type CommercialStatusPanelProps = {
  context: CommercialContext | null;
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** Reusable read-only commercial status summary. */
export function CommercialStatusPanel({
  context,
  entitlements,
  language,
}: CommercialStatusPanelProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {language === "ar" ? "الحالة التجارية" : "Commercial status"}
          {entitlements && (
            <CommercialPlanName entitlements={entitlements} language={language} />
          )}
        </CardTitle>
        {entitlements && (
          <p className="text-sm text-muted-foreground">
            {language === "ar" ? "نوع الحساب: " : "Account type: "}
            {getAccountTypeDisplayName(entitlements.accountType, language)}
            {entitlements.status
              ? ` · ${language === "ar" ? "الحالة" : "Status"}: ${entitlements.status}`
              : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <CommercialTrialStatus
          context={context}
          entitlements={entitlements}
          language={language}
        />
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {language === "ar" ? "الحدود" : "Limits"}
          </h4>
          <CommercialLimitsDisplay entitlements={entitlements} language={language} />
        </div>
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            {language === "ar" ? "الأعلام التجارية" : "Commercial flags"}
          </h4>
          <CommercialFlagsDisplay entitlements={entitlements} language={language} />
        </div>
      </CardContent>
    </Card>
  );
}
