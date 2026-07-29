/**
 * COMMERCIAL-CATALOG-MANAGEMENT-UI-1
 * Full Commercial Catalog management workspace (replaces read-only dashboard).
 */

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Globe2,
  Layers,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH,
  COMMERCIAL_CATALOG_DASHBOARD_SECTIONS,
  COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  type CommercialCatalogDashboardSection,
} from "@shared/commercial-catalog";
import {
  PlatformOpsErrorState,
  PlatformOpsHeroSummary,
  PlatformOpsLoadingState,
  PlatformOpsMetricCard,
  PLATFORM_OPS_UI,
} from "@/design-system/platform-ops-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MANAGEMENT_SECTION_LABELS } from "./commercial-catalog/catalogUiHelpers";
import { useCatalogManagementData } from "./commercial-catalog/useCatalogManagementData";
import {
  BillingCyclesManagementPanel,
  FeatureBundlesManagementPanel,
  HealthManagementPanel,
  LimitProfilesManagementPanel,
  MigrationPoliciesManagementPanel,
  PlansManagementPanel,
  PricingManagementPanel,
  PromotionsManagementPanel,
  PublicationManagementPanel,
  RegionsManagementPanel,
  RetirementPoliciesManagementPanel,
  TrialPoliciesManagementPanel,
  ValidationManagementPanel,
  VersionsManagementPanel,
} from "./commercial-catalog/CatalogManagementPanels";

export function PlatformOpsCommercialCatalogComposition() {
  const { t } = useLanguage();
  const [section, setSection] =
    useState<CommercialCatalogDashboardSection>("plans");
  const data = useCatalogManagementData();

  const health = data.healthQuery.data;
  const healthTone =
    health?.status === "healthy"
      ? ("healthy" as const)
      : health?.status === "warning"
        ? ("warning" as const)
        : health?.status === "degraded"
          ? ("degraded" as const)
          : ("unknown" as const);

  const moduleCounts = useMemo(
    () => ({
      plans: data.plansQuery.data?.length ?? 0,
      versions: data.versionsQuery.data?.length ?? 0,
      published: health?.versions.published ?? 0,
      regions: data.regionsQuery.data?.length ?? 0,
    }),
    [
      data.plansQuery.data,
      data.versionsQuery.data,
      health,
      data.regionsQuery.data,
    ]
  );

  const loading =
    data.healthQuery.isLoading ||
    data.plansQuery.isLoading ||
    data.versionsQuery.isLoading;

  if (loading) {
    return <PlatformOpsLoadingState />;
  }

  if (data.healthQuery.isError) {
    return (
      <PlatformOpsErrorState
        title={t("admin.platformOps.commercialCatalog.loadError")}
        message={data.healthQuery.error.message}
      />
    );
  }

  return (
    <div
      data-slot="platform-ops-commercial-catalog"
      data-program="COMMERCIAL-CATALOG-MANAGEMENT-UI-1"
      data-foundation={COMMERCIAL_CATALOG_FOUNDATION_PROGRAM}
      data-host-path={COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH}
      className={PLATFORM_OPS_UI.workspace}
    >
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.commercialCatalog.title")}
        description="Production-grade Commercial Catalog management — create, edit, validate, publish, deprecate, and retire offerings without database access."
        health={healthTone}
        healthLabel="Management live"
        columns={4}
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.commercialCatalog.metricPlans")}
          value={String(moduleCounts.plans)}
          tone="info"
          domain="information"
          icon={BookOpen}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.commercialCatalog.metricVersions")}
          value={String(moduleCounts.versions)}
          tone="info"
          domain="information"
          icon={Layers}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.commercialCatalog.metricPublished")}
          value={String(moduleCounts.published)}
          tone="info"
          domain="information"
          icon={CheckCircle2}
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.commercialCatalog.metricRegions")}
          value={String(moduleCounts.regions)}
          tone="info"
          domain="information"
          icon={Globe2}
        />
      </PlatformOpsHeroSummary>

      <nav
        aria-label="Commercial Catalog modules"
        className="flex flex-wrap gap-2 border-b pb-3"
      >
        {COMMERCIAL_CATALOG_DASHBOARD_SECTIONS.map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={section === id ? "default" : "outline"}
            className={cn(section === id && "shadow-sm")}
            onClick={() => setSection(id)}
          >
            {MANAGEMENT_SECTION_LABELS[id]}
          </Button>
        ))}
      </nav>

      <div className="pt-2">
        {section === "plans" ? <PlansManagementPanel data={data} /> : null}
        {section === "plan_versions" ? (
          <VersionsManagementPanel data={data} />
        ) : null}
        {section === "pricing" ? <PricingManagementPanel data={data} /> : null}
        {section === "billing_cycles" ? (
          <BillingCyclesManagementPanel data={data} />
        ) : null}
        {section === "feature_bundles" ? (
          <FeatureBundlesManagementPanel data={data} />
        ) : null}
        {section === "limit_profiles" ? (
          <LimitProfilesManagementPanel data={data} />
        ) : null}
        {section === "trial_policies" ? (
          <TrialPoliciesManagementPanel data={data} />
        ) : null}
        {section === "regional_policies" ? (
          <RegionsManagementPanel data={data} />
        ) : null}
        {section === "promotions" ? (
          <PromotionsManagementPanel data={data} />
        ) : null}
        {section === "migration_policies" ? (
          <MigrationPoliciesManagementPanel data={data} />
        ) : null}
        {section === "retirement_policies" ? (
          <RetirementPoliciesManagementPanel data={data} />
        ) : null}
        {section === "publication_status" ? (
          <PublicationManagementPanel data={data} />
        ) : null}
        {section === "commercial_validation" ? (
          <ValidationManagementPanel data={data} />
        ) : null}
        {section === "commercial_health" ? (
          <HealthManagementPanel data={data} />
        ) : null}
      </div>
    </div>
  );
}
