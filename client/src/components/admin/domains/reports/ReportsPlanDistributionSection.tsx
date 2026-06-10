import { CommercialOverviewPlanDistribution } from "@/components/admin/commercial";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReportsCommercialOverviewData } from "./useReportsCommercialOverviewData";

/** Reports domain — commercial plan distribution reporting. */
export function ReportsPlanDistributionSection() {
  const { t } = useLanguage();
  const { query, planLabels } = useReportsCommercialOverviewData();
  const { data: snapshot, isLoading } = query;

  return (
    <AdminSection
      density="console"
      title={t("admin.commercial.planDistributionTitle")}
      description={t("admin.commercial.planDistributionDesc")}
    >
      <CommercialOverviewPlanDistribution
        entries={snapshot?.planDistribution.entries}
        loading={isLoading}
        planLabels={planLabels}
      />
    </AdminSection>
  );
}
