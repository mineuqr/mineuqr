import { AlertCircle } from "lucide-react";
import {
  CommercialOverviewExecutiveKpis,
  CommercialOverviewMetadataPanel,
  CommercialOverviewNeedsAttention,
  CommercialOverviewPlanDistribution,
  CommercialOverviewSubscriptionHealth,
} from "@/components/admin/commercial";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCommercialOverviewData } from "./useCommercialOverviewData";

export function CommercialOverviewSections() {
  const { t } = useLanguage();
  const {
    locale,
    query,
    kpiLabels,
    metadataLabels,
    healthLabels,
    attentionLabels,
    attentionHints,
    planLabels,
  } = useCommercialOverviewData();

  const { data: snapshot, isLoading, isError } = query;

  if (isError) {
    return (
      <AdminEmptyState
        icon={AlertCircle}
        title={t("admin.commercial.loadError")}
        description={t("admin.commercial.loadErrorDesc")}
      />
    );
  }

  return (
    <>
      <AdminSection title={t("admin.commercial.executiveTitle")}>
        <CommercialOverviewExecutiveKpis
          executive={snapshot?.executive}
          loading={isLoading}
          locale={locale}
          labels={kpiLabels}
        />
      </AdminSection>

      <AdminSection title={metadataLabels.title}>
        <CommercialOverviewMetadataPanel
          metadata={snapshot?.metadata}
          loading={isLoading}
          locale={locale}
          labels={metadataLabels}
        />
      </AdminSection>

      <AdminSection
        title={t("admin.commercial.healthTitle")}
        description={t("admin.commercial.healthDesc")}
      >
        <CommercialOverviewSubscriptionHealth
          subscriptionHealth={snapshot?.subscriptionHealth}
          loading={isLoading}
          labels={healthLabels}
        />
      </AdminSection>

      <AdminSection
        title={t("admin.commercial.attentionTitle")}
        description={t("admin.commercial.attentionDesc")}
      >
        <CommercialOverviewNeedsAttention
          needsAttention={snapshot?.needsAttention}
          loading={isLoading}
          labels={attentionLabels}
          hints={attentionHints}
        />
      </AdminSection>

      <AdminSection
        title={t("admin.commercial.planDistributionTitle")}
        description={t("admin.commercial.planDistributionDesc")}
      >
        <CommercialOverviewPlanDistribution
          entries={snapshot?.planDistribution.entries}
          loading={isLoading}
          planLabels={planLabels}
        />
      </AdminSection>
    </>
  );
}
