import type { ReactNode } from "react";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { OverviewAllSectionsSection } from "@/components/admin/sections/overview/OverviewAllSectionsSection";
import { OverviewFeaturedShortcutsSection } from "@/components/admin/sections/overview/OverviewFeaturedShortcutsSection";

type LaunchReadinessOverviewCompositionProps = {
  /** Reports-owned KPI slot — display order preserved. */
  kpiSlot: ReactNode;
};

/**
 * REBUILD-5G — overview page Launch Readiness composition.
 * UX-REFINE-1C — console density: KPIs first, no welcome hero block.
 */
export function LaunchReadinessOverviewComposition({
  kpiSlot,
}: LaunchReadinessOverviewCompositionProps) {
  return (
    <div className={adminDash.overviewWorkspace}>
      {kpiSlot}
      <OverviewFeaturedShortcutsSection />
      <OverviewAllSectionsSection />
    </div>
  );
}
