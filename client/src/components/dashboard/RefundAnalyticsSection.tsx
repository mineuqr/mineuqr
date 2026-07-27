/**
 * REPORTING-UX-RATIONALIZATION-1 — Unified Refund Analytics (presentation only).
 * Values from reporting.* DTOs — no financial recalculation.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  reportingBusinessSummaryQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { formatMoneyDisplay } from "@/lib/reporting-exports/format";
import { buildPaymentMethodAnalysisViewModel } from "@/lib/reporting-exports/paymentMethodAnalysisPresentation";
import { kpiDisplayName } from "@/lib/reporting/kpiDisplay";
import {
  formatSettlementRevenue,
  resolveReportingCurrencySymbol,
} from "@/lib/settlementOverviewDisplay";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Percent,
  RotateCcw,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { RestaurantKpiCard, RestaurantKpiGridSkeleton } from "./RestaurantKpiCard";
import { RestaurantSectionError } from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";

export function RefundAnalyticsSection({
  restaurantId,
  language,
  queriesEnabled,
  currencySymbol,
  from,
  to,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
  from: string;
  to: string;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const lang = language === "ar" ? "ar" : "en";
  const section = SECTION_TERMINOLOGY[lang];
  const isAr = lang === "ar";

  useDevQueryRuntimeLog("reporting.getBusinessMetricsSummary (refund)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
  });

  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = trpc.reporting.getBusinessMetricsSummary.useQuery(
    { restaurantId, from, to },
    reportingBusinessSummaryQueryOptions(queriesEnabled)
  );

  const { data: paymentAnalytics } =
    trpc.reporting.getPaymentMethodAnalytics.useQuery(
      { restaurantId, from, to },
      reportingBusinessSummaryQueryOptions(queriesEnabled)
    );

  const { data: trend } = trpc.reporting.getBusinessMetricsTrend.useQuery(
    { restaurantId, from, to, grouping: "day" },
    reportingBusinessSummaryQueryOptions(queriesEnabled)
  );

  const sym = resolveReportingCurrencySymbol(summary, currencySymbol || "ر.س");

  const paymentVm =
    paymentAnalytics != null
      ? buildPaymentMethodAnalysisViewModel({
          language: lang,
          analytics: paymentAnalytics,
        })
      : null;

  const refundTrendRows = useMemo(() => {
    if (!trend?.points?.length) return [];
    return trend.points.map((p) => ({
      periodLabel: p.periodKey,
      refundAmount: Number.parseFloat(p.refundPublishedTotal ?? "0") || 0,
      netSales: Number.parseFloat(p.netRevenue ?? "0") || 0,
    }));
  }, [trend]);

  if (isEmailNotVerifiedError(error)) {
    return (
      <RestaurantDashSection
        title={section.refundAnalytics}
        description={section.refundAnalyticsNote}
        ariaLabel={section.refundAnalytics}
      >
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  return (
    <RestaurantDashSection
      title={section.refundAnalytics}
      description={section.refundAnalyticsNote}
      ariaLabel={section.refundAnalytics}
    >
      {isLoading ? (
        <RestaurantKpiGridSkeleton count={4} />
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل تحليل المرتجعات. حاول مرة أخرى."
              : "Could not load refund analytics. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="space-y-4">
          <div className={restaurantDash.kpiGridSecondary}>
            <RestaurantKpiCard
              label={kpiDisplayName("refundPublishedTotal", lang)}
              value={formatSettlementRevenue(
                summary?.refundPublishedTotal ?? "0.00",
                sym
              )}
              icon={Wallet}
              tone="warning"
              valueVariant="revenue"
              emphasis="secondary"
            />
            <RestaurantKpiCard
              label={kpiDisplayName("netRevenue", lang)}
              value={formatSettlementRevenue(
                summary?.netRevenue ?? "0.00",
                sym
              )}
              icon={TrendingDown}
              tone="info"
              valueVariant="revenue"
              emphasis="secondary"
            />
            <RestaurantKpiCard
              label={kpiDisplayName("refundRate", lang)}
              value={`${summary?.refundRate ?? "0.00"}%`}
              icon={Percent}
              tone="warning"
              emphasis="supporting"
            />
            <RestaurantKpiCard
              label={kpiDisplayName("refundPublicationCount", lang)}
              value={summary?.refundPublicationCount ?? 0}
              icon={RotateCcw}
              tone="warning"
              emphasis="supporting"
            />
          </div>

          {refundTrendRows.length > 0 ? (
            <div className={restaurantDash.chartSupporting + " p-4"}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {isAr ? "اتجاه المرتجعات (داعم)" : "Refund trend (supporting)"}
              </h3>
              <p className="mb-3 text-[11px] text-slate-500">
                {isAr
                  ? "الرسم يوضح الاتجاه — الأرقام أعلاه هي المرجع للقرار."
                  : "Chart reinforces the story — KPI cards above remain the decision numbers."}
              </p>
              <div className="h-[160px] w-full sm:h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={refundTrendRows}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.08)"
                    />
                    <XAxis
                      dataKey="periodLabel"
                      stroke="rgba(255,255,255,0.45)"
                      fontSize={11}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={12}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.45)"
                      fontSize={11}
                      tickLine={false}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10, 14, 20, 0.95)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "10px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="refundAmount"
                      stroke="#f59e0b"
                      fill="rgba(245, 158, 11, 0.25)"
                      strokeWidth={2}
                      name={kpiDisplayName("refundPublishedTotal", lang)}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {paymentVm != null && paymentVm.refundRows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <p className="bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200">
                {section.refundPaymentMix}
              </p>
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-slate-800/40 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.paymentMethod}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.tenderAmount}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.transactions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentVm.refundRows.map((b) => (
                    <tr
                      key={b.paymentMethod}
                      className="border-t border-slate-700/40 text-slate-100"
                    >
                      <td className="px-3 py-2">{b.label}</td>
                      <td className="px-3 py-2">
                        {formatMoneyDisplay(b.tenderAmount, sym)}
                      </td>
                      <td className="px-3 py-2">{b.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <p className="rounded-lg border border-dashed border-slate-600/60 px-3 py-2 text-xs text-slate-400">
              {section.refundByOperatorPlaceholder}
            </p>
            <p className="rounded-lg border border-dashed border-slate-600/60 px-3 py-2 text-xs text-slate-400">
              {section.refundByRegisterPlaceholder}
            </p>
          </div>
        </div>
      )}
    </RestaurantDashSection>
  );
}
