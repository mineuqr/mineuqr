import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  reportingBusinessSummaryQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { kpiDisplayName } from "@/lib/reporting/kpiDisplay";
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
  const lang = language === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const sectionTitle = isAr ? "نظرة إيرادات الشيكات" : "Check Revenue Overview";
  const sectionSub = isAr
    ? "مجموع الشيكات المدفوعة — ليست مبيعات الطلبات"
    : "Paid Check totals — not Order Sales";
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
              ? "تعذر تحميل مؤشرات إيرادات الشيكات. حاول مرة أخرى."
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
              ? "لا توجد شيكات مسددة بعد. ستظهر إيرادات الشيكات هنا بعد الدفع."
              : "No settled checks yet. Check Revenue will appear here after checks are paid."
          }
        />
      ) : (
        <div className={restaurantDash.kpiGrid}>
          <RestaurantKpiCard
            label={kpiDisplayName("revenue", lang)}
            value={formatSettlementRevenue(summary?.revenue ?? "0.00", sym)}
            icon={DollarSign}
            tone="success"
            valueVariant="revenue"
          />
          <RestaurantKpiCard
            label={kpiDisplayName("paidCheckCount", lang)}
            value={summary?.paidCheckCount ?? 0}
            icon={CheckCircle2}
            tone="info"
          />
          <RestaurantKpiCard
            label={kpiDisplayName("complimentaryCount", lang)}
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
            label={kpiDisplayName("averageCheck", lang)}
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
