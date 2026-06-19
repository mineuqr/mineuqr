import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsSettlementTrendQueryOptions,
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
  AlertTriangle,
  CalendarDays,
  Gift,
  Loader2,
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

const PANEL_CLASS = "rounded-2xl border border-border/40 bg-[#161b22] p-5 sm:p-6";
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
  return (
    <div className={PANEL_CLASS}>
      <h3 className="mb-4 text-sm font-semibold text-foreground sm:text-base">{title}</h3>
      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground sm:h-[260px]">
          {isAr ? "لا توجد بيانات للعرض" : "No data to display"}
        </div>
      ) : (
        <div className="h-[220px] w-full sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
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
                labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                formatter={(value: number) => [valueFormatter(value), title]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={stroke}
                fill={fill}
                strokeWidth={2}
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
    <div className={cn(PANEL_CLASS, "animate-pulse")}>
      <div className="mb-4 h-5 w-36 rounded bg-muted/40" />
      <div className="h-[220px] rounded-xl bg-muted/20 sm:h-[260px]" />
    </div>
  );
}

function TrendInsightCard({
  title,
  periodLabel,
  valueLabel,
  icon: Icon,
  emptyText,
}: {
  title: string;
  periodLabel: string | null;
  valueLabel: string | null;
  icon: typeof Wallet;
  emptyText: string;
}) {
  return (
    <div className={PANEL_CLASS}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {periodLabel && valueLabel ? (
            <>
              <p className="mt-1 truncate text-lg font-semibold text-foreground">{periodLabel}</p>
              <p className="mt-1 text-base tabular-nums text-emerald-400">{valueLabel}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendInsightSkeleton() {
  return (
    <div className={cn(PANEL_CLASS, "animate-pulse")}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-muted/40" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-muted/30" />
          <div className="h-5 w-24 rounded bg-muted/40" />
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
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const isAr = language === "ar";
  const sym = currencySymbol || "ر.س";
  const [grouping, setGrouping] = useState<SettlementTrendGrouping>("day");
  const sectionTitle = isAr ? "اتجاهات التسوية" : "Settlement Trends";
  const sectionSub = isAr
    ? "تطور الإيرادات والجلسات المسددة عبر الزمن"
    : "How settled revenue and sessions change over time";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getSettlementTrend", {
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
  } = trpc.ops.getSettlementTrend.useQuery(
    { restaurantId, grouping },
    opsSettlementTrendQueryOptions(queriesEnabled)
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
      <section className="flex flex-col gap-6 sm:gap-8" aria-label={ariaLabel}>
        <div className="space-y-2.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {sectionTitle}
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{sectionSub}</p>
        </div>
        <VerificationRequiredPanel variant="orders" compact />
      </section>
    );
  }

  const isFullyEmpty = !isLoading && !isError && trend != null && isSettlementTrendEmpty(trend);
  const noInsightText = isAr ? "لا توجد فترة بارزة بعد" : "No standout period yet";

  return (
    <section className="flex flex-col gap-6 sm:gap-8" aria-label={ariaLabel}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {sectionTitle}
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{sectionSub}</p>
        </div>

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
                grouping !== option && "border-border/60 bg-transparent"
              )}
              onClick={() => setGrouping(option)}
            >
              {groupingLabel(option, isAr)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            {[0, 1, 2, 3].map((i) => (
              <TrendChartSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
            {[0, 1, 2].map((i) => (
              <TrendInsightSkeleton key={i} />
            ))}
          </div>
        </>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-[#161b22]/90 px-6 py-10 text-center sm:px-8">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <p className="max-w-md text-base text-muted-foreground">
            {isAr
              ? "تعذر تحميل اتجاهات التسوية. حاول مرة أخرى."
              : "Could not load settlement trends. Please try again."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-border/60"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isAr ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      ) : (
        <>
          {isFullyEmpty ? (
            <div className="rounded-2xl border border-border/40 bg-[#161b22]/50 px-6 py-8 text-center sm:px-8">
              <p className="text-base text-muted-foreground">
                {isAr
                  ? "لا توجد جلسات مسددة لعرض الاتجاهات بعد."
                  : "No settled sessions yet to show trends."}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <SettlementTrendChart
              title={isAr ? "اتجاه الإيرادات" : "Revenue Trend"}
              data={chartRows}
              dataKey="paidRevenue"
              stroke="#34d399"
              fill="#34d39930"
              valueFormatter={(value) => `${value.toFixed(2)} ${sym}`}
              isAr={isAr}
            />
            <SettlementTrendChart
              title={isAr ? "اتجاه الجلسات المدفوعة" : "Paid Sessions Trend"}
              data={chartRows}
              dataKey="paidSessionCount"
              stroke="#22d3ee"
              fill="#22d3ee30"
              valueFormatter={(value) => String(Math.round(value))}
              isAr={isAr}
            />
            <SettlementTrendChart
              title={isAr ? "اتجاه الجلسات المجانية" : "Complimentary Sessions Trend"}
              data={chartRows}
              dataKey="complimentarySessionCount"
              stroke="#a78bfa"
              fill="#a78bfa30"
              valueFormatter={(value) => String(Math.round(value))}
              isAr={isAr}
            />
            <SettlementTrendChart
              title={isAr ? "اتجاه نسبة المجانية" : "Complimentary Rate Trend"}
              data={chartRows}
              dataKey="complimentaryRate"
              stroke="#fbbf24"
              fill="#fbbf2430"
              valueFormatter={(value) => `${value.toFixed(1)}%`}
              isAr={isAr}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">
                {isAr ? "رؤى تشغيلية" : "Operational Insights"}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
              <TrendInsightCard
                title={isAr ? "أعلى فترة إيرادات" : "Highest Revenue Period"}
                periodLabel={revenueInsight?.periodLabel ?? null}
                valueLabel={revenueInsight?.valueLabel ?? null}
                icon={Wallet}
                emptyText={noInsightText}
              />
              <TrendInsightCard
                title={isAr ? "أعلى فترة تسوية" : "Highest Settlement Period"}
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
    </section>
  );
}
