import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingBusinessTrendQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import {
  buildSettlementTrendChartRows,
  findHighestComplimentaryPeriod,
  findHighestRevenuePeriod,
  findHighestSettlementPeriod,
  isSettlementTrendEmpty,
  type SettlementTrendChartRow,
  type SettlementTrendGrouping,
} from "@/lib/settlementTrendDisplay";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Gift,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash, restaurantHoverGlow, restaurantSemantic } from "./restaurantDashStyles";
import { SemanticKpiCard } from "@/design-system/semantic-card";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";
import {
  REPORTING_CATEGORY_HEX,
  reportingCategoryFill,
} from "@/lib/reporting-exports/reportingExecutiveColors";

const PANEL_CLASS = cn(restaurantDash.panel, "p-4 sm:p-5", restaurantHoverGlow);
const GROUPING_OPTIONS: SettlementTrendGrouping[] = ["day", "week", "month"];

function groupingLabel(grouping: SettlementTrendGrouping, isAr: boolean): string {
  if (grouping === "day") return isAr ? "يومي" : "Daily";
  if (grouping === "week") return isAr ? "أسبوعي" : "Weekly";
  return isAr ? "شهري" : "Monthly";
}

function SettlementTrendChart({
  title,
  data,
  dataKey,
  stroke,
  fill,
  valueFormatter,
  isAr,
}: {
  title: string;
  data: SettlementTrendChartRow[];
  dataKey: keyof Pick<
    SettlementTrendChartRow,
    "paidRevenue" | "paidSessionCount" | "complimentarySessionCount" | "complimentaryRate"
  >;
  stroke: string;
  fill: string;
  valueFormatter: (value: number) => string;
  isAr: boolean;
}) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  return (
    <div className={PANEL_CLASS}>
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-white sm:text-base">
        {title}
      </h3>
      {data.length === 0 ? (
        <div
          className="flex h-[200px] items-center justify-center px-4 text-center text-sm text-slate-400 sm:h-[240px]"
          role="status"
        >
          {isAr
            ? "لا توجد بيانات كافية لعرض هذا الاتجاه بعد."
            : "Not enough data to show this trend yet."}
        </div>
      ) : (
        <div className="h-[200px] w-full min-w-0 sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
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
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                }}
                labelStyle={{ color: "rgba(255,255,255,0.85)", marginBottom: 4 }}
                itemStyle={{ color: stroke }}
                formatter={(value: number) => [valueFormatter(value), title]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={stroke}
                fill={fill}
                strokeWidth={2}
                isAnimationActive={!reduceMotion}
                animationDuration={450}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function TrendChartSkeleton() {
  return (
    <div className={cn(PANEL_CLASS, "motion-safe:animate-pulse")}>
      <div className="mb-4 h-5 w-36 rounded bg-slate-700/50" />
      <div className="h-[200px] rounded-xl bg-slate-800/40 sm:h-[240px]" />
    </div>
  );
}

function TrendInsightCard({
  title,
  periodLabel,
  valueLabel,
  icon: Icon,
  emptyText,
  revenueValue = false,
}: {
  title: string;
  periodLabel: string | null;
  valueLabel: string | null;
  icon: typeof Wallet;
  emptyText: string;
  revenueValue?: boolean;
}) {
  return (
    <SemanticKpiCard
      label={title}
      value={periodLabel && valueLabel ? periodLabel : emptyText}
      hint={periodLabel && valueLabel ? valueLabel : undefined}
      icon={Icon}
      tone={revenueValue ? "success" : "info"}
      valueVariant={revenueValue ? "revenue" : "operational"}
    />
  );
}

function TrendInsightSkeleton() {
  return (
    <div className={cn(PANEL_CLASS, "motion-safe:animate-pulse")}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-700/50" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-slate-700/40" />
          <div className="h-5 w-24 rounded bg-slate-700/50" />
        </div>
      </div>
    </div>
  );
}

export function SettlementTrendsSection({
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
  /** Required period bounds — no lifetime leakage. */
  from: string;
  to: string;
  sectionId?: string;
  emphasized?: boolean;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const isAr = language === "ar";
  const lang = isAr ? "ar" : "en";
  const sym = currencySymbol || "ر.س";
  const [grouping, setGrouping] = useState<SettlementTrendGrouping>("day");
  const sectionTitle = SECTION_TERMINOLOGY[lang].checkRevenueTrends;
  const sectionSub = isAr
    ? "تطور إجمالي المبيعات عبر الزمن للفترة المحددة — ليست مبيعات الطلبات"
    : "How Total Sales changes over the selected period — not Sales Orders";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("reporting.getBusinessMetricsTrend", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: trend,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = trpc.reporting.getBusinessMetricsTrend.useQuery(
    { restaurantId, from, to, grouping },
    reportingBusinessTrendQueryOptions(queriesEnabled)
  );

  const chartRows = useMemo(
    () => (trend ? buildSettlementTrendChartRows(trend, language) : []),
    [trend, language]
  );

  const revenueInsight = useMemo(
    () => findHighestRevenuePeriod(chartRows, sym),
    [chartRows, sym]
  );
  const settlementInsight = useMemo(
    () => findHighestSettlementPeriod(chartRows),
    [chartRows]
  );
  const complimentaryInsight = useMemo(
    () => findHighestComplimentaryPeriod(chartRows),
    [chartRows]
  );

  if (isEmailNotVerifiedError(error)) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const isFullyEmpty = !isLoading && !isError && trend != null && isSettlementTrendEmpty(trend);
  const noInsightText = isAr ? "لا توجد فترة بارزة بعد" : "No standout period yet";

  const groupingControls = (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={isAr ? "تجميع الاتجاه" : "Trend grouping"}
    >
      {GROUPING_OPTIONS.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={grouping === option ? "default" : "outline"}
          className={cn(
            "min-w-[4.5rem]",
            grouping === option ? restaurantDash.toolbarBtnActive : restaurantDash.toolbarBtn
          )}
          onClick={() => setGrouping(option)}
        >
          {groupingLabel(option, isAr)}
        </Button>
      ))}
    </div>
  );

  return (
    <RestaurantDashSection
      id={sectionId}
      title={sectionTitle}
      description={sectionSub}
      ariaLabel={ariaLabel}
      headerAside={groupingControls}
      className={cn(
        emphasized &&
          "rounded-2xl ring-2 ring-teal-400/35 ring-offset-2 ring-offset-slate-950"
      )}
    >
      {isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <TrendChartSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
            {[0, 1, 2].map((i) => (
              <TrendInsightSkeleton key={i} />
            ))}
          </div>
        </>
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل اتجاهات المبيعات. حاول مرة أخرى."
              : "Could not load sales trends. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {isFullyEmpty ? (
            <RestaurantSectionEmpty
              message={
                isAr
                  ? "لا توجد مبيعات كافية لعرض الاتجاهات بعد. ابدأ بتسجيل الطلبات وستظهر الرسوم هنا."
                  : "Not enough sales yet to show trends. Once orders are recorded, charts will appear here."
              }
            />
          ) : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
            <SettlementTrendChart
              title={isAr ? "اتجاه إجمالي المبيعات" : "Total Sales Trend"}
              data={chartRows}
              dataKey="paidRevenue"
              stroke={REPORTING_CATEGORY_HEX.net}
              fill={reportingCategoryFill("net", 0.2)}
              valueFormatter={(value) => `${value.toFixed(2)} ${sym}`}
              isAr={isAr}
            />
            <SettlementTrendChart
              title={isAr ? "اتجاه الشيكات المدفوعة" : "Paid Checks Trend"}
              data={chartRows}
              dataKey="paidSessionCount"
              stroke={REPORTING_CATEGORY_HEX.orders}
              fill={reportingCategoryFill("orders", 0.2)}
              valueFormatter={(value) => String(Math.round(value))}
              isAr={isAr}
            />
            <SettlementTrendChart
              title={isAr ? "اتجاه الشيكات المجانية" : "Complimentary Checks Trend"}
              data={chartRows}
              dataKey="complimentarySessionCount"
              stroke={REPORTING_CATEGORY_HEX.tax}
              fill={reportingCategoryFill("tax", 0.2)}
              valueFormatter={(value) => String(Math.round(value))}
              isAr={isAr}
            />
            <SettlementTrendChart
              title={isAr ? "اتجاه نسبة المجانية" : "Complimentary Rate Trend"}
              data={chartRows}
              dataKey="complimentaryRate"
              stroke={REPORTING_CATEGORY_HEX.neutral}
              fill={reportingCategoryFill("neutral", 0.2)}
              valueFormatter={(value) => `${value.toFixed(1)}%`}
              isAr={isAr}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-5 w-5", restaurantSemantic.iconInfo)} aria-hidden />
              <h3 className="text-sm font-semibold text-white sm:text-base">
                {isAr ? "رؤى المبيعات" : "Sales Insights"}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
              <TrendInsightCard
                title={
                  isAr ? "أعلى فترة لإجمالي المبيعات" : "Highest Total Sales Period"
                }
                periodLabel={revenueInsight?.periodLabel ?? null}
                valueLabel={revenueInsight?.valueLabel ?? null}
                icon={Wallet}
                emptyText={noInsightText}
                revenueValue
              />
              <TrendInsightCard
                title={isAr ? "أعلى فترة نشاط" : "Highest Activity Period"}
                periodLabel={settlementInsight?.periodLabel ?? null}
                valueLabel={
                  settlementInsight
                    ? isAr
                      ? `${settlementInsight.valueLabel} جلسة`
                      : `${settlementInsight.valueLabel} sessions`
                    : null
                }
                icon={CalendarDays}
                emptyText={noInsightText}
              />
              <TrendInsightCard
                title={isAr ? "أعلى فترة مجانية" : "Highest Complimentary Period"}
                periodLabel={complimentaryInsight?.periodLabel ?? null}
                valueLabel={
                  complimentaryInsight
                    ? isAr
                      ? `${complimentaryInsight.valueLabel} جلسة`
                      : `${complimentaryInsight.valueLabel} sessions`
                    : null
                }
                icon={Gift}
                emptyText={noInsightText}
              />
            </div>
          </div>
        </>
      )}
    </RestaurantDashSection>
  );
}
