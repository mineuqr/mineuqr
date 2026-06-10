import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { CommercialOverviewNeedsAttention } from "@/components/admin/commercial";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";
import { useCustomerSuccessCommercialData } from "./useCustomerSuccessCommercialData";

const ACCOUNTS_HREF = operationsTabHref("accounts");
const COMMERCIAL_HREF = "/admin/commercial";

/** Customer Success domain — platform command center attention queues. */
export function OverviewNeedsAttentionSection() {
  const { t } = useLanguage();
  const { query, attentionLabels, attentionHints } = useCustomerSuccessCommercialData();
  const { data: snapshot, isLoading } = query;
  const needsAttention = snapshot?.needsAttention;

  const allClear =
    !isLoading &&
    needsAttention != null &&
    needsAttention.expiringWithin30Days === 0 &&
    needsAttention.expiredAccounts === 0 &&
    needsAttention.canceledAccounts === 0;

  const drillHref = {
    expiringWithin30Days: ACCOUNTS_HREF,
    expiredAccounts: ACCOUNTS_HREF,
    canceledAccounts: ACCOUNTS_HREF,
  } as const;

  return (
    <AdminSection
      density="console"
      title={t("admin.commandCenter.attentionTitle")}
      description={t("admin.commandCenter.attentionDesc")}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" className={adminDash.opBtn} asChild>
            <Link href={ACCOUNTS_HREF}>{t("admin.commandCenter.viewAccounts")}</Link>
          </Button>
          <Button variant="outline" size="sm" className={adminDash.opBtn} asChild>
            <Link href={COMMERCIAL_HREF}>{t("admin.commandCenter.viewCommercial")}</Link>
          </Button>
        </div>
      }
    >
      {allClear ? (
        <AdminEmptyState
          icon={CheckCircle2}
          title={t("admin.commandCenter.attentionEmpty")}
          className={adminDash.operationsCard}
        />
      ) : (
        <CommercialOverviewNeedsAttention
          needsAttention={needsAttention}
          loading={isLoading}
          labels={attentionLabels}
          hints={attentionHints}
          drillHref={drillHref}
        />
      )}
    </AdminSection>
  );
}
