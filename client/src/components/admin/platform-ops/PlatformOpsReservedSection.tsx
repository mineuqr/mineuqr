/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Reserved architecture slot — presentation only.
 */

import { Inbox } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PlatformOpsSectionId } from "@/lib/admin/platform-ops/platformOpsSections";
import { getPlatformOpsSection } from "@/lib/admin/platform-ops/platformOpsSections";
import {
  PlatformOpsEmptyState,
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
    <PlatformOpsSection
      title={t(section.labelKey)}
      description={t("admin.platformOps.reservedBody")}
    >
      <PlatformOpsEmptyState
        icon={Inbox}
        title={t("admin.platformOps.reserved")}
        description={t("admin.platformOps.architectureOnly")}
      />
      <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-cyan-200/80">
        {ownership.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </PlatformOpsSection>
  );
}
