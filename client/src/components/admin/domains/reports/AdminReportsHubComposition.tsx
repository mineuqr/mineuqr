/**
 * PLATFORM-P0-PRODUCTION-READINESS-1
 * Canonical Reports Hub — Commercial + Analytics destinations.
 * platform-ops-ui only. No KPI / reporting logic changes.
 */

import { BarChart3, FileText, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  PlatformOpsEmptyState,
  PlatformOpsHeroSummary,
  PlatformOpsMetricCard,
  PlatformOpsModuleGrid,
  PlatformOpsModuleTile,
  PlatformOpsOwnershipList,
  PlatformOpsSection,
  PLATFORM_OPS_UI,
} from "@/design-system/platform-ops-ui";

const REPORT_DESTINATIONS = [
  {
    id: "commercial",
    href: "/admin/commercial",
    titleKey: "admin.reportsHub.commercialTitle",
    bodyKey: "admin.reportsHub.commercialBody",
  },
  {
    id: "analytics",
    href: "/admin/analytics",
    titleKey: "admin.reportsHub.analyticsTitle",
    bodyKey: "admin.reportsHub.analyticsBody",
  },
] as const;

export function AdminReportsHubComposition() {
  const { t } = useLanguage();

  return (
    <div
      data-slot="admin-reports-hub"
      data-program="PLATFORM-P0-PRODUCTION-READINESS-1"
      className={PLATFORM_OPS_UI.workspace}
    >
      <PlatformOpsHeroSummary
        title={t("admin.reportsHub.title")}
        description={t("admin.reportsHub.body")}
        health="healthy"
        healthLabel={t("admin.platformOps.status.live")}
        columns={2}
      >
        <PlatformOpsMetricCard
          label={t("admin.reportsHub.destinations")}
          value={String(REPORT_DESTINATIONS.length)}
          tone="info"
          domain="information"
          icon={FileText}
        />
        <PlatformOpsMetricCard
          label={t("admin.reportsHub.canonicalEntry")}
          value={t("admin.nav.reports")}
          tone="success"
          domain="information"
          icon={BarChart3}
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t("admin.reportsHub.destinationsTitle")}
        description={t("admin.reportsHub.destinationsBody")}
      >
        <PlatformOpsModuleGrid>
          {REPORT_DESTINATIONS.map((dest) => (
            <PlatformOpsModuleTile
              key={dest.id}
              href={dest.href}
              title={t(dest.titleKey)}
              description={t(dest.bodyKey)}
              statusTone="healthy"
              statusLabel={t("admin.platformOps.status.live")}
            />
          ))}
        </PlatformOpsModuleGrid>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.reportsHub.ownershipTitle")}
        description={t("admin.reportsHub.ownershipBody")}
      >
        <PlatformOpsOwnershipList
          items={[
            t("admin.reportsHub.ownershipReports"),
            t("admin.reportsHub.ownershipCommercial"),
            t("admin.reportsHub.ownershipAnalytics"),
            t("admin.reportsHub.ownershipUnchanged"),
          ]}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.reportsHub.noteTitle")}
        description={t("admin.reportsHub.noteBody")}
      >
        <PlatformOpsEmptyState
          icon={TrendingUp}
          title={t("admin.reportsHub.noteTitle")}
          description={t("admin.reportsHub.noteBody")}
        />
      </PlatformOpsSection>
    </div>
  );
}
