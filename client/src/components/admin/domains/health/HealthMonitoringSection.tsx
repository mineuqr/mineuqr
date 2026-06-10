import { CommercialGateConsolidationDiagnostics } from "@/components/commercial/CommercialGateConsolidationDiagnostics";
import type { CommercialUiLanguage } from "@/lib/commercial/entitlementsDisplay";

type HealthMonitoringSectionProps = {
  language: CommercialUiLanguage;
};

/** REBUILD-5F — client gate consolidation monitoring (read-only). */
export function HealthMonitoringSection({ language }: HealthMonitoringSectionProps) {
  return <CommercialGateConsolidationDiagnostics language={language} />;
}
