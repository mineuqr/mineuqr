import {
  CommercialOverviewNeedsAttention,
  CommercialOverviewSubscriptionHealth,
} from "@/components/admin/commercial";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useReportsCommercialOverviewData } from "@/components/admin/domains/reports";
import { useLanguage } from "@/contexts/LanguageContext";

/** Customer Success sections on commercial page — not Reports domain (REBUILD-5B). */
export function CommercialCustomerSuccessSections() {
  const { t } = useLanguage();
  const {
    query,
    healthLabels,
    attentionLabels,
    attentionHints,
  } = useReportsCommercialOverviewData();
  const { data: snapshot, isLoading } = query;

  return (
    <>
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
    </>
  );
}
