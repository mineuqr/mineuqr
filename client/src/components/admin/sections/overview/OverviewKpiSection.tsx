import { Clock, DollarSign, Users, UtensilsCrossed } from "lucide-react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { PageDataLoading } from "@/components/AuthGate";
import { AdminStatCard } from "@/components/admin/layout/AdminStatCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { mapDashboardSummaryToKPIs } from "@/lib/admin/dashboardSummaryKpis";
import { formatAdminKpiNumber, formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { AdminPageSection } from "../AdminPageSection";

export function OverviewKpiSection() {
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
    <AdminPageSection title={t("admin.kpiOverview")}>
      {isLoading ? (
        <PageDataLoading minHeight="min-h-[120px]" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <AdminStatCard
            title={t("admin.activeRestaurants")}
            icon={UtensilsCrossed}
            value={formatAdminKpiNumber(kpis.activeRestaurants)}
            hint={t("admin.nav.statOperational")}
          />
          <AdminStatCard
            title={t("admin.activeSubscriptions")}
            icon={Users}
            value={formatAdminKpiNumber(kpis.activeSubscriptions)}
            hint={t("admin.nav.statCanonical")}
          />
          <AdminStatCard
            title={t("admin.expiringSoon")}
            icon={Clock}
            value={formatAdminKpiNumber(kpis.expiringSoon)}
          />
          <AdminStatCard
            title={t("admin.estimatedMrr")}
            icon={DollarSign}
            value={formatAdminRevenueUSD(kpis.estimatedMrr, locale)}
            hint={t("admin.estimatedMrrHint")}
            valueDir="ltr"
          />
          <AdminStatCard
            title={t("admin.totalUsers")}
            icon={Users}
            value={formatAdminKpiNumber(kpis.totalUsers)}
          />
        </div>
      )}
    </AdminPageSection>
  );
}
