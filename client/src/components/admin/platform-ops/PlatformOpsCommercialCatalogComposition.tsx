/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * Platform Operations Commercial Catalog workspace.
 * Uses platform-ops-ui exclusively. Wired to commercialCatalog tRPC.
 */

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Globe2,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  COMMERCIAL_CATALOG_ARCHITECTURE_PRINCIPLES,
  COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH,
  COMMERCIAL_CATALOG_DASHBOARD_SECTIONS,
  COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN,
  COMMERCIAL_CATALOG_PLATFORM_OWNS,
} from "@shared/commercial-catalog";
import {
  PlatformOpsEmptyState,
  PlatformOpsErrorState,
  PlatformOpsHeroSummary,
  PlatformOpsLoadingState,
  PlatformOpsMetricCard,
  PlatformOpsModuleGrid,
  PlatformOpsModuleTile,
  PlatformOpsOwnershipList,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PlatformOpsTable,
  PlatformOpsTableBody,
  PlatformOpsTableCell,
  PlatformOpsTableHead,
  PlatformOpsTableHeader,
  PlatformOpsTableRow,
  PLATFORM_OPS_UI,
} from "@/design-system/platform-ops-ui";

const SECTION_LABELS: Record<
  (typeof COMMERCIAL_CATALOG_DASHBOARD_SECTIONS)[number],
  string
> = {
  plans: "Plans",
  plan_versions: "Plan Versions",
  pricing: "Pricing",
  billing_cycles: "Billing Cycles",
  feature_bundles: "Feature Bundles",
  limit_profiles: "Limit Profiles",
  regional_policies: "Regional Policies",
  trial_policies: "Trial Policies",
  promotions: "Promotion Definitions",
  migration_policies: "Migration Policies",
  retirement_policies: "Retirement Policies",
  publication_status: "Publication Status",
  commercial_health: "Commercial Health",
  commercial_validation: "Commercial Validation",
};

