import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, TrendingUp, Users, DollarSign, RotateCcw, Download, ArrowRight, Store,
  UtensilsCrossed, LayoutGrid, Tag, FolderOpen
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { toast } from "sonner";
import { useLocation } from "wouter";

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
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [months] = useState(12);

  // Check if user is admin
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen cinematic-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            <Store className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("admin.accessDenied")}</h2>
            <p className="text-muted-foreground mb-6">{t("admin.adminOnly")}</p>
            <Button onClick={() => setLocation("/")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full">
              {t("common.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stats, isLoading: statsLoading } = trpc.admin.getStatistics.useQuery();
  const { data: revenueData, isLoading: revenueLoading } = trpc.admin.getRevenueByMonth.useQuery();
  const { data: subscriptionDetails, isLoading: detailsLoading } = trpc.admin.getSubscriptionDetails.useQuery();
  const { data: extendedStats, isLoading: extendedLoading } = trpc.admin.getExtendedStats.useQuery();

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
      new Date(sub.currentPeriodStart).toLocaleDateString(),
      new Date(sub.currentPeriodEnd).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `subscriptions-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success(t("common.exported") || "Exported successfully");
  };

  const COLORS = ["#00d4ff", "#ff8c42", "#4ade80", "#f87171", "#a78bfa"];

  if (statsLoading || revenueLoading || detailsLoading || extendedLoading) {
    return (
      <div className="min-h-screen cinematic-bg flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen cinematic-bg">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/admin")} className="flex items-center gap-2 hover:opacity-80 transition">
              <ArrowRight className={`w-5 h-5 text-primary ${language === "en" ? "rotate-180" : ""}`} />
              <span className="font-bold text-foreground">{t("admin.statistics") || "Statistics"}</span>
            </button>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 ml-2" />
            {t("common.export") || "Export CSV"}
          </Button>
        </div>
      </nav>

      <main className="container py-6 space-y-6">
        {/* Platform Overview Cards */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">{t("admin.platformOverview") || "Platform Overview"}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalRestaurants") || "Total Restaurants"}</CardTitle>
                <UtensilsCrossed className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalRestaurants || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalUsers") || "Total Users"}</CardTitle>
                <Users className="w-4 h-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalMenuItems") || "Total Menu Items"}</CardTitle>
                <LayoutGrid className="w-4 h-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalMenuItems || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("admin.totalCategories") || "Total Categories"}</CardTitle>
                <FolderOpen className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{extendedStats?.totalCategories || 0}</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
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

        {/* Subscription KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
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

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalRevenue") || "Total Revenue"}</CardTitle>
              <DollarSign className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.monthlyRecurring") || "Monthly Recurring"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
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

          <Card className="bg-card border-border">
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

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="bg-card border-border">
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
                  <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={{ fill: "#00d4ff" }} name={t("admin.totalRevenue") || "Revenue"} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User & Restaurant Growth Chart */}
          <Card className="bg-card border-border">
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

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subscriptions by Plan */}
          <Card className="bg-card border-border">
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

          {/* Subscription Status Breakdown */}
          <Card className="bg-card border-border">
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

        {/* Subscriptions Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>{t("admin.subscriptionDetails") || "Subscription Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/30">
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
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
