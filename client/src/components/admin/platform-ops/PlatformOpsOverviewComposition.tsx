/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-ADOPTION-1
 * Platform Operations — Overview section.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { PLATFORM_OPS_SECTION_DEFINITIONS } from "@/lib/admin/platform-ops/platformOpsSections";
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
  const liveCount = modules.filter((s) => s.status === "live").length;
  const reservedCount = modules.filter((s) => s.status === "reserved").length;

  return (
    <div data-slot="platform-ops-overview">
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.overview.title")}
        description={t("admin.platformOps.overview.body")}
        health="healthy"
        healthLabel={t("admin.platformOps.live")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.live")}
          value={String(liveCount)}
          tone="success"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.reserved")}
          value={String(reservedCount)}
          tone="info"
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
              live={section.status === "live"}
              statusLabel={
                section.status === "live"
                  ? t("admin.platformOps.live")
                  : t("admin.platformOps.reserved")
              }
            />
          ))}
        </PlatformOpsModuleGrid>
      </PlatformOpsSection>
    </div>
  );
}
