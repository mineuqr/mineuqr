import { CommercialOverviewNeedsAttention } from "@/components/admin/commercial";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCustomerSuccessCommercialData } from "./useCustomerSuccessCommercialData";

/** Customer Success domain — retention / needs-attention workflow. */
export function CustomerSuccessAttentionSection() {
  const { t } = useLanguage();
  const { query, attentionLabels, attentionHints } = useCustomerSuccessCommercialData();
  const { data: snapshot, isLoading } = query;

  return (
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
  );
}
