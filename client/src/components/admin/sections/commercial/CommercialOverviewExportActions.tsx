import { CommercialExportButtons } from "@/components/admin/commercial";
import { useCommercialOverviewData } from "./useCommercialOverviewData";

export function CommercialOverviewExportActions() {
  const { locale, query } = useCommercialOverviewData();

  return (
    <CommercialExportButtons
      locale={locale}
      disabled={query.isLoading || query.isError}
    />
  );
}
