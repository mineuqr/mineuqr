import { Badge } from "@/components/ui/badge";
import { getPlanDisplayName } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialEntitlements } from "@commercial/types";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";

type CommercialPlanNameProps = {
  entitlements: CommercialEntitlements;
  language: CommercialUiLanguage;
  className?: string;
};

/** Read-only plan name from canonical entitlements. */
export function CommercialPlanName({
  entitlements,
  language,
  className,
}: CommercialPlanNameProps) {
  return (
    <Badge variant="secondary" className={className}>
      {getPlanDisplayName(entitlements.plan, language)}
    </Badge>
  );
}
