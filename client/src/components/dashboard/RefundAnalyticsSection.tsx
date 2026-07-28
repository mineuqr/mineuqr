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
import { SemanticKpiCard, SemanticKpiSkeleton } from "@/design-system/semantic-card";
import {
  SemanticTableScroll,
  SemanticTableRoot,
  SemanticTableHeader,
  SemanticTableBody,
  SemanticTableRow,
  SemanticTableHead,
  SemanticTableCell,
} from "@/design-system/semantic-table";
import { RestaurantSectionError } from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";
import { cn } from "@/lib/utils";
import {
  REPORTING_CATEGORY_HEX,
  reportingCategoryFill,
} from "@/lib/reporting-exports/reportingExecutiveColors";

export function RefundAnalyticsSection({
  restaurantId,
  language,
  queriesEnabled,
  currencySymbol,
  from,
  to,
  sectionId,
  emphasized,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
  from: string;
  to: string;
  sectionId?: string;
  emphasized?: boolean;
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
      id={sectionId}
      title={section.refundAnalytics}
      description={section.refundAnalyticsNote}
      ariaLabel={section.refundAnalytics}
      className={cn(
        emphasized &&
          "rounded-2xl ring-2 ring-rose-400/40 ring-offset-2 ring-offset-slate-950"
      )}
    >
      {isLoading ? (
        <SemanticKpiSkeleton count={4} />
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
            <SemanticKpiCard
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
            <SemanticKpiCard
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
            <SemanticKpiCard
              label={kpiDisplayName("refundRate", lang)}
              value={`${summary?.refundRate ?? "0.00"}%`}
              icon={Percent}
              tone="warning"
              emphasis="supporting"
            />
            <SemanticKpiCard
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
                {isAr ? "اتجاه المرتجعات" : "Refund Trend"}
              </h3>
              <p className="mb-3 text-[11px] text-slate-500">
                {isAr
                  ? "الرسم يدعم القصة — الأرقام أعلاه هي مرجع القرار."
                  : "The chart supports the story — the numbers above remain the decision reference."}
              </p>
              <div className="h-[160px] w-full min-w-0 sm:h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={refundTrendRows}
                    margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="periodLabel"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={16}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10, 14, 20, 0.96)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "12px",
                        padding: "8px 12px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="refundAmount"
                      stroke={REPORTING_CATEGORY_HEX.refund}
                      fill={reportingCategoryFill("refund", 0.22)}
                      strokeWidth={2}
                      name={kpiDisplayName("refundPublishedTotal", lang)}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={450}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {paymentVm != null && paymentVm.refundRows.length > 0 ? (
            <SemanticTableScroll className="rounded-lg border-slate-700/50">
              <p className="bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200">
                {section.refundPaymentMix}
              </p>
              <SemanticTableRoot density="ledger" className="min-w-[480px]">
                <SemanticTableHeader density="ledger" className="bg-slate-800/40 text-slate-300">
                  <SemanticTableRow density="ledger">
                    <SemanticTableHead density="ledger">
                      {section.paymentMethod}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {section.tenderAmount}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {section.transactions}
                    </SemanticTableHead>
                  </SemanticTableRow>
                </SemanticTableHeader>
                <SemanticTableBody>
                  {paymentVm.refundRows.map((b) => (
                    <SemanticTableRow
                      key={b.paymentMethod}
                      density="ledger"
                      className="text-slate-100"
                    >
                      <SemanticTableCell density="ledger">{b.label}</SemanticTableCell>
                      <SemanticTableCell density="ledger">
                        {formatMoneyDisplay(b.tenderAmount, sym)}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">{b.transactionCount}</SemanticTableCell>
                    </SemanticTableRow>
                  ))}
                </SemanticTableBody>
              </SemanticTableRoot>
            </SemanticTableScroll>
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
