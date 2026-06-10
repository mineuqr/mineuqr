import { CommercialOverviewMetadataPanel } from "@/components/admin/commercial";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useReportsCommercialOverviewData } from "./useReportsCommercialOverviewData";

/** Reports domain — commercial report authority metadata panel. */
export function ReportsMetadataSection() {
  const { locale, query, metadataLabels } = useReportsCommercialOverviewData();
  const { data: snapshot, isLoading } = query;

  return (
    <AdminSection density="console" title={metadataLabels.title}>
      <CommercialOverviewMetadataPanel
        metadata={snapshot?.metadata}
        loading={isLoading}
        locale={locale}
        labels={metadataLabels}
      />
    </AdminSection>
  );
}
