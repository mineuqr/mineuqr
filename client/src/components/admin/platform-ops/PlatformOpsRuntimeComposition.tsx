/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Runtime architecture presentation surfaces under Platform Operations.
 * No workers/queues/schedulers/event-bus implementation. platform-ops-ui only.
 */

import { Activity, Cog, Radio, Stethoscope } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  EVENT_GOVERNANCE_ADRS,
  EVENT_GOVERNANCE_PRESERVED,
  EVENT_PIPELINE_ARCHITECTURE,
  JOB_PLATFORM_ARCHITECTURE,
  OPERATIONS_RUNTIME_PLATFORM_PROGRAM,
  QUEUE_PLATFORM_ARCHITECTURE,
  RETRY_ARCHITECTURE,
  RUNTIME_DASHBOARD_ARCHITECTURE,
  RUNTIME_DIAGNOSTICS_ARCHITECTURE,
  RUNTIME_DOMAIN_DEFINITIONS,
  RUNTIME_HEALTH_STATUSES,
  RUNTIME_PLATFORM_DOES_NOT_OWN,
  RUNTIME_TIMELINE_ARCHITECTURE,
  WORKER_PLATFORM_ARCHITECTURE,
} from "@shared/operations-runtime-platform";
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

export type PlatformOpsRuntimeSurface = "jobs" | "events" | "diagnostics";

type PlatformOpsRuntimeCompositionProps = {
  surface: PlatformOpsRuntimeSurface;
};

function mapHealthTone(
  status: (typeof RUNTIME_HEALTH_STATUSES)[number]
): "healthy" | "warning" | "degraded" | "unavailable" | "unknown" {
  if (status === "critical" || status === "offline") return "unavailable";
  if (status === "healthy" || status === "warning" || status === "degraded") {
    return status;
  }
  return "unknown";
}

