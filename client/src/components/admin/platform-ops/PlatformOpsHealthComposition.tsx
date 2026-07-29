/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-ADOPTION-1
 * System Health — presentation via foundation only.
 * Placeholder domain copy preserved; no health-rule / API changes.
 */

import { HeartPulse } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  PlatformOpsEmptyState,
  PlatformOpsHeroSummary,
  PlatformOpsMetricCard,
  PlatformOpsSection,
} from "@/design-system/platform-ops-ui";

export function PlatformOpsHealthComposition() {
  const { t } = useLanguage();

  return (
    <div data-slot="platform-ops-health">
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.sections.health")}
        description={t("admin.platformOps.health.migratedNote")}
        health="unknown"
        healthLabel={t("admin.platformOps.reserved")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.sections.health")}
          value={t("admin.platformOps.reserved")}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.sections.diagnostics")}
          value={t("admin.platformOps.architectureOnly")}
          tone="info"
          domain="information"
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t("admin.platformOps.sections.health")}
        description={t("admin.platformOps.health.migratedNote")}
      >
        <PlatformOpsEmptyState
          icon={HeartPulse}
          title={t("admin.platformOps.sections.health")}
          description={t("admin.platformOps.health.migratedNote")}
        />
      </PlatformOpsSection>
    </div>
  );
}
