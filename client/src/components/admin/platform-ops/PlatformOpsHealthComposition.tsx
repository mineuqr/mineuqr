/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * System Health — migrated from top-level Health Center (navigation only).
 * Reuses existing health placeholder domain content; no health-rule changes.
 */

import { AdminSectionPlaceholder } from "@/pages/admin/AdminSectionPlaceholder";

/**
 * Health content historically lived at `/admin/health` as a placeholder shell.
 * Under Platform Operations we keep the same placeholder domain presentation
 * without inventing new health metrics (SSOT / no duplication).
 *
 * Note: AdminSectionPlaceholder renders its own AdminOperationsShell.
 * For nested use we render the launch-readiness health placeholder section directly.
 */
import { LaunchReadinessPlaceholderSection } from "@/components/admin/domains/launch-readiness";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";

export function PlatformOpsHealthComposition() {
  const { t } = useLanguage();

  return (
    <AdminSection
      title={t("admin.platformOps.sections.health")}
      description={t("admin.platformOps.health.migratedNote")}
      density="console"
    >
      <LaunchReadinessPlaceholderSection routeId="health" />
    </AdminSection>
  );
}

/** Bookmark-compatible full page still available via redirect target shell. */
export function PlatformOpsHealthPageLegacyFallback() {
  return <AdminSectionPlaceholder routeId="health" />;
}
