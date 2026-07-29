/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1
 * Elevates Catalog management into an enterprise SaaS admin workspace.
 * Orchestrates existing commercialCatalog services — no domain duplication.
 */

import { useCallback, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Globe2,
  Layers,
} from "lucide-react";
import { useCatalogI18n } from "./commercial-catalog/useCatalogI18n";
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
import {
  MANAGEMENT_SECTION_I18N_KEYS,
} from "./commercial-catalog/catalogUiHelpers";
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
import {
  EXPERIENCE_TABS,
  EXPERIENCE_TAB_I18N_KEYS,
  type ExperienceTab,
} from "./commercial-catalog/experience/experienceNav";
import { PlanCreationWizard } from "./commercial-catalog/experience/PlanCreationWizard";
import {
  BulkOperationsPanel,
  CommercialTimelinePanel,
  CustomerPreviewPanel,
  DeepClonePanel,
  DependencyGraphPanel,
  ExperienceDashboard,
  GlobalCatalogSearch,
  PricingPreviewPanel,
  ProductivityRail,
  PublicationDiffPanel,
  SmartValidationEnhancer,
  useCatalogExperienceShortcuts,
  VersionComparePanel,
} from "./commercial-catalog/experience/ExperiencePanels";

export function PlatformOpsCommercialCatalogComposition() {
  const { t, cc, language } = useCatalogI18n();
  const [experienceTab, setExperienceTab] = useState<ExperienceTab>("dashboard");
  const [section, setSection] =
    useState<CommercialCatalogDashboardSection>("plans");
  const data = useCatalogManagementData();

  const navigateSection = useCallback((s: CommercialCatalogDashboardSection) => {
    setExperienceTab("manage");
    setSection(s);
  }, []);

  useCatalogExperienceShortcuts({
    onSearch: () => setExperienceTab("search"),
    onWizard: () => setExperienceTab("wizard"),
    onDashboard: () => setExperienceTab("dashboard"),
  });

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
      data-program="COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1"
      data-localization="COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1"
      data-experience="COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1"
      data-management="COMMERCIAL-CATALOG-MANAGEMENT-UI-1"
      data-foundation={COMMERCIAL_CATALOG_FOUNDATION_PROGRAM}
      data-host-path={COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH}
      className={cn(PLATFORM_OPS_UI.workspace, "dark:bg-background")}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.commercialCatalog.title")}
        description={t("admin.platformOps.commercialCatalog.heroDescription")}
        health={healthTone}
        healthLabel={t("admin.platformOps.commercialCatalog.experienceLive")}
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

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div>
          <nav
            aria-label={cc("a11y.experienceNav")}
            className="flex flex-wrap gap-2 border-b pb-3"
          >
            {EXPERIENCE_TABS.map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={experienceTab === id ? "default" : "outline"}
                className={cn(experienceTab === id && "shadow-sm")}
                onClick={() => setExperienceTab(id)}
              >
                {t(EXPERIENCE_TAB_I18N_KEYS[id])}
              </Button>
            ))}
          </nav>

          <div className="pt-3">
            {experienceTab === "dashboard" ? (
              <ExperienceDashboard data={data} />
            ) : null}
            {experienceTab === "wizard" ? (
              <PlanCreationWizard data={data} onNavigate={navigateSection} />
            ) : null}
            {experienceTab === "search" ? (
              <GlobalCatalogSearch
                data={data}
                onNavigate={navigateSection}
              />
            ) : null}
            {experienceTab === "compare" ? (
              <div className="space-y-6">
                <VersionComparePanel data={data} />
                <DeepClonePanel data={data} />
                <PublicationDiffPanel data={data} />
                <SmartValidationEnhancer
                  data={data}
                  onNavigate={navigateSection}
                />
              </div>
            ) : null}
            {experienceTab === "preview" ? (
              <PricingPreviewPanel data={data} />
            ) : null}
            {experienceTab === "customer_preview" ? (
              <CustomerPreviewPanel data={data} />
            ) : null}
            {experienceTab === "graph" ? (
              <DependencyGraphPanel
                data={data}
                onNavigate={navigateSection}
              />
            ) : null}
            {experienceTab === "timeline" ? (
              <CommercialTimelinePanel data={data} />
            ) : null}
            {experienceTab === "bulk" ? (
              <BulkOperationsPanel data={data} />
            ) : null}
            {experienceTab === "manage" ? (
              <div>
                <nav
                  aria-label={cc("a11y.manageModules")}
                  className="mb-3 flex flex-wrap gap-2"
                >
                  {COMMERCIAL_CATALOG_DASHBOARD_SECTIONS.map((id) => (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={section === id ? "default" : "outline"}
                      onClick={() => setSection(id)}
                    >
                      {t(MANAGEMENT_SECTION_I18N_KEYS[id])}
                    </Button>
                  ))}
                </nav>
                {section === "plans" ? (
                  <PlansManagementPanel data={data} />
                ) : null}
                {section === "plan_versions" ? (
                  <VersionsManagementPanel data={data} />
                ) : null}
                {section === "pricing" ? (
                  <PricingManagementPanel data={data} />
                ) : null}
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
            ) : null}
          </div>
        </div>
        <ProductivityRail data={data} />
      </div>
    </div>
  );
}
