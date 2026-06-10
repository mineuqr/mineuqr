import { CommercialStatusPanel } from "@/components/commercial/CommercialStatusPanel";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlements } from "@commercial/types";

type HealthRuntimeSectionProps = {
  context: CommercialContext | null;
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** REBUILD-5F — platform/runtime health indicators (read-only). */
export function HealthRuntimeSection({
  context,
  entitlements,
  language,
}: HealthRuntimeSectionProps) {
  return (
    <CommercialStatusPanel context={context} entitlements={entitlements} language={language} />
  );
}
