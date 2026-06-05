import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending, PageDataLoading } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Users, DollarSign, RotateCcw, Download, ArrowRight,
  UtensilsCrossed, LayoutGrid, Tag, FolderOpen
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { formatRiyadhDate, todayYmd } from "@/lib/datetime";
import { formatAdminRevenueUSD } from "@/lib/admin/formatAdminCurrency";

const statDash = {
  shell: "min-h-screen bg-background",
  shellGlow:
    "pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.65_0.18_195/12%),transparent)]",
  main: "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
  card: "rounded-xl border border-border/50 bg-card/40 shadow-sm backdrop-blur-sm",
  pageTitle: "text-2xl font-semibold tracking-tight text-foreground sm:text-3xl",
  sectionTitle: "text-sm font-semibold text-foreground",
  sectionSub: "mt-1 text-xs text-muted-foreground",
  kpiCard: "rounded-xl border border-border/50 bg-card/40 shadow-sm",
};

interface SubDetail {
  id: number;
  restaurantName: string;
  ownerEmail: string;
  planName: string;
  billingCycle: string;
  status: string;
  monthlyPrice: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

interface PlanCount {
  planName: string;
  count: number;
}

export default function Statistics() {
  const { t, language } = useLanguage();
  const gate = useAuthGate();
  const { user, isAuthenticated, authPending } = gate;
  const [, setLocation] = useLocation();
  const [months] = useState(12);
  const adminEnabled = adminQueriesEnabled(
    authPending,
    isAuthenticated,
    user?.role === "admin"
  );
  const { data: stats, isLoading: statsLoading } = trpc.admin.getStatistics.useQuery(
    undefined,
    { enabled: adminEnabled }
  );
  const { data: revenueData, isLoading: revenueLoading } = trpc.admin.getRevenueByMonth.useQuery(
    undefined,
    { enabled: adminEnabled }
  );
  const { data: subscriptionDetails, isLoading: detailsLoading } =
    trpc.admin.getSubscriptionDetails.useQuery(undefined, { enabled: adminEnabled });
  const { data: extendedStats, isLoading: extendedLoading } = trpc.admin.getExtendedStats.useQuery(
    undefined,
    { enabled: adminEnabled }
  );

  if (gate.isPending) {
    return (
      <div className={cn(statDash.shell, "flex items-center justify-center p-4")}>
        <div className={statDash.shellGlow} aria-hidden />
        <AuthGatePending minHeight="min-h-0" />
      </div>
    );
  }

  if (gate.showAdminDenied) {
    return (
      <div className={statDash.shell}>
        <div className={statDash.shellGlow} aria-hidden />
        <AdminAccessDenied shellClassName="min-h-screen flex items-center justify-center p-4" />
      </div>
    );
  }

  const exportToCSV = () => {
    if (!subscriptionDetails) return;

    const headers = [
      "Restaurant Name",
      "Owner Email",
      "Plan Name",
      "Billing Cycle",
      "Status",
      "Monthly Price",
      "Current Period Start",
      "Current Period End",
    ];

    const rows = (subscriptionDetails as SubDetail[]).map((sub: SubDetail) => [
      sub.restaurantName,
      sub.ownerEmail,
      sub.planName,
      sub.billingCycle,
      sub.status,
      sub.monthlyPrice.toFixed(2),
      formatRiyadhDate(sub.currentPeriodStart, "en-US"),
      formatRiyadhDate(sub.currentPeriodEnd, "en-US"),
    ]);

    const csv = [headers, ...rows].map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `subscriptions-${todayYmd()}.csv`;
    link.click();
    toast.success(t("common.exported") || "Exported successfully");
  };

  const COLORS = ["#00d4ff", "#ff8c42", "#4ade80", "#f87171", "#a78bfa"];

  if (statsLoading || revenueLoading || detailsLoading || extendedLoading) {
    return (
      <div className={statDash.shell}>
        <div className={statDash.shellGlow} aria-hidden />
        <PageDataLoading minHeight="min-h-screen" />
      </div>
    );
  }

  return (
    <div className={statDash.shell}>
      <div className={statDash.shellGlow} aria-hidden />
      <div className={cn(statDash.main, "space-y-8")}>
        <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocation("/admin")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
            >
              <ArrowRight className={cn("h-4 w-4", language === "en" ? "rotate-180" : "")} />
            </button>
            <div>
              <h1 className={statDash.pageTitle}>{t("admin.statistics") || "Statistics"}</h1>
              <p className={statDash.sectionSub}>
                {language === "ar" ? "تحليلات المنصة والاشتراكات" : "Platform and subscription analytics"}
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="shrink-0 shadow-sm">
            <Download className="h-4 w-4" />
            {t("common.export") || "Export CSV"}
          </Button>
        </div>

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
                <div className="text-2xl font-bold">{extendedStats?.totalRestaurants || 0}</div>
              </CardContent>
            </Card>

            <Card className={statDash.kpiCard}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalUsers") || "Total Users"}</CardTitle>
                <Users className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className={statDash.kpiCard}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalMenuItems") || "Total Menu Items"}</CardTitle>
                <LayoutGrid className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalMenuItems || 0}</div>
              </CardContent>
            </Card>

            <Card className={statDash.kpiCard}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalCategories") || "Total Categories"}</CardTitle>
                <FolderOpen className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalCategories || 0}</div>
              </CardContent>
            </Card>

