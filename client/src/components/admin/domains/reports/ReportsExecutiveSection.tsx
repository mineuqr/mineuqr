import { CommercialOverviewExecutiveKpis } from "@/components/admin/commercial";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReportsCommercialOverviewData } from "./useReportsCommercialOverviewData";

/** Reports domain — commercial executive KPI block. */
export function ReportsExecutiveSection() {
  const { t } = useLanguage();
  const { locale, query, kpiLabels } = useReportsCommercialOverviewData();
  const { data: snapshot, isLoading } = query;

  return (
    <AdminSection title={t("admin.commercial.executiveTitle")}>
      <CommercialOverviewExecutiveKpis
        executive={snapshot?.executive}
        loading={isLoading}
        locale={locale}
        labels={kpiLabels}
      />
    </AdminSection>
  );
}
