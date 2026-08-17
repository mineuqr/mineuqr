import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageDataLoading } from "@/components/AuthGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SemanticKpiCard, SEMANTIC_KPI_GRID } from "@/design-system/semantic-card";
import {
  SemanticTableScroll,
  SemanticTableRoot,
  SemanticTableHeader,
  SemanticTableBody,
  SemanticTableRow,
  SemanticTableHead,
  SemanticTableCell,
} from "@/design-system/semantic-table";
import {
  SemanticBadge,
  mapCommercialStatusToBadgeTone,
} from "@/design-system/semantic-badge";
import {
  TrendingUp, Users, DollarSign, RotateCcw,
  UtensilsCrossed, LayoutGrid, Tag, FolderOpen
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { formatRiyadhDate } from "@/lib/datetime";
import { CommercialExportButtons } from "@/components/admin/commercial/CommercialExportButtons";
import { formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";
import { ownerPlanLabel, ownerSubscriptionStatus } from "@/lib/admin/ownerCommercialDisplay";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { adminDash, adminSemantic } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

type StatisticsPanelProps = {
  showExport?: boolean;
};

export function StatisticsPanel({ showExport = true }: StatisticsPanelProps) {
  const { t, language } = useLanguage();
  const gate = useAuthGate();
  const adminEnabled = adminQueriesEnabled(
    gate.authPending,
    gate.isAuthenticated,
    gate.user?.role === "admin"
  );

  const { data: analytics, isLoading } = trpc.admin.getCommercialAnalytics.useQuery(
    undefined,
    { enabled: adminEnabled }
  );

  const overviewRows = useMemo(() => analytics?.subscribers ?? [], [analytics]);

  const planChartData = useMemo(
    () =>
      (analytics?.commercial.planDistribution.entries ?? []).map((entry) => ({
        planName: entry.planCode,
        count: entry.ownerCount,
      })),
    [analytics]
  );

  const userGrowthData = useMemo(() => {
    const growth = analytics?.extensions.userGrowth;
    return growth?.available ? growth.series : [];
  }, [analytics]);

  const COLORS = ["#22d3ee", "#fb923c", "#4ade80", "#f87171", "#94a3b8"];

  if (isLoading) {
    return <PageDataLoading minHeight="min-h-[320px]" />;
  }

  const executive = analytics?.commercial.executive;
  const health = analytics?.commercial.subscriptionHealth;
  const platform = analytics?.platform;
  const mrr = executive?.mrr ?? 0;
  const arr = executive?.arr ?? 0;

  return (
    <div className={adminDash.consoleSections}>
      {showExport ? (
        <div className="flex justify-end">
          <CommercialExportButtons
            locale={language === "ar" ? "ar" : "en"}
            disabled={isLoading}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className={adminDash.sectionTitleCompact}>
          {t("admin.platformOverview") || "Platform Overview"}
        </h2>
        <div className={SEMANTIC_KPI_GRID.dense}>
          <SemanticKpiCard
            label={t("admin.totalRestaurants") || "Total Restaurants"}
            value={platform?.totalRestaurants ?? 0}
            icon={UtensilsCrossed}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.totalUsers") || "Total Users"}
            value={platform?.totalUsers ?? executive?.totalUsers ?? 0}
            icon={Users}
            tone="info"
            domain="information"
          />
          <SemanticKpiCard
            label={t("admin.totalMenuItems") || "Total Menu Items"}
            value={platform?.totalMenuItems ?? 0}
            icon={LayoutGrid}
            tone="info"
            domain="orders"
          />
          <SemanticKpiCard
            label={t("admin.totalCategories") || "Total Categories"}
            value={platform?.totalCategories ?? 0}
            icon={FolderOpen}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.totalOffers") || "Total Offers"}
            value={platform?.totalOffers ?? 0}
            icon={Tag}
            tone="info"
            domain="growth"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className={adminDash.sectionTitleCompact}>
          {t("admin.totalSubscribers") || "Subscriptions"}
        </h2>
        <div className={SEMANTIC_KPI_GRID.quad}>
          <SemanticKpiCard
            label={t("admin.totalSubscribers") || "Entitled Owners"}
            value={executive?.commercialSubscribers ?? 0}
            icon={Users}
            tone="info"
            domain="growth"
            hint={`${executive?.activeSubscriptions ?? 0} ${t("admin.active") || "Active"}`}
          />
          <SemanticKpiCard
            label={t("admin.estimatedMrr") || "Estimated MRR (USD)"}
            value={formatAdminRevenueUSD(mrr, language === "ar" ? "ar" : "en")}
            icon={DollarSign}
            tone="success"
            domain="growth"
            valueVariant="revenue"
            valueDir="ltr"
            hint={t("admin.estimatedMrrHint") || "Canonical owner-based MRR"}
          />
          <SemanticKpiCard
            label="ARR (USD)"
            value={formatAdminRevenueUSD(arr, language === "ar" ? "ar" : "en")}
            icon={TrendingUp}
            tone="success"
            domain="revenue"
            valueVariant="revenue"
            valueDir="ltr"
            hint="MRR × 12"
          />
          <SemanticKpiCard
            label={t("admin.renewalRate") || "Renewal Rate"}
            value="—"
            icon={RotateCcw}
            tone="neutral"
            domain="information"
            hint={
              language === "ar"
                ? "غير متوفر — لا مقياس تجاري معتمد"
                : "Unavailable — no canonical renewal metric"
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className={adminDash.card}>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.revenueByMonth") || "Revenue by Month"}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {language === "ar"
                ? "غير متوفر — لا اتجاه إيرادات معتمد"
                : "Unavailable — no canonical revenue trend"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              {language === "ar"
                ? "يتطلب مقياس اتجاه إيرادات معتمدًا"
                : "Requires a certified revenue trend metric"}
            </div>
          </CardContent>
        </Card>

        <Card className={adminDash.card}>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.userGrowth") || "User & Restaurant Growth"}</CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px" }} />
                  <Legend />
                  <Area type="monotone" dataKey="users" stroke="#4ade80" fill="#4ade8030" strokeWidth={2} name={t("admin.newUsers") || "New Users"} />
                  <Area type="monotone" dataKey="restaurants" stroke="#ff8c42" fill="#ff8c4230" strokeWidth={2} name={t("admin.newRestaurants") || "New Restaurants"} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                {t("common.noData") || "No data available"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className={adminDash.card}>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.subscriptionsByPlan") || "Owners by Plan"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planChartData}
                  dataKey="count"
                  nameKey="planName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {planChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={adminDash.card}>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.subscriptionStatus") || "Subscription Status"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className={cn("rounded-lg p-4 text-center", adminSemantic.cardAccentActive)}>
                <div className={cn("text-2xl font-bold", adminSemantic.iconActive)}>{health?.active ?? 0}</div>
                <div className="mt-1 text-sm text-slate-400">{t("admin.active") || "Active"}</div>
              </div>
              <div className={cn("rounded-lg p-4 text-center", adminSemantic.cardAccentTrial)}>
                <div className={cn("text-2xl font-bold", adminSemantic.iconTrial)}>{health?.trial ?? 0}</div>
                <div className="mt-1 text-sm text-slate-400">{t("admin.trial") || "Trial"}</div>
              </div>
              <div className={cn("rounded-lg p-4 text-center", adminSemantic.cardAccentDanger)}>
                <div className={cn("text-2xl font-bold", adminSemantic.iconDanger)}>{health?.expired ?? 0}</div>
                <div className="mt-1 text-sm text-slate-400">{t("admin.expired") || "Expired"}</div>
              </div>
              <div className={cn("rounded-lg p-4 text-center", adminSemantic.cardAccentWarning)}>
                <div className={cn("text-2xl font-bold", adminSemantic.iconWarning)}>{health?.canceled ?? 0}</div>
                <div className="mt-1 text-sm text-slate-400">{t("admin.canceled") || "Canceled"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={adminDash.card}>
        <CardHeader className="border-b border-cyan-500/20 pb-4">
          <CardTitle className="text-base font-semibold">
            {t("admin.subscriptionDetails") || "Subscription Overview"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {language === "ar" ? "صف واحد لكل مالك" : "One row per owner"}
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <SemanticTableScroll className="rounded-lg border-border/40">
            <SemanticTableRoot density="comfortable">
              <SemanticTableHeader density="comfortable" className="bg-muted/20">
                <SemanticTableRow density="comfortable">
                  <SemanticTableHead density="comfortable">{t("admin.owner") || "Owner"}</SemanticTableHead>
                  <SemanticTableHead density="comfortable">{t("admin.plan") || "Plan"}</SemanticTableHead>
                  <SemanticTableHead density="comfortable">{t("admin.status") || "Status"}</SemanticTableHead>
                  <SemanticTableHead density="comfortable">{t("admin.endDate") || "End Date"}</SemanticTableHead>
                </SemanticTableRow>
              </SemanticTableHeader>
              <SemanticTableBody>
                {overviewRows.length === 0 && (
                  <SemanticTableRow density="comfortable">
                    <SemanticTableCell
                      density="comfortable"
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {t("common.noData") || "No data available"}
                    </SemanticTableCell>
                  </SemanticTableRow>
                )}
                {overviewRows.map((entry) => (
                  <SemanticTableRow
                    key={entry.owner.id}
                    density="comfortable"
                    className="hover:bg-slate-800/30"
                  >
                    <SemanticTableCell density="comfortable">
                      <div className="font-medium">{entry.owner.name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{entry.owner.email ?? "-"}</div>
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable">{ownerPlanLabel(entry.commercial)}</SemanticTableCell>
                    <SemanticTableCell density="comfortable">
                      <SemanticBadge
                        tone={mapCommercialStatusToBadgeTone(
                          entry.commercial.subscriptionStatus ?? "inactive"
                        )}
                      >
                        {ownerSubscriptionStatus(entry.commercial)}
                      </SemanticBadge>
                    </SemanticTableCell>
                    <SemanticTableCell density="comfortable" className="text-xs">
                      {entry.commercial.currentPeriodEnd
                        ? formatRiyadhDate(entry.commercial.currentPeriodEnd, "ar-SA")
                        : "-"}
                    </SemanticTableCell>
                  </SemanticTableRow>
                ))}
              </SemanticTableBody>
            </SemanticTableRoot>
          </SemanticTableScroll>
        </CardContent>
      </Card>
    </div>
  );
}
