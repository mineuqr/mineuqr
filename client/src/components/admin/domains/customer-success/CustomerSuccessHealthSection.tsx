import { CommercialOverviewSubscriptionHealth } from "@/components/admin/commercial";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCustomerSuccessCommercialData } from "./useCustomerSuccessCommercialData";

/** Customer Success domain — subscription health indicators. */
export function CustomerSuccessHealthSection() {
  const { t } = useLanguage();
  const { query, healthLabels } = useCustomerSuccessCommercialData();
  const { data: snapshot, isLoading } = query;

  return (
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
  );
}
