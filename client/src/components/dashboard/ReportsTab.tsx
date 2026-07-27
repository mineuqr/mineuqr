import { useAuth } from "@/_core/hooks/useAuth";
import { CommercialUpgradeBanner } from "@/components/commercial";
import { PaymentMethodAnalysisSection } from "@/components/dashboard/PaymentMethodAnalysisSection";
import { RefundAnalyticsSection } from "@/components/dashboard/RefundAnalyticsSection";
import { SettlementOverviewSection } from "@/components/dashboard/SettlementOverviewSection";
import { SettlementTrendsSection } from "@/components/dashboard/SettlementTrendsSection";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { RestaurantKpiCard } from "@/components/dashboard/RestaurantKpiCard";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  downloadReportingExportXlsx,
  monthReportingRange,
  resolveExportCurrency,
  yearReportingRange,
  type RestaurantReportingExportBundle,
  type ReportingExportScope,
} from "@/lib/reporting-exports";
import { buildExecutiveSummaryViewModel } from "@/lib/reporting-exports/executiveSummaryPresentation";
import { scopedOrderSalesFromRollup } from "@/lib/reporting-exports/scopeTotals";
import { kpiDisplayName } from "@/lib/reporting/kpiDisplay";
import {
  formatSettlementRevenue,
  resolveReportingCurrencySymbol,
} from "@/lib/settlementOverviewDisplay";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingBusinessSummaryQueryOptions,
  reportingBusinessTrendQueryOptions,
  reportingOrderSalesQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useCommercialFeatureVisibility } from "@/hooks/useCommercialFeatureVisibility";
