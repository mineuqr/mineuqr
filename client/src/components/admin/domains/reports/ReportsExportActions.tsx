import { CommercialExportButtons } from "@/components/admin/commercial";
import { useReportsCommercialOverviewData } from "./useReportsCommercialOverviewData";

/** Reports domain — commercial page header export actions. */
export function ReportsExportActions() {
  const { locale, query } = useReportsCommercialOverviewData();

  return (
    <CommercialExportButtons
      locale={locale}
      disabled={query.isLoading || query.isError}
    />
  );
}
