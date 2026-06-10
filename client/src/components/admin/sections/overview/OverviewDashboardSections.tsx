import { OverviewAllSectionsSection } from "./OverviewAllSectionsSection";
import { OverviewFeaturedShortcutsSection } from "./OverviewFeaturedShortcutsSection";
import { OverviewKpiSection } from "./OverviewKpiSection";
import { OverviewWelcomeSection } from "./OverviewWelcomeSection";

/** Overview page body — composes all dashboard home sections. */
export function OverviewDashboardSections() {
  return (
    <>
      <OverviewWelcomeSection />
      <OverviewKpiSection />
      <OverviewFeaturedShortcutsSection />
      <OverviewAllSectionsSection />
    </>
  );
}
