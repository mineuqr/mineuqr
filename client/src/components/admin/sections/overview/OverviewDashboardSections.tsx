import { LaunchReadinessOverviewComposition } from "@/components/admin/domains/launch-readiness";
import { ReportsHomeKpiSection } from "@/components/admin/domains/reports";

/** Overview page body — Launch Readiness composition host with Reports KPI evidence slot. */
export function OverviewDashboardSections() {
  return (
    <LaunchReadinessOverviewComposition kpiSlot={<ReportsHomeKpiSection />} />
  );
}
