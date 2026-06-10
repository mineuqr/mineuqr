import { Clock, DollarSign, FlaskConical, Users } from "lucide-react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { PageDataLoading } from "@/components/AuthGate";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { AdminStatCard } from "@/components/admin/layout/AdminStatCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { mapDashboardSummaryToKPIs } from "@/lib/admin/dashboardSummaryKpis";
import { formatAdminKpiNumber, formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";

/** Reports domain — platform command center executive snapshot. */
export function ReportsHomeKpiSection() {
  const { t, language } = useLanguage();
  const gate = useAuthGate();
  const locale = language === "ar" ? "ar" : "en";
  const adminEnabled = adminQueriesEnabled(
    gate.authPending,
    gate.isAuthenticated,
    gate.user?.role === "admin"
  );

  const { data: summary, isLoading } = trpc.admin.getDashboardSummary.useQuery(
    undefined,
    { enabled: adminEnabled }
  );

  const kpis = mapDashboardSummaryToKPIs(summary);

  return (
    <AdminPageSection ariaLabel={t("admin.kpiOverview")} spacing="tight">
      {isLoading ? (
        <PageDataLoading minHeight="min-h-[96px]" />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-5">
          <AdminStatCard
            compact
            title={t("admin.estimatedMrr")}
            icon={DollarSign}
            value={formatAdminRevenueUSD(kpis.estimatedMrr, locale)}
            hint={t("admin.estimatedMrrHint")}
            valueDir="ltr"
          />
          <AdminStatCard
            compact
            title={t("admin.activeSubscriptions")}
            icon={Users}
            value={formatAdminKpiNumber(kpis.activeSubscriptions)}
            hint={t("admin.nav.statCanonical")}
          />
          <AdminStatCard
            compact
            title={t("admin.commandCenter.activeTrials")}
            icon={FlaskConical}
            value={formatAdminKpiNumber(kpis.activeTrials)}
            hint={t("admin.commandCenter.activeTrialsHint")}
          />
          <AdminStatCard
            compact
            title={t("admin.expiringSoon")}
            icon={Clock}
            value={formatAdminKpiNumber(kpis.expiringSoon)}
            hint={t("admin.expiringSoonHint")}
          />
          <AdminStatCard
            compact
            title={t("admin.totalUsers")}
            icon={Users}
            value={formatAdminKpiNumber(kpis.totalUsers)}
          />
        </div>
      )}
    </AdminPageSection>
  );
}