import {
  businessCurrentYearMonth,
  SECTION_TERMINOLOGY,
} from "@shared/reporting-platform";
import {
  ClipboardList,
  DollarSign,
  Receipt,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0
 * Period-bound executive reporting hierarchy. KPIs from reporting.* only.
 */
export function ReportsTab({
  restaurantId,
  restaurantName,
  logoUrl,
  currencySymbol,
  currencyCode,
  t: _t,
  language,
  statsAriaLabel: _statsAriaLabel,
  workingHoursRaw,
}: {
  restaurantId: number;
  restaurantName?: string;
  logoUrl?: string | null;
  currencySymbol?: string;
  currencyCode?: string;
  t: (key: string) => string;
  language: string;
  statsAriaLabel: string;
  workingHoursRaw?: unknown;
}) {
  const fallbackSym = currencySymbol || "ر.س";
  const initialYm = businessCurrentYearMonth();
  const [reportYear, setReportYear] = useState(initialYm.year);
  const [reportMonth, setReportMonth] = useState(initialYm.month);
  const [reportScope, setReportScope] = useState<ReportingExportScope>("month");

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
    () => monthReportingRange(reportYear, reportMonth, workingHoursRaw),
    [reportYear, reportMonth, workingHoursRaw]
  );
  const yearRange = useMemo(
    () => yearReportingRange(reportYear, workingHoursRaw),
    [reportYear, workingHoursRaw]
  );
  const activeRange = reportScope === "month" ? monthRange : yearRange;
  const periodLabel =
    reportScope === "month"
      ? `${monthNames[reportMonth - 1]} ${reportYear}`
      : String(reportYear);

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

  const { data: paymentAnalyticsMonth } =
    trpc.reporting.getPaymentMethodAnalytics.useQuery(
      { restaurantId, from: monthRange.from, to: monthRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const { data: paymentAnalyticsYear } =
    trpc.reporting.getPaymentMethodAnalytics.useQuery(
      { restaurantId, from: yearRange.from, to: yearRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const ordersBlocked = isEmailNotVerifiedError(orderSalesError);
  const activeBusiness = reportScope === "month" ? businessMonth : businessYear;
  const activeRollup = reportScope === "month" ? monthlyRollup : yearlyRollup;
  const sym = resolveExportCurrency(activeBusiness, fallbackSym, currencyCode)
    .currencySymbol;
  const displaySym = resolveReportingCurrencySymbol(
    activeBusiness,
    fallbackSym
  );

  const orderPeriod = useMemo(() => {
    if (activeRollup) return scopedOrderSalesFromRollup(activeRollup);
    return {
      orderSales: "0.00",
      orderCount: 0,
      completedOrders: 0,
      averageOrder: "0.00",
    };
  }, [activeRollup]);

  const executiveVm = useMemo(() => {
    if (!activeBusiness) return null;
    return buildExecutiveSummaryViewModel({
      language: uiLang,
      business: activeBusiness,
      orderPeriod,
      formatMoney: (amount) => formatSettlementRevenue(amount, displaySym),
    });
  }, [activeBusiness, orderPeriod, uiLang, displaySym]);

  const buildBundle = (
    scope: ReportingExportScope
  ): RestaurantReportingExportBundle | null => {
    const business = scope === "month" ? businessMonth : businessYear;
    const orderSalesRollup = scope === "month" ? monthlyRollup : yearlyRollup;
    const revenueTrend = scope === "month" ? revenueTrendMonth : revenueTrendYear;
    const paymentMethodAnalytics =
      scope === "month" ? paymentAnalyticsMonth : paymentAnalyticsYear;
    if (
      !business ||
      !orderSalesRollup ||
      !revenueTrend ||
      !paymentMethodAnalytics
    ) {
      return null;
    }
    const label =
      scope === "month"
        ? `${monthNames[reportMonth - 1]} ${reportYear}`
        : String(reportYear);
    const reportTitle =
      scope === "month"
        ? language === "ar"
          ? "التقرير المالي الشهري"
          : "Monthly Financial Report"
        : language === "ar"
          ? "التقرير المالي السنوي"
          : "Annual Financial Report";
    return {
      restaurantName: restaurantName?.trim() || "",
      businessName: restaurantName?.trim() || "",
      logoUrl: logoUrl ?? null,
      reportTitle,
      language: language === "ar" ? "ar" : "en",
      scope,
      periodLabel: label,
      filenameStem:
        scope === "month"
          ? `reporting-${reportYear}-${String(reportMonth).padStart(2, "0")}`
          : `reporting-${reportYear}`,
      business,
      orderSalesRollup,
      revenueTrend,
      paymentMethodAnalytics,
    };
  };

  const exportScopeXlsx = async (scope: ReportingExportScope) => {
    const bundle = buildBundle(scope);
    if (!bundle) {
      toast.error(
        language === "ar"
          ? "تعذر التصدير — انتظر اكتمال بيانات التقارير."
          : "Export unavailable — wait for reporting data to load."
      );
      return;
    }
    await downloadReportingExportXlsx(bundle, fallbackSym, currencyCode);
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {language === "ar" ? "التقارير" : "Restaurant Reports"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          {language === "ar"
            ? "إجمالي المبيعات ومبيعات الطلبات — نفس فترة لوحة التحكم وExcel"
            : "Total Sales and Sales Orders — dashboard and Excel share the same period"}
        </p>
      </div>

      <Card className={cn("border-slate-700/50 bg-slate-900/40")}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">
              {language === "ar" ? "فترة التقرير" : "Report period"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reportScope}
                onChange={(e) =>
                  setReportScope(e.target.value as ReportingExportScope)
                }
                className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                aria-label={language === "ar" ? "نطاق الفترة" : "Period scope"}
              >
                <option value="month">
                  {language === "ar" ? "شهر ميلادي" : "Calendar month"}
                </option>
                <option value="year">
                  {language === "ar" ? "سنة ميلادية" : "Calendar year"}
                </option>
              </select>
              {reportScope === "month" ? (
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
              ) : null}
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
              <button
                type="button"
                onClick={() => void exportScopeXlsx(reportScope)}
                className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20"
              >
                Excel
                {showExcelUpgrade && (
                  <span className="ml-1 text-[10px] text-yellow-500/90">
                    ({uiLang === "ar" ? "ترقية" : "upgrade"})
                  </span>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {language === "ar" ? "الفترة النشطة:" : "Active period:"}{" "}
            <span className="font-medium text-slate-200">{periodLabel}</span>
            <span className="text-slate-500">
              {" "}
              · {activeRange.from} → {activeRange.to}
            </span>
          </p>
        </CardHeader>
      </Card>

      {showReportsUpgrade && (
        <CommercialUpgradeBanner
          entitlements={entitlements}
          featureKey="reports"
          language={uiLang}
          className="border-yellow-500/30 bg-yellow-500/5"
        />
      )}

      {/* 1. Executive KPIs */}
      <RestaurantDashSection
        title={SECTION_TERMINOLOGY[uiLang].executiveSnapshot}
        description={SECTION_TERMINOLOGY[uiLang].executiveSnapshotHint}
        ariaLabel={SECTION_TERMINOLOGY[uiLang].executiveSnapshot}
      >
        {executiveVm == null ? (
          <p className="text-sm text-slate-400">
            {language === "ar" ? "جاري التحميل…" : "Loading…"}
          </p>
        ) : (
          <div className={restaurantDash.kpiGridWide}>
            {executiveVm.groups[0]?.cards.map((card) => (
              <RestaurantKpiCard
                key={card.kpiId}
                label={card.label}
                value={card.value}
                icon={DollarSign}
                tone={
                  card.kpiId === "refundPublishedTotal" ||
                  card.kpiId === "refundRate"
                    ? "warning"
                    : "success"
                }
                valueVariant={
                  card.kpiId === "orderCount" ? "default" : "revenue"
                }
                hint={card.caption}
              />
            ))}
          </div>
        )}
      </RestaurantDashSection>

      {/* 2. Sales Orders (operational) */}
      {ordersBlocked ? (
        <VerificationRequiredPanel variant="orders" />
      ) : (
        <RestaurantDashSection
          title={SECTION_TERMINOLOGY[uiLang].orderSalesAnalytics}
          description={SECTION_TERMINOLOGY[uiLang].orderSalesAnalyticsNote}
          ariaLabel={SECTION_TERMINOLOGY[uiLang].orderSalesAnalytics}
        >
          <div className={restaurantDash.kpiGridWide}>
            <RestaurantKpiCard
              label={`${kpiDisplayName("orderSales", uiLang)} · ${periodLabel}`}
              value={`${orderPeriod.orderSales} ${sym}`}
              icon={DollarSign}
              tone="success"
              valueVariant="revenue"
            />
            <RestaurantKpiCard
              label={`${kpiDisplayName("completedOrders", uiLang)} · ${periodLabel}`}
              value={orderPeriod.completedOrders}
              icon={ClipboardList}
              tone="info"
            />
            <RestaurantKpiCard
              label={
                language === "ar"
                  ? `${kpiDisplayName("orderSales", "ar")} اليوم (يوم العمل)`
                  : `Today's ${kpiDisplayName("orderSales", "en")} (Business Day)`
              }
              value={`${orderSales?.today.orderSales ?? "0.00"} ${sym}`}
              icon={DollarSign}
              tone="accent"
              valueVariant="revenue"
            />
          </div>
        </RestaurantDashSection>
      )}

      {/* 3. Financial Performance */}
      <SettlementOverviewSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={enabled}
        currencySymbol={sym}
        from={activeRange.from}
        to={activeRange.to}
      />

      {/* 4. Refund Analytics */}
      <RefundAnalyticsSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={enabled}
        currencySymbol={sym}
        from={activeRange.from}
        to={activeRange.to}
      />

      {/* 5. Payment Analytics */}
      <PaymentMethodAnalysisSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={enabled}
        currencySymbol={sym}
        from={activeRange.from}
        to={activeRange.to}
      />

      {/* 6. Tax */}
      <RestaurantDashSection
        title={SECTION_TERMINOLOGY[uiLang].taxAnalysis}
        description={SECTION_TERMINOLOGY[uiLang].taxAnalysisPeriodNote}
        ariaLabel={SECTION_TERMINOLOGY[uiLang].taxAnalysis}
      >
        <div className={restaurantDash.kpiGrid}>
          <RestaurantKpiCard
            label={kpiDisplayName("taxCollected", uiLang)}
            value={formatSettlementRevenue(
              activeBusiness?.taxCollected ?? "0.00",
              displaySym
            )}
            icon={Receipt}
            tone="info"
            valueVariant="revenue"
          />
        </div>
      </RestaurantDashSection>

      {/* 7–8. Trends + period rollups */}
      <SettlementTrendsSection
        restaurantId={restaurantId}
        language={language}
        queriesEnabled={enabled}
        currencySymbol={sym}
        from={activeRange.from}
        to={activeRange.to}
      />

      {!ordersBlocked && activeRollup != null ? (
        <Card className={cn("border-slate-700/50 bg-slate-900/40")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {reportScope === "month"
                ? language === "ar"
                  ? "تفصيل أيام الشهر (مبيعات الطلبات)"
                  : "Month day detail (Sales Orders)"
                : language === "ar"
                  ? "تفصيل أشهر السنة (مبيعات الطلبات)"
                  : "Year month detail (Sales Orders)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(activeRollup.periods.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {language === "ar" ? "لا توجد بيانات" : "No data"}
              </p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {activeRollup.periods.map((row) => (
                  <div
                    key={row.periodKey}
                    className="flex justify-between rounded-lg bg-muted/10 p-2.5 text-sm"
                  >
                    <span>{row.periodKey}</span>
                    <span className="tabular-nums">
                      {row.completedOrders} · {row.orderSales} {sym}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
