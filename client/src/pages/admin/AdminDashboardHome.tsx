import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  Clock,
  DollarSign,
  Store,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending, PageDataLoading } from "@/components/AuthGate";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { AdminStatCard } from "@/components/admin/layout/AdminStatCard";
import { CommercialStatusBadge } from "@/components/admin/commercial";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { mapDashboardSummaryToKPIs } from "@/lib/admin/dashboardSummaryKpis";
import { formatAdminKpiNumber, formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";
import {
  ADMIN_NAV_ITEMS,
  resolveAdminPageShell,
} from "@/lib/admin/routes/adminRouteRegistry";
import { operationsTabHref } from "@/pages/admin/operations/operationsTab";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

type NavShortcutCardItem = Pick<
  (typeof ADMIN_NAV_ITEMS)[number],
  "path" | "labelKey" | "descriptionKey" | "icon"
>;

function NavShortcutCard({ item }: { item: NavShortcutCardItem }) {
  const { t, language } = useLanguage();
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      className={cn(
        adminDash.card,
        "flex items-center gap-3 p-4 transition hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{t(item.labelKey)}</div>
        {item.descriptionKey ? (
          <div className="truncate text-xs text-muted-foreground">
            {t(item.descriptionKey)}
          </div>
        ) : null}
      </div>
      <ArrowRight
        className={cn("h-4 w-4 shrink-0 text-muted-foreground", language === "en" && "rotate-180")}
      />
    </Link>
  );
}

export default function AdminDashboardHome() {
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

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const kpis = mapDashboardSummaryToKPIs(summary);
  const shortcutItems = ADMIN_NAV_ITEMS.filter((item) => item.id !== "overview");
  const shell = resolveAdminPageShell("overview", t);

  return (
    <AdminOperationsShell
      title={shell.title}
      subtitle={shell.subtitle}
      breadcrumbs={shell.breadcrumbs}
      statusIndicator={
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t("admin.nav.canonicalHint")}</span>
          <CommercialStatusBadge status="active" label={t("subscription.status.active")} />
          <CommercialStatusBadge status="trial" label={t("subscription.status.trial")} />
          <CommercialStatusBadge status="grace" label={t("admin.nav.statusGrace")} />
        </div>
      }
    >
      <section className="space-y-3">
        <h2 className={adminDash.sectionTitle}>{t("admin.nav.welcome")}</h2>
        <p className={adminDash.sectionSub}>{t("admin.nav.welcomeBody")}</p>
      </section>

      <section className="space-y-4">
        <h2 className={adminDash.sectionTitle}>{t("admin.kpiOverview")}</h2>
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
      </section>

      <section className="space-y-4">
        <h2 className={adminDash.sectionTitle}>{t("admin.nav.shortcuts")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NavShortcutCard
            item={{
              path: "/admin/analytics",
              labelKey: "admin.nav.analytics",
              descriptionKey: "admin.nav.analyticsDesc",
              icon: BarChart3,
            }}
          />
          <NavShortcutCard
            item={{
              path: operationsTabHref("accounts"),
              labelKey: "admin.nav.operations",
              descriptionKey: "admin.nav.operationsDesc",
              icon: Store,
            }}
          />
          <NavShortcutCard
            item={{
              path: "/admin/commercial",
              labelKey: "admin.nav.commercial",
              descriptionKey: "admin.nav.commercialDesc",
              icon: TrendingUp,
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={adminDash.sectionTitle}>{t("admin.nav.allSections")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcutItems.map((item) => (
            <NavShortcutCard key={item.id} item={item} />
          ))}
        </div>
      </section>

    </AdminOperationsShell>
  );
}
