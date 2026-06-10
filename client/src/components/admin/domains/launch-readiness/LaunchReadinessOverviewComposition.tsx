import type { ReactNode } from "react";
import { OverviewAllSectionsSection } from "@/components/admin/sections/overview/OverviewAllSectionsSection";
import { OverviewFeaturedShortcutsSection } from "@/components/admin/sections/overview/OverviewFeaturedShortcutsSection";
import { OverviewWelcomeSection } from "@/components/admin/sections/overview/OverviewWelcomeSection";

type LaunchReadinessOverviewCompositionProps = {
  /** Reports-owned KPI slot — display order preserved. */
  kpiSlot: ReactNode;
};

/**
 * REBUILD-5G — overview page Launch Readiness composition.
 * Owns operator entry sections; Reports KPI slot injected as consumer evidence.
 */
export function LaunchReadinessOverviewComposition({
  kpiSlot,
}: LaunchReadinessOverviewCompositionProps) {
  return (
    <>
      <OverviewWelcomeSection />
      {kpiSlot}
      <OverviewFeaturedShortcutsSection />
      <OverviewAllSectionsSection />
    </>
  );
}
