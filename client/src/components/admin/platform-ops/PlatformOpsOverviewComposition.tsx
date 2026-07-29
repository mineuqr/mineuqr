/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-ADOPTION-1
 * + PLATFORM-P0-PRODUCTION-READINESS-1
 * Platform Operations — Overview section.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import {
  PLATFORM_OPS_SECTION_DEFINITIONS,
  isPlatformOpsOperationallyLive,
  platformOpsStatusBadgeTone,
  platformOpsStatusLabelKey,
} from "@/lib/admin/platform-ops/platformOpsSections";
import {
  PlatformOpsHeroSummary,
  PlatformOpsMetricCard,
  PlatformOpsModuleGrid,
  PlatformOpsModuleTile,
  PlatformOpsSection,
} from "@/design-system/platform-ops-ui";

export function PlatformOpsOverviewComposition() {
  const { t } = useLanguage();
  const modules = PLATFORM_OPS_SECTION_DEFINITIONS.filter(
    (s) => s.id !== "overview"
  );
  const liveCount = modules.filter((s) =>
    isPlatformOpsOperationallyLive(s.status)
  ).length;
  const architectureCount = modules.filter(
    (s) => s.status === "architecture"
  ).length;
  const reservedCount = modules.filter((s) => s.status === "reserved").length;

  return (
    <div data-slot="platform-ops-overview">
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.overview.title")}
        description={t("admin.platformOps.overview.body")}
        health="healthy"
        healthLabel={t("admin.platformOps.status.live")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.status.live")}
          value={String(liveCount)}
          tone="success"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.status.architecture")}
          value={String(architectureCount + reservedCount)}
          tone="warning"
          domain="information"
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t("admin.platformOps.overview.title")}
        description={t("admin.platformOps.overview.body")}
      >
        <PlatformOpsModuleGrid>
          {modules.map((section) => (
            <PlatformOpsModuleTile
              key={section.id}
              href={section.path}
              title={t(section.labelKey)}
              description={t(section.descriptionKey)}
              statusTone={platformOpsStatusBadgeTone(section.status)}
              statusLabel={t(platformOpsStatusLabelKey(section.status))}
            />
          ))}
        </PlatformOpsModuleGrid>
      </PlatformOpsSection>
    </div>
  );
}
