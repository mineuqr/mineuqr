import { Badge } from "@/components/ui/badge";
import {
  getTrialExpirationLabel,
  isTrialAccount,
  type CommercialUiLanguage,
} from "@/lib/commercial/entitlementsDisplay";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlements } from "@commercial/types";
import { formatRiyadhDate } from "@/lib/datetime";

type CommercialTrialStatusProps = {
  context: CommercialContext | null;
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** Read-only trial state and expiration (observation only). */
export function CommercialTrialStatus({
  context,
  entitlements,
  language,
}: CommercialTrialStatusProps) {
  if (!entitlements || !context) {
    return (
      <p className="text-sm text-muted-foreground">
        {language === "ar" ? "لا توجد بيانات" : "No data"}
      </p>
    );
  }

  const onTrial = isTrialAccount(entitlements);
  const trialEndRaw = getTrialExpirationLabel(context, language);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {language === "ar" ? "حالة التجربة" : "Trial status"}
        </span>
        <Badge variant={onTrial ? "default" : "outline"}>
          {onTrial
            ? language === "ar"
              ? "نشط"
              : "Active"
            : language === "ar"
              ? "غير نشط"
              : "Inactive"}
        </Badge>
      </div>
      {onTrial && trialEndRaw && (
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">
            {language === "ar" ? "ينتهي في: " : "Expires: "}
          </span>
          {trialEndRaw === "Not set" || trialEndRaw === "غير محدد"
            ? trialEndRaw
            : formatRiyadhDate(trialEndRaw, language === "ar" ? "ar-SA" : "en-US")}
        </p>
      )}
    </div>
  );
}
