/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-ADOPTION-1
 * Reserved architecture slot — foundation presentation only.
 */

import { Inbox } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PlatformOpsSectionId } from "@/lib/admin/platform-ops/platformOpsSections";
import { getPlatformOpsSection } from "@/lib/admin/platform-ops/platformOpsSections";
import {
  PlatformOpsEmptyState,
  PlatformOpsHeroSummary,
  PlatformOpsMetricCard,
  PlatformOpsOwnershipList,
  PlatformOpsSection,
} from "@/design-system/platform-ops-ui";

const FUTURE_OWNERSHIP: Record<
  Exclude<PlatformOpsSectionId, "overview" | "realtime" | "health">,
  string[]
> = {
  performance: [
    "admin.platformOps.future.performance.cpu",
    "admin.platformOps.future.performance.memory",
    "admin.platformOps.future.performance.api",
    "admin.platformOps.future.performance.db",
    "admin.platformOps.future.performance.realtime",
    "admin.platformOps.future.performance.queue",
  ],
  devices: [
    "admin.platformOps.future.devices.fleet",
    "admin.platformOps.future.devices.presence",
    "admin.platformOps.future.devices.config",
  ],
  jobs: [
    "admin.platformOps.future.jobs.workers",
    "admin.platformOps.future.jobs.schedulers",
    "admin.platformOps.future.jobs.retries",
    "admin.platformOps.future.jobs.queues",
    "admin.platformOps.future.jobs.history",
  ],
  events: [
    "admin.platformOps.future.events.domain",
    "admin.platformOps.future.events.consumers",
    "admin.platformOps.future.events.deadLetters",
    "admin.platformOps.future.events.retries",
    "admin.platformOps.future.events.throughput",
  ],
  audit: [
    "admin.platformOps.future.audit.platform",
    "admin.platformOps.future.audit.admin",
    "admin.platformOps.future.audit.security",
    "admin.platformOps.future.audit.ops",
  ],
  diagnostics: [
    "admin.platformOps.future.diagnostics.runtime",
    "admin.platformOps.future.diagnostics.probes",
    "admin.platformOps.future.diagnostics.env",
    "admin.platformOps.future.diagnostics.config",
    "admin.platformOps.future.diagnostics.connectivity",
  ],
};

type PlatformOpsReservedSectionProps = {
  sectionId: Exclude<
    PlatformOpsSectionId,
    "overview" | "realtime" | "health"
  >;
};

export function PlatformOpsReservedSection({
  sectionId,
}: PlatformOpsReservedSectionProps) {
  const { t } = useLanguage();
  const section = getPlatformOpsSection(sectionId);
  const ownership = FUTURE_OWNERSHIP[sectionId];

  return (
    <div data-slot="platform-ops-reserved">
      <PlatformOpsHeroSummary
        title={t(section.labelKey)}
        description={t("admin.platformOps.reservedBody")}
        health="unknown"
        healthLabel={t("admin.platformOps.reserved")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.reserved")}
          value={String(ownership.length)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={t(section.labelKey)}
          value={t("admin.platformOps.architectureOnly")}
          tone="info"
          domain="information"
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t(section.labelKey)}
        description={t("admin.platformOps.reservedBody")}
      >
        <PlatformOpsEmptyState
          icon={Inbox}
          title={t("admin.platformOps.reserved")}
          description={t("admin.platformOps.architectureOnly")}
        />
        <PlatformOpsOwnershipList items={ownership.map((key) => t(key))} />
      </PlatformOpsSection>
    </div>
  );
}
