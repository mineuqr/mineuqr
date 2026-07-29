/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Performance Platform architecture presentation under Platform Operations.
 * No collectors, no tRPC, no runtime metrics — catalog + ownership only.
 * UI: platform-ops-ui foundation exclusively.
 */

import { Gauge, Radio } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  PERFORMANCE_CAPACITY_ARCHITECTURE,
  PERFORMANCE_DASHBOARD_ARCHITECTURE,
  PERFORMANCE_DOMAIN_DEFINITIONS,
  PERFORMANCE_HEALTH_STATUSES,
  PERFORMANCE_PLATFORM_PROGRAM,
  PERFORMANCE_SCORE_ARCHITECTURE,
  PERFORMANCE_TREND_WINDOW_ARCHITECTURE,
  listRealtimeSsotProjections,
} from "@shared/performance-platform";
import {
  PlatformOpsEmptyState,
  PlatformOpsHeroSummary,
  PlatformOpsMetricCard,
  PlatformOpsModuleGrid,
  PlatformOpsModuleTile,
  PlatformOpsOwnershipList,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PLATFORM_OPS_UI,
} from "@/design-system/platform-ops-ui";

export function PlatformOpsPerformanceComposition() {
  const { t } = useLanguage();
  const domains = PERFORMANCE_DOMAIN_DEFINITIONS;
  const architectureCount = domains.filter(
    (d) => d.maturity === "architecture" || d.maturity === "ssot_consumer"
  ).length;
  const reservedCount = domains.filter(
    (d) => d.maturity === "reserved" || d.maturity === "deferred"
  ).length;
  const realtimeProjections = listRealtimeSsotProjections();

  return (
    <div
      data-slot="platform-ops-performance"
      data-program={PERFORMANCE_PLATFORM_PROGRAM}
      className={PLATFORM_OPS_UI.workspace}
    >
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.performance.architectureTitle")}
        description={t("admin.platformOps.performance.architectureBody")}
        health="unknown"
        healthLabel={t("admin.platformOps.performance.architectureOnly")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.performance.domainsReady")}
          value={String(architectureCount)}
          tone="info"
          domain="information"
          icon={Gauge}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.performance.domainsReserved")}
          value={String(reservedCount)}
          tone="info"
          domain="information"
          icon={Gauge}
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t("admin.platformOps.performance.dashboardSections")}
        description={t("admin.platformOps.performance.dashboardSectionsBody")}
      >
        <PlatformOpsModuleGrid>
          {PERFORMANCE_DASHBOARD_ARCHITECTURE.map((section) => (
            <PlatformOpsModuleTile
              key={section.id}
              href="/admin/platform/performance"
              title={section.title}
              description={section.maturity}
              live={section.maturity !== "reserved"}
              statusLabel={
                section.maturity === "ssot_consumer"
                  ? t("admin.platformOps.performance.ssotConsumer")
                  : section.maturity === "reserved"
                    ? t("admin.platformOps.reserved")
                    : t("admin.platformOps.performance.architectureOnly")
              }
            />
          ))}
        </PlatformOpsModuleGrid>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.performance.domainOwnership")}
        description={t("admin.platformOps.performance.domainOwnershipBody")}
      >
        <PlatformOpsOwnershipList
          items={domains.map(
            (d) => `${d.title} — ${d.maturity}${d.ssotOwner ? ` (${d.ssotOwner})` : ""}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.performance.realtimeSsot")}
        description={t("admin.platformOps.performance.realtimeSsotBody")}
        icon={Radio}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <PlatformOpsStatusBadge
            status="healthy"
            label={t("admin.platformOps.performance.ssotConsumer")}
          />
          <span className={PLATFORM_OPS_UI.metaText}>
            {t("admin.platformOps.performance.noDuplicateMetrics")}
          </span>
        </div>
        <PlatformOpsOwnershipList
          items={realtimeProjections.map(
            (m) => `${m.id} ← ${m.realtimeMetricId}`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.performance.healthModel")}
        description={t("admin.platformOps.performance.healthModelBody")}
      >
        <div className="flex flex-wrap gap-2">
          {PERFORMANCE_HEALTH_STATUSES.map((status) => (
            <PlatformOpsStatusBadge
              key={status}
              status={status === "critical" ? "unavailable" : status}
              label={status}
            />
          ))}
        </div>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.performance.scoreArchitecture")}
        description={t("admin.platformOps.performance.scoreArchitectureBody")}
      >
        <PlatformOpsOwnershipList
          items={PERFORMANCE_SCORE_ARCHITECTURE.map(
            (d) => `${d.title} — scoring deferred`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.performance.trends")}
        description={t("admin.platformOps.performance.trendsBody")}
      >
        <PlatformOpsOwnershipList
          items={PERFORMANCE_TREND_WINDOW_ARCHITECTURE.map(
            (w) => `${w.title} (${w.durationLabel})`
          )}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.performance.capacity")}
        description={t("admin.platformOps.performance.capacityBody")}
      >
        <PlatformOpsEmptyState
          icon={Gauge}
          title={t("admin.platformOps.performance.capacityReserved")}
          description={t("admin.platformOps.performance.capacityBody")}
        />
        <PlatformOpsOwnershipList
          items={PERFORMANCE_CAPACITY_ARCHITECTURE.map((c) => c.title)}
        />
      </PlatformOpsSection>
    </div>
  );
}