            <Card className={statDash.kpiCard}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalOffers") || "Total Offers"}</CardTitle>
                <Tag className="w-4 h-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalOffers || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className={statDash.sectionTitle}>{t("admin.totalSubscribers") || "Subscriptions"}</h2>
            <p className={statDash.sectionSub}>
              {language === "ar" ? "أداء الاشتراكات والإيرادات" : "Subscription performance and revenue"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalSubscribers") || "Total Subscribers"}</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSubscribers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.activeSubscribers || 0} {t("admin.active") || "Active"}
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
                {formatAdminRevenueUSD(stats?.totalRevenue ?? 0, language === "ar" ? "ar" : "en")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.estimatedMrrHint") || "Estimated from active paid subscriptions (USD)"}
              </p>
            </CardContent>
          </Card>

          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.renewalRate") || "Renewal Rate"}</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.renewalRate?.toFixed(1) || "0"}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.activeAndTrial") || "Active & Trial"}
              </p>
            </CardContent>
          </Card>

          <Card className={statDash.kpiCard}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.churnRate") || "Churn Rate"}</CardTitle>
              <RotateCcw className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.churnRate?.toFixed(1) || "0"}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.canceledAndExpired") || "Canceled & Expired"}
              </p>
            </CardContent>
          </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card className={statDash.card}>
            <CardHeader>
              <CardTitle>{t("admin.revenueByMonth") || "Revenue by Month"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={{ fill: "#00d4ff" }} name={t("admin.estimatedMrr") || "Estimated MRR (USD)"} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className={statDash.card}>
            <CardHeader>
              <CardTitle>{t("admin.userGrowth") || "User & Restaurant Growth"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={extendedStats?.userGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px" }} />
                  <Legend />
                  <Area type="monotone" dataKey="users" stroke="#4ade80" fill="#4ade8030" strokeWidth={2} name={t("admin.newUsers") || "New Users"} />
                  <Area type="monotone" dataKey="restaurants" stroke="#ff8c42" fill="#ff8c4230" strokeWidth={2} name={t("admin.newRestaurants") || "New Restaurants"} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card className={statDash.card}>
            <CardHeader>
              <CardTitle>{t("admin.subscriptionsByPlan") || "Subscriptions by Plan"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.subscriptionsByPlan || []}
                    dataKey="count"
                    nameKey="planName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {(stats?.subscriptionsByPlan as PlanCount[] | undefined)?.map((_entry: PlanCount, index: number) => (
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
                  <div className="text-2xl font-bold text-primary">{stats?.activeSubscribers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t("admin.active") || "Active"}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/10">
                  <div className="text-2xl font-bold text-blue-500">{stats?.trialSubscribers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t("admin.trial") || "Trial"}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                  <div className="text-2xl font-bold text-yellow-500">{stats?.expiredSubscribers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t("admin.expired") || "Expired"}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10">
                  <div className="text-2xl font-bold text-red-500">{stats?.canceledSubscribers || 0}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t("admin.canceled") || "Canceled"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={statDash.card}>
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-semibold">
              {t("admin.subscriptionDetails") || "Subscription Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-sm">
                <thead className="border-b border-border/40 bg-muted/20">
                  <tr>
                    <th className="text-start py-2 px-2 font-semibold">{t("admin.restaurant") || "Restaurant"}</th>
                    <th className="text-start py-2 px-2 font-semibold">{t("admin.owner") || "Owner"}</th>
                    <th className="text-start py-2 px-2 font-semibold">{t("admin.plan") || "Plan"}</th>
                    <th className="text-start py-2 px-2 font-semibold">{t("admin.status") || "Status"}</th>
                    <th className="text-start py-2 px-2 font-semibold">{t("admin.endDate") || "End Date"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(subscriptionDetails as SubDetail[] | undefined)?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        {t("common.noData") || "No data available"}
                      </td>
                    </tr>
                  )}
                  {(subscriptionDetails as SubDetail[] | undefined)?.map((sub: SubDetail) => (
                    <tr key={sub.id} className="border-b border-border/20 hover:bg-primary/5">
                      <td className="py-2 px-2">{sub.restaurantName}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{sub.ownerEmail}</td>
                      <td className="py-2 px-2">{sub.planName}</td>
                      <td className="py-2 px-2">
                        <Badge
                          variant={
                            sub.status === "active"
                              ? "default"
                              : sub.status === "trial"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {formatRiyadhDate(sub.currentPeriodEnd, "ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
