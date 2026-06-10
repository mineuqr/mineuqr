import { CommercialVisibilityDiagnostics } from "@/components/commercial/CommercialVisibilityDiagnostics";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";
import type { CommercialEntitlements } from "@commercial/types";

type HealthReliabilitySectionProps = {
  entitlements: CommercialEntitlements | null;
  language: CommercialUiLanguage;
};

/** REBUILD-5F — visibility/reliability decision trace (read-only). */
export function HealthReliabilitySection({ entitlements, language }: HealthReliabilitySectionProps) {
  return <CommercialVisibilityDiagnostics entitlements={entitlements} language={language} />;
}
