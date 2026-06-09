import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageDataLoading } from "@/components/AuthGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const statDash = {
  card: "rounded-xl border border-border/50 bg-card/40 shadow-sm backdrop-blur-sm",
  sectionTitle: "text-sm font-semibold text-foreground",
  sectionSub: "mt-1 text-xs text-muted-foreground",
  kpiCard: "rounded-xl border border-border/50 bg-card/40 shadow-sm",
};

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

  const COLORS = ["#00d4ff", "#ff8c42", "#4ade80", "#f87171", "#a78bfa"];

  if (isLoading) {
    return <PageDataLoading minHeight="min-h-[320px]" />;
  }

  const executive = analytics?.commercial.executive;
  const health = analytics?.commercial.subscriptionHealth;
  const platform = analytics?.platform;
  const mrr = executive?.mrr ?? 0;
  const arr = executive?.arr ?? 0;

  return (
    <div className="space-y-8">
      {showExport ? (
        <div className="flex justify-end">
          <CommercialExportButtons
            locale={language === "ar" ? "ar" : "en"}
            disabled={isLoading}
          />
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <h2 className={statDash.sectionTitle}>{t("admin.platformOverview") || "Platform Overview"}</h2>
          <p className={statDash.sectionSub}>
            {language === "ar" ? "مؤشرات النمو على مستوى المنصة" : "High-level platform growth metrics"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalRestaurants") || "Total Restaurants"}</CardTitle>
              <UtensilsCrossed className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platform?.totalRestaurants ?? 0}</div>
            </CardContent>
          </Card>
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalUsers") || "Total Users"}</CardTitle>
              <Users className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platform?.totalUsers ?? executive?.totalUsers ?? 0}</div>
            </CardContent>
          </Card>
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalMenuItems") || "Total Menu Items"}</CardTitle>
              <LayoutGrid className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platform?.totalMenuItems ?? 0}</div>
            </CardContent>
          </Card>
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalCategories") || "Total Categories"}</CardTitle>
              <FolderOpen className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platform?.totalCategories ?? 0}</div>
            </CardContent>
          </Card>
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalOffers") || "Total Offers"}</CardTitle>
              <Tag className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platform?.totalOffers ?? 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className={statDash.sectionTitle}>{t("admin.totalSubscribers") || "Subscriptions"}</h2>
          <p className={statDash.sectionSub}>
            {language === "ar" ? "أداء الاشتراكات والإيرادات (حسب المالك)" : "Owner-based subscription performance"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalSubscribers") || "Entitled Owners"}</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{executive?.commercialSubscribers ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {executive?.activeSubscriptions ?? 0} {t("admin.active") || "Active"}
              </p>
            </CardContent>
          </Card>
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.estimatedMrr") || "Estimated MRR (USD)"}</CardTitle>
              <DollarSign className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" dir="ltr">
                {formatAdminRevenueUSD(mrr, language === "ar" ? "ar" : "en")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.estimatedMrrHint") || "Canonical owner-based MRR"}
              </p>
            </CardContent>
          </Card>
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ARR (USD)</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" dir="ltr">
                {formatAdminRevenueUSD(arr, language === "ar" ? "ar" : "en")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">MRR × 12</p>
            </CardContent>
          </Card>
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.renewalRate") || "Renewal Rate"}</CardTitle>
              <RotateCcw className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "ar"
                  ? "غير متوفر — لا مقياس تجاري معتمد"
                  : "Unavailable — no canonical renewal metric"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className={statDash.card}>
          <CardHeader>
            <CardTitle>{t("admin.revenueByMonth") || "Revenue by Month"}</CardTitle>
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

        <Card className={statDash.card}>
          <CardHeader>
            <CardTitle>{t("admin.userGrowth") || "User & Restaurant Growth"}</CardTitle>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className={statDash.card}>
          <CardHeader>
            <CardTitle>{t("admin.subscriptionsByPlan") || "Owners by Plan"}</CardTitle>
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

        <Card className={statDash.card}>
          <CardHeader>
            <CardTitle>{t("admin.subscriptionStatus") || "Subscription Status"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-2xl font-bold text-primary">{health?.active ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("admin.active") || "Active"}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10">
                <div className="text-2xl font-bold text-blue-500">{health?.trial ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("admin.trial") || "Trial"}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                <div className="text-2xl font-bold text-yellow-500">{health?.expired ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("admin.expired") || "Expired"}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <div className="text-2xl font-bold text-red-500">{health?.canceled ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{t("admin.canceled") || "Canceled"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={statDash.card}>
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-semibold">
            {t("admin.subscriptionDetails") || "Subscription Overview"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {language === "ar" ? "صف واحد لكل مالك" : "One row per owner"}
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-sm">
              <thead className="border-b border-border/40 bg-muted/20">
                <tr>
                  <th className="text-start py-2 px-2 font-semibold">{t("admin.owner") || "Owner"}</th>
                  <th className="text-start py-2 px-2 font-semibold">{t("admin.plan") || "Plan"}</th>
                  <th className="text-start py-2 px-2 font-semibold">{t("admin.status") || "Status"}</th>
                  <th className="text-start py-2 px-2 font-semibold">{t("admin.endDate") || "End Date"}</th>
                </tr>
              </thead>
              <tbody>
                {overviewRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      {t("common.noData") || "No data available"}
                    </td>
                  </tr>
                )}
                {overviewRows.map((entry) => (
                  <tr key={entry.owner.id} className="border-b border-border/20 hover:bg-primary/5">
                    <td className="py-2 px-2">
                      <div className="font-medium">{entry.owner.name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{entry.owner.email ?? "-"}</div>
                    </td>
                    <td className="py-2 px-2">{ownerPlanLabel(entry.commercial)}</td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          entry.commercial.subscriptionStatus === "active"
                            ? "default"
                            : entry.commercial.subscriptionStatus === "trial"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {ownerSubscriptionStatus(entry.commercial)}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {entry.commercial.currentPeriodEnd
                        ? formatRiyadhDate(entry.commercial.currentPeriodEnd, "ar-SA")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
