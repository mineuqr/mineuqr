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
  Exclude<
    PlatformOpsSectionId,
    | "overview"
    | "realtime"
    | "health"
    | "performance"
    | "devices"
    | "jobs"
    | "events"
    | "diagnostics"
  >,
  string[]
> = {
  subscription: [
    "admin.platformOps.subscription.architectureTitle",
  ],
  commercialCatalog: [
    "admin.platformOps.sections.commercialCatalog",
  ],
  audit: [
    "admin.platformOps.future.audit.platform",
    "admin.platformOps.future.audit.admin",
    "admin.platformOps.future.audit.security",
    "admin.platformOps.future.audit.ops",
  ],
};

type PlatformOpsReservedSectionProps = {
  sectionId: Exclude<
    PlatformOpsSectionId,
    | "overview"
    | "realtime"
    | "health"
    | "performance"
    | "devices"
    | "jobs"
    | "events"
    | "diagnostics"
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
        healthLabel={t("admin.platformOps.status.reserved")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.status.reserved")}
          value={String(ownership.length)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={t(section.labelKey)}
          value={t("admin.platformOps.status.reserved")}
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
          title={t("admin.platformOps.status.reserved")}
          description={t("admin.platformOps.architectureOnly")}
        />
        <PlatformOpsOwnershipList items={ownership.map((key) => t(key))} />
      </PlatformOpsSection>
    </div>
  );
}
