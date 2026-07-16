import { useAuth } from "@/_core/hooks/useAuth";
import { CommercialUpgradeBanner } from "@/components/commercial";
import { SettlementOverviewSection } from "@/components/dashboard/SettlementOverviewSection";
import { SettlementTrendsSection } from "@/components/dashboard/SettlementTrendsSection";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { RestaurantKpiCard } from "@/components/dashboard/RestaurantKpiCard";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadSalesReportXlsx } from "@/lib/excel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingOrderSalesQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useCommercialFeatureVisibility } from "@/hooks/useCommercialFeatureVisibility";
import {
  Calendar,
  ClipboardList,
  DollarSign,
  Eye,
  LayoutGrid,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * REPORTING-DASHBOARD-ADOPTION-1 — Reports & Statistics presentation.
 * All KPIs / charts / Excel rows come from reporting.* DTOs.
 */
export function ReportsTab({
  restaurantId,
  restaurantName,
  currencySymbol,
  currencyCode,
  t,
  language,
  statsAriaLabel,
}: {
  restaurantId: number;
  restaurantName?: string;
  currencySymbol?: string;
  currencyCode?: string;
  t: (key: string) => string;
  language: string;
  statsAriaLabel: string;
}) {
  const sym = currencySymbol || "ر.س";
  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getUTCFullYear());
  const [reportMonth, setReportMonth] = useState(now.getUTCMonth() + 1);

  const monthNames =
    language === "ar"
      ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
      : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const { isAuthenticated, authPending } = useAuth();
  const { entitlements, showReportsUpgrade, showExcelUpgrade } =
    useCommercialFeatureVisibility();
  const uiLang = language === "ar" ? "ar" : "en";
  const enabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);

  useDevQueryRuntimeLog("reporting.getCatalogStatsSummary", {
    enabled,
    authPending,
    isAuthenticated,
  });
  useDevQueryRuntimeLog("reporting.getOrderSalesSummary", {
    enabled,
    authPending,
    isAuthenticated,
    pollMs: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("reporting.getOrderSalesRollup", {
    enabled,
    authPending,
    isAuthenticated,
  });

  const { data: catalog } = trpc.reporting.getCatalogStatsSummary.useQuery(
    { restaurantId },
    { enabled }
  );

  const {
    data: orderSales,
    error: orderSalesError,
  } = trpc.reporting.getOrderSalesSummary.useQuery(
    { restaurantId },
    reportingOrderSalesQueryOptions(enabled)
  );

  const { data: monthlyRollup } = trpc.reporting.getOrderSalesRollup.useQuery(
    {
      restaurantId,
      granularity: "day",
      year: reportYear,
      month: reportMonth,
    },
    { enabled }
  );

  const { data: yearlyRollup } = trpc.reporting.getOrderSalesRollup.useQuery(
    {
      restaurantId,
      granularity: "month",
      year: reportYear,
    },
    { enabled }
  );

  const ordersBlocked = isEmailNotVerifiedError(orderSalesError);

  const monthlyReport = useMemo(
    () =>
      (monthlyRollup?.periods ?? []).map((p) => ({
        day: Number(p.periodKey.slice(-2)),
        count: p.orderCount,
        totalSales: Number.parseFloat(p.orderSales) || 0,
      })),
    [monthlyRollup]
  );

  const yearlySummary = useMemo(
    () =>
      (yearlyRollup?.periods ?? []).map((p) => ({
        month: Number(p.periodKey.slice(5, 7)),
        count: p.orderCount,
        totalSales: Number.parseFloat(p.orderSales) || 0,
      })),
    [yearlyRollup]
  );

  const exportMonthlyExcel = () => {
    const isAr = language === "ar";
    void downloadSalesReportXlsx({
      language: isAr ? "ar" : "en",
      filename: `monthly-report-${reportYear}-${reportMonth}`,
      sheetName: isAr ? "تقرير شهري" : "Monthly Report",
      reportTitle: isAr ? "تقرير شهري" : "Monthly Report",
      reportSubtitle: `${monthNames[reportMonth - 1]} ${reportYear}`,
      columnHeaders: isAr
        ? ["اليوم", "عدد الطلبات", "مبيعات الطلبات"]
        : ["Day", "Orders", "Order Sales"],
      rows: monthlyReport.map((row) => ({
        label: isAr ? `يوم ${row.day}` : `Day ${row.day}`,
        orderCount: row.count,
        totalSales: row.totalSales,
      })),
      currencySymbol: sym,
      currencyCode,
      totalsLabel: isAr ? "الإجمالي" : "Total",
      restaurantName,
    });
  };

  const exportYearlyExcel = () => {
    const isAr = language === "ar";
    void downloadSalesReportXlsx({
      language: isAr ? "ar" : "en",
      filename: `yearly-summary-${reportYear}`,
      sheetName: isAr ? "ملخص سنوي" : "Yearly Summary",
      reportTitle: isAr ? "ملخص سنوي" : "Yearly Summary",
      reportSubtitle: isAr ? `السنة ${reportYear}` : `Year ${reportYear}`,
      columnHeaders: isAr
        ? ["الشهر", "عدد الطلبات", "مبيعات الطلبات"]
        : ["Month", "Orders", "Order Sales"],
      rows: yearlySummary.map((row) => ({
        label: monthNames[(row.month || 1) - 1],
        orderCount: row.count,
        totalSales: row.totalSales,
      })),
      currencySymbol: sym,
      currencyCode,
      totalsLabel: isAr ? "الإجمالي" : "Total",
      restaurantName,
    });
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {language === "ar" ? "التقارير والإحصائيات" : "Reports & Statistics"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          {language === "ar" ? "تحليلات المبيعات والطلبات" : "Sales and order analytics"}
        </p>
      </div>

      <RestaurantDashSection
        title={language === "ar" ? "نظرة عامة" : "Overview"}
        description={
          language === "ar"
            ? "مؤشرات الأداء الرئيسية لمطعمك"
            : "Key performance metrics for your restaurant"
        }
        ariaLabel={statsAriaLabel}
      >
        <div className={restaurantDash.kpiGridWide}>
          <RestaurantKpiCard
            label={t("dashboard.category")}
            value={catalog?.categoryCount ?? 0}
            icon={LayoutGrid}
            tone="primary"
          />
          <RestaurantKpiCard
            label={t("dashboard.item")}
            value={catalog?.itemCount ?? 0}
            icon={UtensilsCrossed}
            tone="accent"
          />
          <RestaurantKpiCard
            label={t("dashboard.visit")}
            value={catalog?.menuVisits ?? 0}
            icon={Eye}
            tone="warning"
          />
        </div>
      </RestaurantDashSection>

      {showReportsUpgrade && (
        <CommercialUpgradeBanner
          entitlements={entitlements}
          featureKey="reports"
          language={uiLang}
          className="border-yellow-500/30 bg-yellow-500/5"
        />
      )}

      <div className="space-y-1 border-b border-slate-700/40 pb-4">
        <h2 className={restaurantDash.sectionTitle}>
          {language === "ar" ? "تحليلات الإيرادات" : "Revenue Analytics"}
        </h2>
        <p className={restaurantDash.sectionSub}>
          {language === "ar"
            ? "إيرادات الشيكات المدفوعة والاتجاهات التاريخية"
            : "Paid Check revenue and historical trends"}
        </p>
      </div>

      <SettlementOverviewSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={enabled}
        currencySymbol={sym}
      />
      <SettlementTrendsSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={enabled}
        currencySymbol={sym}
      />

      {ordersBlocked ? (
        <VerificationRequiredPanel variant="orders" />
      ) : (
        <>
          <div className="border-t border-slate-700/40 pt-4" />

          <div className={restaurantDash.kpiGridWide}>
            <RestaurantKpiCard
              label={language === "ar" ? "طلبات اليوم" : "Today Orders"}
              value={orderSales?.today.totalOrders ?? 0}
              icon={ClipboardList}
              tone="warning"
            />
            <RestaurantKpiCard
              label={language === "ar" ? "طلبات الشهر" : "Month Orders"}
              value={orderSales?.month.totalOrders ?? 0}
              icon={Calendar}
              tone="info"
            />
            <RestaurantKpiCard
              label={language === "ar" ? "مبيعات طلبات اليوم" : "Today's Order Sales"}
              value={`${orderSales?.today.orderSales ?? "0.00"} ${sym}`}
              icon={DollarSign}
              tone="success"
              valueVariant="revenue"
            />
            <RestaurantKpiCard
              label={language === "ar" ? "مبيعات طلبات الشهر" : "Month Order Sales"}
              value={`${orderSales?.month.orderSales ?? "0.00"} ${sym}`}
              icon={TrendingUp}
              tone="success"
              valueVariant="revenue"
            />
          </div>

          <Card className={cn("border-slate-700/50 bg-slate-900/40")}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold">
                  {language === "ar" ? "تقرير شهري" : "Monthly Report"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={exportMonthlyExcel}
                    className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20"
                  >
                    Excel
                    {showExcelUpgrade && (
                      <span className="ml-1 text-[10px] text-yellow-500/90">
                        ({uiLang === "ar" ? "ترقية" : "upgrade"})
                      </span>
                    )}
                  </button>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {monthlyReport.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {language === "ar" ? "لا توجد بيانات" : "No data"}
                </p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {monthlyReport.map((row) => (
                    <div
                      key={row.day}
                      className="flex justify-between rounded-lg bg-muted/10 p-2.5 text-sm"
                    >
                      <span>
                        {language === "ar" ? `يوم ${row.day}` : `Day ${row.day}`}
                      </span>
                      <span className="tabular-nums">
                        {row.count} · {row.totalSales.toFixed(2)} {sym}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn("border-slate-700/50 bg-slate-900/40")}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold">
                  {language === "ar" ? "ملخص سنوي" : "Yearly Summary"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={exportYearlyExcel}
                    className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20"
                  >
                    Excel
                    {showExcelUpgrade && (
                      <span className="ml-1 text-[10px] text-yellow-500/90">
                        ({uiLang === "ar" ? "ترقية" : "upgrade"})
                      </span>
                    )}
                  </button>
                  <span className="text-sm text-muted-foreground">{reportYear}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {yearlySummary.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {language === "ar" ? "لا توجد بيانات" : "No data"}
                </p>
              ) : (
                <div className="space-y-2">
                  {yearlySummary.map((row) => (
                    <div
                      key={row.month}
                      className="flex justify-between rounded-lg bg-muted/10 p-3"
                    >
                      <span className="font-medium">
                        {monthNames[(row.month || 1) - 1]}
                      </span>
                      <span className="tabular-nums text-sm">
                        {row.totalSales.toFixed(2)} {sym} · {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
