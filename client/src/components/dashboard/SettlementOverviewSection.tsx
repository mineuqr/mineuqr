import { useAuth } from "@/_core/hooks/useAuth";
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
import {
  CheckCircle2,
  DollarSign,
  Gift,
  Percent,
  TrendingUp,
} from "lucide-react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { RestaurantKpiCard, RestaurantKpiGridSkeleton } from "./RestaurantKpiCard";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";

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
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const isFullyEmpty = !isLoading && !isError && summary != null && isSettlementOverviewEmpty(summary);
  const averageSessionValue = summary ? formatAveragePaidSessionValue(summary) : "—";

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {isLoading ? (
        <RestaurantKpiGridSkeleton count={5} />
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل مؤشرات التسوية. حاول مرة أخرى."
              : "Could not load settlement metrics. Please try again."
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
                  ? "لا توجد جلسات مسددة بعد. ستظهر الإيرادات هنا بعد تسوية الجلسات."
                  : "No settled sessions yet. Revenue will appear here after sessions are settled."
              }
            />
          ) : null}

          <div className={restaurantDash.kpiGrid}>
            <RestaurantKpiCard
              label={isAr ? "إيرادات مسددة" : "Settled Revenue"}
              value={formatSettlementRevenue(summary?.paidRevenue ?? "0.00", sym)}
              icon={DollarSign}
              tone="success"
            />
            <RestaurantKpiCard
              label={isAr ? "جلسات مدفوعة" : "Paid Sessions"}
              value={summary?.paidSessionCount ?? 0}
              icon={CheckCircle2}
              tone="info"
            />
            <RestaurantKpiCard
              label={isAr ? "جلسات مجانية" : "Complimentary Sessions"}
              value={summary?.complimentarySessionCount ?? 0}
              icon={Gift}
              tone="accent"
            />
            <RestaurantKpiCard
              label={isAr ? "نسبة المجانية" : "Complimentary Rate"}
              value={summary ? formatComplimentaryRate(summary) : "—"}
              icon={Percent}
              tone="warning"
            />
            <RestaurantKpiCard
              label={isAr ? "متوسط قيمة الجلسة" : "Average Session Value"}
              value={averageSessionValue === "—" ? "—" : `${averageSessionValue} ${sym}`}
              icon={TrendingUp}
              tone="neutral"
            />
          </div>
        </>
      )}
    </RestaurantDashSection>
  );
}
