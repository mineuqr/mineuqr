import { ReportsHomeKpiSection } from "@/components/admin/domains/reports";
import { OverviewAllSectionsSection } from "./OverviewAllSectionsSection";
import { OverviewFeaturedShortcutsSection } from "./OverviewFeaturedShortcutsSection";
import { OverviewWelcomeSection } from "./OverviewWelcomeSection";

/** Overview page body — composes all dashboard home sections. */
export function OverviewDashboardSections() {
  return (
    <>
      <OverviewWelcomeSection />
      <ReportsHomeKpiSection />
      <OverviewFeaturedShortcutsSection />
      <OverviewAllSectionsSection />
    </>
  );
}
