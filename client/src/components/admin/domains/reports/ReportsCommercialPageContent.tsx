import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReportsExecutiveSection } from "./ReportsExecutiveSection";
import { ReportsMetadataSection } from "./ReportsMetadataSection";
import { ReportsPlanDistributionSection } from "./ReportsPlanDistributionSection";
import { useReportsCommercialOverviewData } from "./useReportsCommercialOverviewData";

type ReportsCommercialPageContentProps = {
  /** Slot for non-Reports sections (e.g. Customer Success) between metadata and plan distribution. */
  betweenMetadataAndPlan?: ReactNode;
};

/**
 * Reports domain — commercial page content in legacy section order:
 * executive → metadata → [slot] → plan distribution.
 */
export function ReportsCommercialPageContent({
  betweenMetadataAndPlan,
}: ReportsCommercialPageContentProps) {
  const { t } = useLanguage();
  const { query } = useReportsCommercialOverviewData();
  const { isError } = query;

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
      <ReportsExecutiveSection />
      <ReportsMetadataSection />
      {betweenMetadataAndPlan}
      <ReportsPlanDistributionSection />
    </>
  );
}
