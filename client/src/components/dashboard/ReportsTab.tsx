/**
 * REPORTING-PRODUCT-HOTFIX-1
 * Reporting product hotfix — Excel header toolbar + Sales Source honesty.
 * Presentation only — values from reporting.* DTOs; no financial recalculation.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { CommercialUpgradeBanner } from "@/components/commercial";
import { PaymentMethodAnalysisSection } from "@/components/dashboard/PaymentMethodAnalysisSection";
import { RefundAnalyticsSection } from "@/components/dashboard/RefundAnalyticsSection";
import { FinancialSalesFlowStrip } from "@/components/dashboard/FinancialSalesFlowStrip";
import { SettlementTrendsSection } from "@/components/dashboard/SettlementTrendsSection";
import { SalesSourceAnalysisSection } from "@/components/dashboard/SalesSourceAnalysisSection";
import { OrdersDetailsSection } from "@/components/dashboard/OrdersDetailsSection";
import {
  ExecutivePeriodDashboardGrid,
} from "@/components/dashboard/ExecutivePeriodDashboard";
import {
  ExecutivePeriodDashboardSkeleton,
  ExecutivePeriodEmptyState,
} from "@/components/dashboard/ExecutivePeriodEmptyState";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { RestaurantKpiCard } from "@/components/dashboard/RestaurantKpiCard";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { ReportingPeriodToolbar } from "@/components/dashboard/ReportingPeriodToolbar";
import { ReportingExcelToolbar } from "@/components/dashboard/ReportingExcelToolbar";
import {
  downloadReportingExportXlsx,
  monthReportingRange,
  resolveExportCurrency,
  yearReportingRange,
  type RestaurantReportingExportBundle,
  type ReportingExportScope,
} from "@/lib/reporting-exports";
import {
  buildExecutivePeriodDashboardVm,
  isExecutivePeriodEmpty,
  type ExecutivePeriodCard,
} from "@/lib/reporting-exports/executivePeriodDashboard";
import {
  executiveCardDrillTarget,
  focusBreadcrumbLabel,
  FINANCIAL_SECTION_IDS,
  type FinancialAnalyticsFocus,
} from "@/lib/reporting-exports/executiveDrillDown";
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
  businessDayTodayReportingBounds,
  reportingWorkingHours,
  SECTION_TERMINOLOGY,
} from "@shared/reporting-platform";
import { ChevronRight, Receipt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProductReportTab = "today" | "month" | "financial";

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
  const [productTab, setProductTab] = useState<ProductReportTab>("today");
  const [financialFocus, setFinancialFocus] =
    useState<FinancialAnalyticsFocus | null>(null);

  const monthNames =
    language === "ar"
      ? [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

  const { isAuthenticated, authPending } = useAuth();
  const { entitlements, showReportsUpgrade, showExcelUpgrade } =
    useCommercialFeatureVisibility();
  const uiLang = language === "ar" ? "ar" : "en";
  const enabled = restaurantQueriesEnabled(
    authPending,
    isAuthenticated,
    restaurantId
  );

  const hours = useMemo(
    () => reportingWorkingHours(workingHoursRaw),
    [workingHoursRaw]
  );
  const todayRange = useMemo(() => {
    const bounds = businessDayTodayReportingBounds(hours);
    return {
      from: bounds.from ?? undefined,
      to: bounds.to ?? undefined,
    };
  }, [hours]);
  const monthRange = useMemo(
    () => monthReportingRange(reportYear, reportMonth, workingHoursRaw),
    [reportYear, reportMonth, workingHoursRaw]
  );
  const yearRange = useMemo(
    () => yearReportingRange(reportYear, workingHoursRaw),
    [reportYear, workingHoursRaw]
  );

  useDevQueryRuntimeLog("reporting.getOrderSalesSummary", {
    enabled,
    authPending,
    isAuthenticated,
    pollMs: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const { data: orderSales, error: orderSalesError } =
    trpc.reporting.getOrderSalesSummary.useQuery(
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

  const { data: businessToday, isLoading: businessTodayLoading } =
    trpc.reporting.getBusinessMetricsSummary.useQuery(
      { restaurantId, from: todayRange.from, to: todayRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const { data: businessMonth, isLoading: businessMonthLoading } =
    trpc.reporting.getBusinessMetricsSummary.useQuery(
      { restaurantId, from: monthRange.from, to: monthRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const { data: businessYear } =
    trpc.reporting.getBusinessMetricsSummary.useQuery(
      { restaurantId, from: yearRange.from, to: yearRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const { data: revenueTrendMonth } =
    trpc.reporting.getBusinessMetricsTrend.useQuery(
      {
        restaurantId,
        from: monthRange.from,
        to: monthRange.to,
        grouping: "day",
      },
      reportingBusinessTrendQueryOptions(enabled)
    );

  const { data: revenueTrendYear } =
    trpc.reporting.getBusinessMetricsTrend.useQuery(
      {
        restaurantId,
        from: yearRange.from,
        to: yearRange.to,
        grouping: "month",
      },
      reportingBusinessTrendQueryOptions(enabled)
    );

  const { data: paymentToday, isLoading: paymentTodayLoading } =
    trpc.reporting.getPaymentMethodAnalytics.useQuery(
      { restaurantId, from: todayRange.from, to: todayRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const { data: paymentMonth, isLoading: paymentMonthLoading } =
    trpc.reporting.getPaymentMethodAnalytics.useQuery(
      { restaurantId, from: monthRange.from, to: monthRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const { data: paymentYear } =
    trpc.reporting.getPaymentMethodAnalytics.useQuery(
      { restaurantId, from: yearRange.from, to: yearRange.to },
      reportingBusinessSummaryQueryOptions(enabled)
    );

  const ordersBlocked = isEmailNotVerifiedError(orderSalesError);
  const monthOrderPeriod = useMemo(() => {
    if (monthlyRollup) {
      const scoped = scopedOrderSalesFromRollup(monthlyRollup);
      return {
        orderSales: scoped.orderSales,
        orderCount: scoped.orderCount,
        completedOrders: scoped.completedOrders,
      };
    }
    return { orderSales: "0.00", orderCount: 0, completedOrders: 0 };
  }, [monthlyRollup]);
  const monthOrderCount = monthOrderPeriod.orderCount;

  const todayLoading =
    enabled && (businessTodayLoading || paymentTodayLoading);
  const monthLoading =
    enabled && (businessMonthLoading || paymentMonthLoading);

  const todayEmpty = useMemo(
    () =>
      !todayLoading &&
      isExecutivePeriodEmpty({
        business: businessToday,
        payment: paymentToday,
        orderCount: orderSales?.today.totalOrders,
      }),
    [todayLoading, businessToday, paymentToday, orderSales]
  );

  const monthEmpty = useMemo(
    () =>
      !monthLoading &&
      isExecutivePeriodEmpty({
        business: businessMonth,
        payment: paymentMonth,
        orderCount: monthOrderCount,
      }),
    [monthLoading, businessMonth, paymentMonth, monthOrderCount]
  );

  const todaySym = resolveReportingCurrencySymbol(businessToday, fallbackSym);
  const monthSym = resolveReportingCurrencySymbol(businessMonth, fallbackSym);
  const financialSym = resolveReportingCurrencySymbol(
    businessMonth,
    fallbackSym
  );

  const todayVm = useMemo(
    () =>
      buildExecutivePeriodDashboardVm({
        scope: "today",
        language: uiLang,
        business: businessToday,
        payment: paymentToday,
        orderCount: orderSales?.today.totalOrders,
        formatMoney: (a) => formatSettlementRevenue(a, todaySym),
      }),
    [businessToday, paymentToday, orderSales, uiLang, todaySym]
  );

  const monthVm = useMemo(
    () =>
      buildExecutivePeriodDashboardVm({
        scope: "month",
        language: uiLang,
        business: businessMonth,
        payment: paymentMonth,
        orderCount: monthOrderCount,
        formatMoney: (a) => formatSettlementRevenue(a, monthSym),
      }),
    [businessMonth, paymentMonth, monthOrderCount, uiLang, monthSym]
  );

  const tabLabels: Record<ProductReportTab, string> = {
    today: uiLang === "ar" ? "اليوم" : "Today",
    month: uiLang === "ar" ? "هذا الشهر" : "This Month",
    financial: SECTION_TERMINOLOGY[uiLang].financialAnalytics,
  };

  const selectProductTab = (id: ProductReportTab) => {
    setProductTab(id);
    if (id !== "financial") setFinancialFocus(null);
  };

  const drillFromCard = (card: ExecutivePeriodCard) => {
    const target = executiveCardDrillTarget(card.id);
    setFinancialFocus(target.focus);
    setProductTab("financial");
  };

  useEffect(() => {
    if (productTab !== "financial" || !financialFocus) return;
    const target = Object.values(FINANCIAL_SECTION_IDS).find((id) => {
      if (financialFocus === "payment-cash" || financialFocus === "payment-card") {
        return id === FINANCIAL_SECTION_IDS.payment;
      }
      if (financialFocus === "sales-trend") return id === FINANCIAL_SECTION_IDS.salesTrend;
      if (financialFocus === "orders") return id === FINANCIAL_SECTION_IDS.orders;
      if (financialFocus === "refunds") return id === FINANCIAL_SECTION_IDS.refunds;
      if (financialFocus === "tax") return id === FINANCIAL_SECTION_IDS.tax;
      if (financialFocus === "sales-source") return id === FINANCIAL_SECTION_IDS.salesSource;
      if (financialFocus === "exports") return id === FINANCIAL_SECTION_IDS.exports;
      return id === FINANCIAL_SECTION_IDS.overview;
    });
    if (!target) return;
    const t = window.setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [productTab, financialFocus]);

  const focusCrumb = focusBreadcrumbLabel(financialFocus, uiLang);

  const buildBundle = (
    scope: ReportingExportScope
  ): RestaurantReportingExportBundle | null => {
    const business = scope === "month" ? businessMonth : businessYear;
    const orderSalesRollup = scope === "month" ? monthlyRollup : yearlyRollup;
    const revenueTrend =
      scope === "month" ? revenueTrendMonth : revenueTrendYear;
    const paymentMethodAnalytics =
      scope === "month" ? paymentMonth : paymentYear;
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
    return {
      restaurantName: restaurantName?.trim() || "",
      businessName: restaurantName?.trim() || "",
      logoUrl: logoUrl ?? null,
      reportTitle:
        scope === "month"
          ? language === "ar"
            ? "التقرير المالي الشهري"
            : "Monthly Financial Report"
          : language === "ar"
            ? "التقرير المالي السنوي"
            : "Annual Financial Report",
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
          ? "التصدير غير جاهز بعد — انتظر اكتمال أرقام الفترة."
          : "Export isn’t ready yet — wait until this period’s numbers finish loading."
      );
      return;
    }
    await downloadReportingExportXlsx(bundle, fallbackSym, currencyCode);
  };

  return (
    <div className={cn(restaurantDash.stack, "pb-2")}>
      <div className="sticky top-0 z-30 -mx-1 space-y-3 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/80 px-1 pb-3 pt-1 backdrop-blur-md">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {language === "ar" ? "التقارير" : "Reports"}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            {language === "ar"
              ? "اليوم · هذا الشهر · التحليلات المالية — افهم أداء مطعمك بسرعة واتخذ قرارات أوضح."
              : "Today · This Month · Financial Analytics — understand performance quickly and decide with clarity."}
          </p>
        </header>

        <ReportingExcelToolbar
          toolbarId={FINANCIAL_SECTION_IDS.exports}
          language={language}
          onExportMonth={() => void exportScopeXlsx("month")}
          onExportYear={() => void exportScopeXlsx("year")}
          upgradeSlot={
            showExcelUpgrade ? (
              <CommercialUpgradeBanner
                entitlements={entitlements}
                featureKey="excelExport"
                language={uiLang}
                className="border-yellow-500/30 bg-yellow-500/5"
              />
            ) : null
          }
        />

        <div
          className="flex flex-wrap gap-2 border-b border-slate-700/40 pb-3"
          role="tablist"
          aria-label={language === "ar" ? "أقسام التقارير" : "Report sections"}
        >
          {(
            [
              ["today", tabLabels.today],
              ["month", tabLabels.month],
              ["financial", tabLabels.financial],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={productTab === id}
              onClick={() => selectProductTab(id)}
              className={cn(
                "min-h-10 rounded-xl px-4 py-2 text-sm font-semibold motion-safe:transition-all motion-safe:duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                productTab === id
                  ? "bg-white text-slate-900 shadow-md shadow-white/10"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <nav
        className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500"
        aria-label={uiLang === "ar" ? "مسار التصفح" : "Breadcrumb"}
      >
        <span className="font-medium text-slate-300">
          {uiLang === "ar" ? "التقارير" : "Reports"}
        </span>
        <ChevronRight className="h-3.5 w-3.5 opacity-50 rtl:rotate-180" aria-hidden />
        <span className="font-medium text-slate-200">{tabLabels[productTab]}</span>
        {productTab === "financial" && focusCrumb ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 opacity-50 rtl:rotate-180" aria-hidden />
            <span className="text-teal-300/90">{focusCrumb}</span>
          </>
        ) : null}
      </nav>

      {showReportsUpgrade && (
        <CommercialUpgradeBanner
          entitlements={entitlements}
          featureKey="reports"
          language={uiLang}
          className="border-yellow-500/30 bg-yellow-500/5"
        />
      )}

      {productTab === "today" ? (
        <RestaurantDashSection
          title={todayVm.title}
          description={todayVm.subtitle}
          ariaLabel={todayVm.title}
        >
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-200">
              {todayVm.primaryQuestion}
            </p>
            {ordersBlocked ? (
              <VerificationRequiredPanel variant="orders" />
            ) : todayLoading ? (
              <ExecutivePeriodDashboardSkeleton />
            ) : todayEmpty ? (
              <ExecutivePeriodEmptyState scope="today" language={uiLang} />
            ) : (
              <ExecutivePeriodDashboardGrid
                cards={todayVm.cards}
                language={uiLang}
                onActivate={drillFromCard}
              />
            )}
          </div>
        </RestaurantDashSection>
      ) : null}

      {productTab === "month" ? (
        <div className="space-y-5 sm:space-y-6">
          <ReportingPeriodToolbar
            title={language === "ar" ? "اختر الشهر" : "Choose month"}
            month={reportMonth}
            year={reportYear}
            monthNames={monthNames}
            onMonthChange={setReportMonth}
            onYearChange={setReportYear}
          />
          <RestaurantDashSection
            title={monthVm.title}
            description={monthVm.subtitle}
            ariaLabel={monthVm.title}
          >
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-200">
                {monthVm.primaryQuestion}
              </p>
              {ordersBlocked ? (
                <VerificationRequiredPanel variant="orders" />
              ) : monthLoading ? (
                <ExecutivePeriodDashboardSkeleton />
              ) : monthEmpty ? (
                <ExecutivePeriodEmptyState scope="month" language={uiLang} />
              ) : (
                <ExecutivePeriodDashboardGrid
                  cards={monthVm.cards}
                  language={uiLang}
                  onActivate={drillFromCard}
                />
              )}
            </div>
          </RestaurantDashSection>
        </div>
      ) : null}

      {productTab === "financial" ? (
        <div className="space-y-6 sm:space-y-8 lg:space-y-10">
          <ReportingPeriodToolbar
            title={
              language === "ar"
                ? "فترة التحليلات المالية"
                : "Financial analytics period"
            }
            month={reportMonth}
            year={reportYear}
            monthNames={monthNames}
            onMonthChange={setReportMonth}
            onYearChange={setReportYear}
          />

          <div
            id={FINANCIAL_SECTION_IDS.overview}
            className={cn(
              financialFocus === "overview" &&
                "rounded-2xl ring-2 ring-teal-400/30 ring-offset-2 ring-offset-slate-950"
            )}
          >
            {businessMonth != null ? (
              <FinancialSalesFlowStrip
                language={uiLang}
                revenue={businessMonth.revenue ?? "0.00"}
                refundPublishedTotal={
                  businessMonth.refundPublishedTotal ?? "0.00"
                }
                netRevenue={businessMonth.netRevenue ?? "0.00"}
                currencySymbol={financialSym}
              />
            ) : businessMonthLoading ? (
              <ExecutivePeriodDashboardSkeleton className="max-w-4xl" />
            ) : (
              <ExecutivePeriodEmptyState scope="month" language={uiLang} />
            )}
          </div>

          <SettlementTrendsSection
            restaurantId={restaurantId}
            language={language}
            queriesEnabled={enabled}
            currencySymbol={
              resolveExportCurrency(businessMonth, fallbackSym, currencyCode)
                .currencySymbol
            }
            from={monthRange.from}
            to={monthRange.to}
            sectionId={FINANCIAL_SECTION_IDS.salesTrend}
            emphasized={financialFocus === "sales-trend"}
          />

          <PaymentMethodAnalysisSection
            restaurantId={restaurantId}
            language={language}
            queriesEnabled={enabled}
            currencySymbol={
              resolveExportCurrency(businessMonth, fallbackSym, currencyCode)
                .currencySymbol
            }
            from={monthRange.from}
            to={monthRange.to}
            sectionId={FINANCIAL_SECTION_IDS.payment}
            highlightCanonical={
              financialFocus === "payment-cash"
                ? "cash"
                : financialFocus === "payment-card"
                  ? "card"
                  : null
            }
            emphasized={
              financialFocus === "payment-cash" ||
              financialFocus === "payment-card"
            }
          />

          <SalesSourceAnalysisSection
            restaurantId={restaurantId}
            language={language}
            queriesEnabled={enabled}
            currencySymbol={
              resolveExportCurrency(businessMonth, fallbackSym, currencyCode)
                .currencySymbol
            }
            from={monthRange.from}
            to={monthRange.to}
            sectionId={FINANCIAL_SECTION_IDS.salesSource}
            emphasized={financialFocus === "sales-source"}
          />

          <OrdersDetailsSection
            language={language}
            orderCount={monthOrderPeriod.orderCount}
            completedOrders={monthOrderPeriod.completedOrders}
            orderSalesDisplay={formatSettlementRevenue(
              monthOrderPeriod.orderSales,
              financialSym
            )}
            sectionId={FINANCIAL_SECTION_IDS.orders}
            emphasized={financialFocus === "orders"}
          />

          <RefundAnalyticsSection
            restaurantId={restaurantId}
            language={language}
            queriesEnabled={enabled}
            currencySymbol={
              resolveExportCurrency(businessMonth, fallbackSym, currencyCode)
                .currencySymbol
            }
            from={monthRange.from}
            to={monthRange.to}
            sectionId={FINANCIAL_SECTION_IDS.refunds}
            emphasized={financialFocus === "refunds"}
          />

          <RestaurantDashSection
            id={FINANCIAL_SECTION_IDS.tax}
            title={SECTION_TERMINOLOGY[uiLang].taxAnalysis}
            description={SECTION_TERMINOLOGY[uiLang].taxAnalysisPeriodNote}
            ariaLabel={SECTION_TERMINOLOGY[uiLang].taxAnalysis}
            className={cn(
              financialFocus === "tax" &&
                "rounded-2xl ring-2 ring-violet-400/40 ring-offset-2 ring-offset-slate-950"
            )}
          >
            <div className={restaurantDash.kpiGridSecondary}>
              <RestaurantKpiCard
                label={kpiDisplayName("taxCollected", uiLang)}
                value={formatSettlementRevenue(
                  businessMonth?.taxCollected ?? "0.00",
                  financialSym
                )}
                icon={Receipt}
                tone="accent"
                valueVariant="revenue"
                emphasis="secondary"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {uiLang === "ar"
                ? "المبيعات قبل/بعد الضريبة تظهر عند نشر أساس الضريبة في عقود التقارير."
                : "Sales before/after tax appear when Reporting publishes tax-base facts."}
            </p>
          </RestaurantDashSection>
        </div>
      ) : null}
    </div>
  );
}