export function PlatformOpsCommercialCatalogComposition() {
  const { t } = useLanguage();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );

  const healthQuery = trpc.commercialCatalog.health.useQuery(undefined, {
    refetchInterval: 15_000,
  });
  const plansQuery = trpc.commercialCatalog.listPlans.useQuery();
  const versionsQuery = trpc.commercialCatalog.listVersions.useQuery();
  const regionsQuery = trpc.commercialCatalog.listRegions.useQuery();
  const promotionsQuery = trpc.commercialCatalog.listPromotions.useQuery();
  const cyclesQuery = trpc.commercialCatalog.listBillingCycles.useQuery();
  const bundlesQuery = trpc.commercialCatalog.listFeatureBundles.useQuery();
  const limitsQuery = trpc.commercialCatalog.listLimitProfiles.useQuery();
  const trialsQuery = trpc.commercialCatalog.listTrialPolicies.useQuery();
  const migrationQuery = trpc.commercialCatalog.listMigrationPolicies.useQuery();
  const retirementQuery =
    trpc.commercialCatalog.listRetirementPolicies.useQuery();
  const pricesQuery = trpc.commercialCatalog.listPrices.useQuery(
    selectedVersionId ? { planVersionId: selectedVersionId } : undefined
  );
  const validationQuery = trpc.commercialCatalog.validatePublication.useQuery(
    { versionId: selectedVersionId! },
    { enabled: Boolean(selectedVersionId) }
  );

  const health = healthQuery.data;
  const versions = versionsQuery.data ?? [];

  const healthTone =
    health?.status === "healthy"
      ? ("healthy" as const)
      : health?.status === "warning"
        ? ("warning" as const)
        : health?.status === "degraded"
          ? ("degraded" as const)
          : ("unknown" as const);

  const loading =
    healthQuery.isLoading || plansQuery.isLoading || versionsQuery.isLoading;

  const moduleCounts = useMemo(
    () => ({
      plans: plansQuery.data?.length ?? 0,
      versions: versions.length,
      published: health?.versions.published ?? 0,
      regions: regionsQuery.data?.length ?? 0,
      promotions: promotionsQuery.data?.length ?? 0,
    }),
    [
      plansQuery.data,
      versions.length,
      health,
      regionsQuery.data,
      promotionsQuery.data,
    ]
  );

  if (loading) {
    return <PlatformOpsLoadingState />;
  }

  if (healthQuery.isError) {
    return (
      <PlatformOpsErrorState
        title={t("admin.platformOps.commercialCatalog.loadError")}
        message={healthQuery.error.message}
      />
    );
  }

  return (
    <div
      data-slot="platform-ops-commercial-catalog"
      data-program={COMMERCIAL_CATALOG_FOUNDATION_PROGRAM}
      data-host-path={COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH}
      className={PLATFORM_OPS_UI.workspace}
    >
      <PlatformOpsHeroSummary
        title={t("admin.platformOps.commercialCatalog.title")}
        description={t("admin.platformOps.commercialCatalog.body")}
        health={healthTone}
        healthLabel={t("admin.platformOps.commercialCatalog.foundationLive")}
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

      <PlatformOpsSection
        title={t("admin.platformOps.commercialCatalog.modulesTitle")}
        description={t("admin.platformOps.commercialCatalog.modulesBody")}
      >
        <PlatformOpsModuleGrid>
          {COMMERCIAL_CATALOG_DASHBOARD_SECTIONS.map((id) => (
            <PlatformOpsModuleTile
              key={id}
              href={COMMERCIAL_CATALOG_DASHBOARD_HOST_PATH}
              title={SECTION_LABELS[id]}
              description={t(
                `admin.platformOps.commercialCatalog.section.${id}`
              )}
              statusTone="healthy"
              statusLabel={t(
                "admin.platformOps.commercialCatalog.foundationLive"
              )}
              live
            />
          ))}
        </PlatformOpsModuleGrid>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.commercialCatalog.publicationTitle")}
        description={t("admin.platformOps.commercialCatalog.publicationBody")}
      >
        {versions.length === 0 ? (
          <PlatformOpsEmptyState
            title={t("admin.platformOps.commercialCatalog.noVersions")}
            description={t(
              "admin.platformOps.commercialCatalog.noVersionsBody"
            )}
          />
        ) : (
          <PlatformOpsTable>
            <PlatformOpsTableHeader>
              <PlatformOpsTableRow>
                <PlatformOpsTableHead>Version</PlatformOpsTableHead>
                <PlatformOpsTableHead>State</PlatformOpsTableHead>
                <PlatformOpsTableHead>Plan</PlatformOpsTableHead>
                <PlatformOpsTableHead>Select</PlatformOpsTableHead>
              </PlatformOpsTableRow>
            </PlatformOpsTableHeader>
            <PlatformOpsTableBody>
              {versions.map((v) => (
                <PlatformOpsTableRow key={v.id}>
                  <PlatformOpsTableCell>
                    {v.versionName} ({v.versionCode})
                  </PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    <PlatformOpsStatusBadge
                      status={
                        v.state === "published"
                          ? "healthy"
                          : v.state === "draft"
                            ? "warning"
                            : v.state === "retired"
                              ? "unavailable"
                              : "degraded"
                      }
                      label={v.state}
                    />
                  </PlatformOpsTableCell>
                  <PlatformOpsTableCell className="font-mono text-xs">
                    {v.planId.slice(0, 8)}…
                  </PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    <button
                      type="button"
                      className="text-sm underline"
                      onClick={() => setSelectedVersionId(v.id)}
                    >
                      {selectedVersionId === v.id ? "Selected" : "Validate"}
                    </button>
                  </PlatformOpsTableCell>
                </PlatformOpsTableRow>
              ))}
            </PlatformOpsTableBody>
          </PlatformOpsTable>
        )}

        {selectedVersionId ? (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <PlatformOpsStatusBadge
                status={
                  validationQuery.data?.ok
                    ? "healthy"
                    : validationQuery.data
                      ? "degraded"
                      : "unknown"
                }
                label={
                  validationQuery.data?.ok
                    ? "CC-16 Valid"
                    : validationQuery.data
                      ? "CC-16 Incomplete"
                      : "Validating…"
                }
              />
              <span className="text-sm text-muted-foreground">
                Prices for selection: {pricesQuery.data?.length ?? 0}
              </span>
            </div>
            {validationQuery.data && !validationQuery.data.ok ? (
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {validationQuery.data.issues.map((issue) => (
                  <li key={`${issue.code}-${issue.message}`}>
                    {issue.code}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.commercialCatalog.catalogCountsTitle")}
        description={t("admin.platformOps.commercialCatalog.catalogCountsBody")}
      >
        <div className="flex flex-wrap gap-2">
          <PlatformOpsStatusBadge
            status="healthy"
            label={`Cycles ${cyclesQuery.data?.length ?? 0}`}
          />
          <PlatformOpsStatusBadge
            status="healthy"
            label={`Bundles ${bundlesQuery.data?.length ?? 0}`}
          />
          <PlatformOpsStatusBadge
            status="healthy"
            label={`Limits ${limitsQuery.data?.length ?? 0}`}
          />
          <PlatformOpsStatusBadge
            status="healthy"
            label={`Trials ${trialsQuery.data?.length ?? 0}`}
          />
          <PlatformOpsStatusBadge
            status="healthy"
            label={`Migrations ${migrationQuery.data?.length ?? 0}`}
          />
          <PlatformOpsStatusBadge
            status="healthy"
            label={`Retirement ${retirementQuery.data?.length ?? 0}`}
          />
          <PlatformOpsStatusBadge
            status="healthy"
            label={`Promotions ${moduleCounts.promotions}`}
          />
        </div>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.commercialCatalog.errorsTitle")}
        description={t("admin.platformOps.commercialCatalog.errorsBody")}
      >
        <div className="flex flex-wrap gap-2 items-center">
          <ShieldAlert className="h-4 w-4" />
          <PlatformOpsStatusBadge
            status={
              (health?.publicationErrors ?? 0) > 0 ? "warning" : "healthy"
            }
            label={`Publication errors ${health?.publicationErrors ?? 0}`}
          />
          <PlatformOpsStatusBadge
            status={(health?.validationErrors ?? 0) > 0 ? "warning" : "healthy"}
            label={`Validation errors ${health?.validationErrors ?? 0}`}
          />
        </div>
        {health?.lastPublicationError ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Last publication: {health.lastPublicationError}
          </p>
        ) : null}
        {health?.lastValidationError ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Last validation: {health.lastValidationError}
          </p>
        ) : null}
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.commercialCatalog.ownsTitle")}
        description={t("admin.platformOps.commercialCatalog.ownsBody")}
      >
        <PlatformOpsOwnershipList
          items={COMMERCIAL_CATALOG_PLATFORM_OWNS.map((id) => id)}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.commercialCatalog.doesNotOwnTitle")}
        description={t("admin.platformOps.commercialCatalog.doesNotOwnBody")}
      >
        <PlatformOpsOwnershipList
          items={COMMERCIAL_CATALOG_PLATFORM_DOES_NOT_OWN.map((id) => id)}
        />
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.commercialCatalog.principlesTitle")}
        description={t("admin.platformOps.commercialCatalog.principlesBody")}
      >
        <PlatformOpsOwnershipList
          items={COMMERCIAL_CATALOG_ARCHITECTURE_PRINCIPLES.map((id) => id)}
        />
      </PlatformOpsSection>
    </div>
  );
}
