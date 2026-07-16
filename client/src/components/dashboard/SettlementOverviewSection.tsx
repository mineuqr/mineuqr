import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingBusinessSummaryQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import {
  formatAverageCheck,
  formatComplimentaryRate,
  formatSettlementRevenue,
  isSettlementOverviewEmpty,
  resolveReportingCurrencySymbol,
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
  const sectionTitle = isAr ? "نظرة الإيرادات" : "Revenue Overview";
  const sectionSub = isAr
    ? "إيرادات الشيكات المدفوعة والعمليات المجانية والملغاة"
    : "Paid Check revenue, complimentary, and voided activity";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("reporting.getBusinessMetricsSummary", {
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
  } = trpc.reporting.getBusinessMetricsSummary.useQuery(
    { restaurantId },
    reportingBusinessSummaryQueryOptions(queriesEnabled)
  );

  const sym = resolveReportingCurrencySymbol(summary, currencySymbol || "ر.س");

  if (isEmailNotVerifiedError(error)) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const isFullyEmpty =
    !isLoading && !isError && summary != null && isSettlementOverviewEmpty(summary);
  const averageCheck = summary ? formatAverageCheck(summary) : "—";

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {isLoading ? (
        <RestaurantKpiGridSkeleton count={5} />
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل مؤشرات الإيرادات. حاول مرة أخرى."
              : "Could not load revenue metrics. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : isFullyEmpty ? (
        <RestaurantSectionEmpty
          message={
            isAr
              ? "لا توجد شيكات مسددة بعد. ستظهر الإيرادات هنا بعد دفع الشيكات."
              : "No settled checks yet. Revenue will appear here after checks are paid."
          }
        />
      ) : (
        <div className={restaurantDash.kpiGrid}>
          <RestaurantKpiCard
            label={isAr ? "الإيرادات" : "Revenue"}
            value={formatSettlementRevenue(summary?.revenue ?? "0.00", sym)}
            icon={DollarSign}
            tone="success"
            valueVariant="revenue"
          />
          <RestaurantKpiCard
            label={isAr ? "شيكات مدفوعة" : "Paid Checks"}
            value={summary?.paidCheckCount ?? 0}
            icon={CheckCircle2}
            tone="info"
          />
          <RestaurantKpiCard
            label={isAr ? "شيكات مجانية" : "Complimentary Checks"}
            value={summary?.complimentaryCount ?? 0}
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
            label={isAr ? "متوسط الشيك" : "Average Check"}
            value={averageCheck === "—" ? "—" : `${averageCheck} ${sym}`}
            icon={TrendingUp}
            tone="neutral"
            valueVariant="revenue"
          />
        </div>
      )}
    </RestaurantDashSection>
  );
}
