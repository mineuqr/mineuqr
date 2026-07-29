/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * System Health — migrated from top-level Health Center (navigation only).
 * Reuses existing health placeholder domain content; no health-rule changes.
 */

import { AdminSectionPlaceholder } from "@/pages/admin/AdminSectionPlaceholder";
import { LaunchReadinessPlaceholderSection } from "@/components/admin/domains/launch-readiness";
import { useLanguage } from "@/contexts/LanguageContext";
import { PlatformOpsSection } from "@/design-system/platform-ops-ui";

export function PlatformOpsHealthComposition() {
  const { t } = useLanguage();

  return (
    <PlatformOpsSection
      title={t("admin.platformOps.sections.health")}
      description={t("admin.platformOps.health.migratedNote")}
    >
      <LaunchReadinessPlaceholderSection routeId="health" />
    </PlatformOpsSection>
  );
}

/** Bookmark-compatible full page still available via redirect target shell. */
export function PlatformOpsHealthPageLegacyFallback() {
  return <AdminSectionPlaceholder routeId="health" />;
}
