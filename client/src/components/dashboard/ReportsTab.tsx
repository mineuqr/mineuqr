import { useAuth } from "@/_core/hooks/useAuth";
import { CommercialUpgradeBanner } from "@/components/commercial";
import { SettlementOverviewSection } from "@/components/dashboard/SettlementOverviewSection";
import { SettlementTrendsSection } from "@/components/dashboard/SettlementTrendsSection";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { RestaurantKpiCard } from "@/components/dashboard/RestaurantKpiCard";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  downloadReportingExportPdf,
  downloadReportingExportXlsx,
  monthReportingRange,
  resolveExportCurrency,
  yearReportingRange,
  type RestaurantReportingExportBundle,
  type ReportingExportScope,
} from "@/lib/reporting-exports";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingBusinessSummaryQueryOptions,
  reportingBusinessTrendQueryOptions,
  reportingOperationalSnapshotQueryOptions,
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
import { toast } from "sonner";

/**
 * REPORTING-EXPORTS-1 — Reports presentation + Excel/PDF renderers.
 * All KPIs come from reporting.* DTOs. Exports never calculate business values.
 */
export function ReportsTab({
  restaurantId,
  restaurantName,
  logoUrl,
  currencySymbol,
  currencyCode,
  t,
  language,
  statsAriaLabel,
}: {
  restaurantId: number;
  restaurantName?: string;
  logoUrl?: string | null;
  currencySymbol?: string;
  currencyCode?: string;
  t: (key: string) => string;
  language: string;
  statsAriaLabel: string;
}) {
  const fallbackSym = currencySymbol || "ر.س";
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

  const monthRange = useMemo(
    () => monthReportingRange(reportYear, reportMonth),
    [reportYear, reportMonth]
  );
  const yearRange = useMemo(() => yearReportingRange(reportYear), [reportYear]);

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
  useDevQueryRuntimeLog("reporting.getBusinessMetricsSummary (exports)", {
    enabled,
    authPending,
    isAuthenticated,
  });
  useDevQueryRuntimeLog("reporting.getOperationalMetricsSnapshot (exports)", {
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

  const { data: businessMonth } = trpc.reporting.getBusinessMetricsSummary.useQuery(
    { restaurantId, from: monthRange.from, to: monthRange.to },
    reportingBusinessSummaryQueryOptions(enabled)
  );

  const { data: businessYear } = trpc.reporting.getBusinessMetricsSummary.useQuery(
    { restaurantId, from: yearRange.from, to: yearRange.to },
    reportingBusinessSummaryQueryOptions(enabled)
  );

  const { data: revenueTrendMonth } = trpc.reporting.getBusinessMetricsTrend.useQuery(
    {
      restaurantId,
      from: monthRange.from,
      to: monthRange.to,
      grouping: "day",
    },
    reportingBusinessTrendQueryOptions(enabled)
  );

  const { data: revenueTrendYear } = trpc.reporting.getBusinessMetricsTrend.useQuery(
    {
      restaurantId,
      from: yearRange.from,
      to: yearRange.to,
      grouping: "month",
    },
    reportingBusinessTrendQueryOptions(enabled)
  );

  const { data: operational } = trpc.reporting.getOperationalMetricsSnapshot.useQuery(
    { restaurantId },
    reportingOperationalSnapshotQueryOptions(enabled)
  );

  const ordersBlocked = isEmailNotVerifiedError(orderSalesError);

  const sym = resolveExportCurrency(businessMonth, fallbackSym, currencyCode)
    .currencySymbol;

  const buildBundle = (
    scope: ReportingExportScope
  ): RestaurantReportingExportBundle | null => {
    const business = scope === "month" ? businessMonth : businessYear;
    const orderSalesRollup = scope === "month" ? monthlyRollup : yearlyRollup;
    const revenueTrend = scope === "month" ? revenueTrendMonth : revenueTrendYear;
    if (!business || !orderSales || !operational || !catalog || !orderSalesRollup || !revenueTrend) {
      return null;
    }
    const periodLabel =
      scope === "month"
        ? `${monthNames[reportMonth - 1]} ${reportYear}`
        : language === "ar"
          ? `السنة ${reportYear}`
          : `Year ${reportYear}`;
    return {
      restaurantName: restaurantName?.trim() || "",
      businessName: restaurantName?.trim() || "",
      logoUrl: logoUrl ?? null,
      reportTitle:
        language === "ar" ? "تقرير الأداء التجاري" : "Business Performance Report",
      language: language === "ar" ? "ar" : "en",
      scope,
      periodLabel,
      filenameStem:
        scope === "month"
          ? `reporting-${reportYear}-${String(reportMonth).padStart(2, "0")}`
          : `reporting-${reportYear}`,
      business,
      orderSales,
      operational,
      catalog,
      orderSalesRollup,
      revenueTrend,
    };
  };

  const exportScope = async (
    scope: ReportingExportScope,
    format: "xlsx" | "pdf"
  ) => {
    const bundle = buildBundle(scope);
    if (!bundle) {
      toast.error(
        language === "ar"
          ? "تعذر التصدير — انتظر اكتمال بيانات التقارير."
          : "Export unavailable — wait for reporting data to load."
      );
      return;
    }
    if (format === "xlsx") {
      await downloadReportingExportXlsx(bundle, fallbackSym, currencyCode);
    } else {
      await downloadReportingExportPdf(bundle, fallbackSym, currencyCode);
    }
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
                    onClick={() => void exportScope("month", "xlsx")}
                    className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20"
                  >
                    Excel
                    {showExcelUpgrade && (
                      <span className="ml-1 text-[10px] text-yellow-500/90">
                        ({uiLang === "ar" ? "ترقية" : "upgrade"})
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportScope("month", "pdf")}
                    className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/20"
                  >
                    PDF
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
              {(monthlyRollup?.periods.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {language === "ar" ? "لا توجد بيانات" : "No data"}
                </p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {monthlyRollup?.periods.map((row) => (
                    <div
                      key={row.periodKey}
                      className="flex justify-between rounded-lg bg-muted/10 p-2.5 text-sm"
                    >
                      <span>{row.periodKey}</span>
                      <span className="tabular-nums">
                        {row.orderCount} · {row.orderSales} {sym}
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
                    onClick={() => void exportScope("year", "xlsx")}
                    className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20"
                  >
                    Excel
                    {showExcelUpgrade && (
                      <span className="ml-1 text-[10px] text-yellow-500/90">
                        ({uiLang === "ar" ? "ترقية" : "upgrade"})
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportScope("year", "pdf")}
                    className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/20"
                  >
                    PDF
                  </button>
                  <span className="text-sm text-muted-foreground">{reportYear}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {(yearlyRollup?.periods.length ?? 0) === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {language === "ar" ? "لا توجد بيانات" : "No data"}
                </p>
              ) : (
                <div className="space-y-2">
                  {yearlyRollup?.periods.map((row) => (
                    <div
                      key={row.periodKey}
                      className="flex justify-between rounded-lg bg-muted/10 p-3"
                    >
                      <span className="font-medium">{row.periodKey}</span>
                      <span className="tabular-nums text-sm">
                        {row.orderSales} {sym} · {row.orderCount}
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
