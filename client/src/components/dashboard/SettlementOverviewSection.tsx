import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsSettlementSummaryQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import {
  formatAveragePaidSessionValue,
  formatComplimentaryRate,
  formatSettlementRevenue,
  isSettlementOverviewEmpty,
} from "@/lib/settlementOverviewDisplay";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Gift,
  Loader2,
  Percent,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";

const KPI_CARD_CLASS =
  "rounded-2xl border border-border/40 bg-[#161b22] p-6 sm:p-7";

function SettlementStatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "primary" | "accent" | "emerald" | "amber";
}) {
  const iconWrap =
    tone === "primary"
      ? "bg-primary/20 text-primary"
      : tone === "accent"
        ? "bg-violet-500/20 text-violet-400"
        : tone === "emerald"
          ? "bg-emerald-500/20 text-emerald-400"
          : tone === "amber"
            ? "bg-amber-500/20 text-amber-400"
            : "bg-blue-500/20 text-blue-400";

  return (
    <div className={KPI_CARD_CLASS}>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", iconWrap)}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-5 text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-base text-muted-foreground">{label}</p>
    </div>
  );
}

function SettlementStatSkeleton() {
  return (
    <div className={cn(KPI_CARD_CLASS, "animate-pulse")}>
      <div className="h-12 w-12 rounded-full bg-muted/40" />
      <div className="mt-5 h-10 w-24 rounded-lg bg-muted/40" />
      <div className="mt-2 h-4 w-32 rounded bg-muted/30" />
    </div>
  );
}

export function SettlementOverviewSection({
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
  const sectionTitle = isAr ? "نظرة التسوية" : "Settlement Overview";
  const sectionSub = isAr
    ? "إيرادات الجلسات المسددة والجلسات المجانية"
    : "Settled session revenue and complimentary activity";
  const ariaLabel = sectionTitle;
  const sym = currencySymbol || "ر.س";

  useDevQueryRuntimeLog("ops.getSettlementSummary", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = trpc.ops.getSettlementSummary.useQuery(
    { restaurantId },
    opsSettlementSummaryQueryOptions(queriesEnabled)
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

  const isFullyEmpty = !isLoading && !isError && summary != null && isSettlementOverviewEmpty(summary);
  const averageSessionValue = summary ? formatAveragePaidSessionValue(summary) : "—";

  return (
    <section className="flex flex-col gap-6 sm:gap-8" aria-label={ariaLabel}>
      <div className="space-y-2.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {sectionTitle}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{sectionSub}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 lg:gap-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <SettlementStatSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-[#161b22]/90 px-6 py-10 text-center sm:px-8">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <p className="max-w-md text-base text-muted-foreground">
            {isAr
              ? "تعذر تحميل مؤشرات التسوية. حاول مرة أخرى."
              : "Could not load settlement metrics. Please try again."}
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
                  ? "لا توجد جلسات مسددة بعد. ستظهر الإيرادات هنا بعد تسوية الجلسات."
                  : "No settled sessions yet. Revenue will appear here after sessions are settled."}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 lg:gap-5">
            <SettlementStatCard
              label={isAr ? "إيرادات مسددة" : "Settled Revenue"}
              value={formatSettlementRevenue(summary?.paidRevenue ?? "0.00", sym)}
              icon={DollarSign}
              tone="emerald"
            />
            <SettlementStatCard
              label={isAr ? "جلسات مدفوعة" : "Paid Sessions"}
              value={summary?.paidSessionCount ?? 0}
              icon={CheckCircle2}
              tone="primary"
            />
            <SettlementStatCard
              label={isAr ? "جلسات مجانية" : "Complimentary Sessions"}
              value={summary?.complimentarySessionCount ?? 0}
              icon={Gift}
              tone="accent"
            />
            <SettlementStatCard
              label={isAr ? "نسبة المجانية" : "Complimentary Rate"}
              value={summary ? formatComplimentaryRate(summary) : "—"}
              icon={Percent}
              tone="amber"
            />
            <SettlementStatCard
              label={isAr ? "متوسط قيمة الجلسة" : "Average Session Value"}
              value={
                averageSessionValue === "—" ? "—" : `${averageSessionValue} ${sym}`
              }
              icon={TrendingUp}
              tone="default"
            />
          </div>
        </>
      )}
    </section>
  );
}