export function PlatformOpsRuntimeComposition({
  surface,
}: PlatformOpsRuntimeCompositionProps) {
  const { t } = useLanguage();
  const architectureCount = RUNTIME_DOMAIN_DEFINITIONS.filter((d) =>
    ["architecture", "ssot_consumer", "adr_governed"].includes(d.maturity)
  ).length;
  const reservedCount = RUNTIME_DOMAIN_DEFINITIONS.filter(
    (d) => d.maturity === "reserved" || d.maturity === "deferred"
  ).length;

  const titleKey =
    surface === "jobs"
      ? "admin.platformOps.runtime.jobsTitle"
      : surface === "events"
        ? "admin.platformOps.runtime.eventsTitle"
        : "admin.platformOps.runtime.diagnosticsTitle";
  const bodyKey =
    surface === "jobs"
      ? "admin.platformOps.runtime.jobsBody"
      : surface === "events"
        ? "admin.platformOps.runtime.eventsBody"
        : "admin.platformOps.runtime.diagnosticsBody";

  return (
    <div
      data-slot="platform-ops-runtime"
      data-surface={surface}
      data-program={OPERATIONS_RUNTIME_PLATFORM_PROGRAM}
      className={PLATFORM_OPS_UI.workspace}
    >
      <PlatformOpsHeroSummary
        title={t(titleKey)}
        description={t(bodyKey)}
        health="unknown"
        healthLabel={t("admin.platformOps.runtime.architectureOnly")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.runtime.domainsDefined")}
          value={String(architectureCount)}
          tone="info"
          domain="information"
          icon={Cog}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.runtime.domainsReserved")}
          value={String(reservedCount)}
          tone="info"
          domain="information"
          icon={Cog}
        />
      </PlatformOpsHeroSummary>

      {surface === "jobs" ? (
        <>
          <PlatformOpsSection
            title={t("admin.platformOps.runtime.dashboardSections")}
            description={t("admin.platformOps.runtime.dashboardSectionsBody")}
          >
            <PlatformOpsModuleGrid>
              {RUNTIME_DASHBOARD_ARCHITECTURE.map((section) => (
                <PlatformOpsModuleTile
                  key={section.id}
                  href={section.hostPath}
                  title={section.title}
                  description={section.maturity}
                  live={section.maturity === "architecture"}
                  statusLabel={
                    section.maturity === "reserved"
                      ? t("admin.platformOps.reserved")
                      : t("admin.platformOps.runtime.architectureOnly")
                  }
                />
              ))}
            </PlatformOpsModuleGrid>
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.domainOwnership")}
            description={t("admin.platformOps.runtime.domainOwnershipBody")}
          >
            <PlatformOpsOwnershipList
              items={RUNTIME_DOMAIN_DEFINITIONS.map(
                (d) => `${d.title} — ${d.maturity}`
              )}
            />
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.jobPlatform")}
            description={t("admin.platformOps.runtime.jobPlatformBody")}
            icon={Cog}
          >
            <PlatformOpsEmptyState
              icon={Cog}
              title={t("admin.platformOps.runtime.reservationOnly")}
              description={t("admin.platformOps.runtime.jobPlatformBody")}
            />
            <PlatformOpsOwnershipList
              items={JOB_PLATFORM_ARCHITECTURE.map((j) => j.title)}
            />
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.queuePlatform")}
            description={t("admin.platformOps.runtime.queuePlatformBody")}
          >
            <PlatformOpsOwnershipList
              items={QUEUE_PLATFORM_ARCHITECTURE.map((q) => q.title)}
            />
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.workerPlatform")}
            description={t("admin.platformOps.runtime.workerPlatformBody")}
          >
            <PlatformOpsOwnershipList
              items={WORKER_PLATFORM_ARCHITECTURE.map((w) => w.title)}
            />
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.retryArchitecture")}
            description={t("admin.platformOps.runtime.retryArchitectureBody")}
          >
            <PlatformOpsOwnershipList
              items={RETRY_ARCHITECTURE.map((r) => r.title)}
            />
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.doesNotOwn")}
            description={t("admin.platformOps.runtime.doesNotOwnBody")}
          >
            <PlatformOpsOwnershipList
              items={[...RUNTIME_PLATFORM_DOES_NOT_OWN]}
            />
          </PlatformOpsSection>
        </>
      ) : null}

      {surface === "events" ? (
        <>
          <PlatformOpsSection
            title={t("admin.platformOps.runtime.eventPipeline")}
            description={t("admin.platformOps.runtime.eventPipelineBody")}
            icon={Radio}
          >
            <PlatformOpsOwnershipList
              items={EVENT_PIPELINE_ARCHITECTURE.map(
                (s) => `${s.title} — ${s.owner} (${s.runtimeRole})`
              )}
            />
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.eventGovernance")}
            description={t("admin.platformOps.runtime.eventGovernanceBody")}
          >
            <div className="mb-2 flex flex-wrap gap-2">
              {EVENT_GOVERNANCE_ADRS.map((adr) => (
                <PlatformOpsStatusBadge
                  key={adr}
                  status="healthy"
                  label={adr}
                />
              ))}
            </div>
            <PlatformOpsOwnershipList
              items={[...EVENT_GOVERNANCE_PRESERVED]}
            />
          </PlatformOpsSection>
        </>
      ) : null}

      {surface === "diagnostics" ? (
        <>
          <PlatformOpsSection
            title={t("admin.platformOps.runtime.diagnostics")}
            description={t("admin.platformOps.runtime.diagnosticsBody")}
            icon={Stethoscope}
          >
            <PlatformOpsEmptyState
              icon={Stethoscope}
              title={t("admin.platformOps.runtime.readOnly")}
              description={t("admin.platformOps.runtime.diagnosticsBody")}
            />
            <PlatformOpsOwnershipList
              items={RUNTIME_DIAGNOSTICS_ARCHITECTURE.map((d) => d.title)}
            />
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.healthModel")}
            description={t("admin.platformOps.runtime.healthModelBody")}
            icon={Activity}
          >
            <div className="flex flex-wrap gap-2">
              {RUNTIME_HEALTH_STATUSES.map((status) => (
                <PlatformOpsStatusBadge
                  key={status}
                  status={mapHealthTone(status)}
                  label={status}
                />
              ))}
            </div>
          </PlatformOpsSection>

          <PlatformOpsSection
            title={t("admin.platformOps.runtime.timeline")}
            description={t("admin.platformOps.runtime.timelineBody")}
          >
            <PlatformOpsOwnershipList
              items={RUNTIME_TIMELINE_ARCHITECTURE.map(
                (e) => `${e.title} (${e.category})`
              )}
            />
          </PlatformOpsSection>
        </>
      ) : null}
    </div>
  );
}
