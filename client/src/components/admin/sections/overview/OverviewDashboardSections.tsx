import { LaunchReadinessOverviewComposition } from "@/components/admin/domains/launch-readiness";
import { ReportsHomeKpiSection } from "@/components/admin/domains/reports";

/** Platform command center body — executive snapshot, attention, quick actions. */
export function OverviewDashboardSections() {
  return (
    <LaunchReadinessOverviewComposition kpiSlot={<ReportsHomeKpiSection />} />
  );
}
