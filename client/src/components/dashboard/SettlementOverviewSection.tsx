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
  isSettlementOverviewEmpty,
  resolveReportingCurrencySymbol,
} from "@/lib/settlementOverviewDisplay";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";
import {
  CheckCircle2,
  DollarSign,
  Gift,
  Percent,
  TrendingUp,
} from "lucide-react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { SemanticKpiCard, SemanticKpiSkeleton } from "@/design-system/semantic-card";
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
  from,
  to,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
  /** Required period bounds — no lifetime leakage (REPORTING-UX-RATIONALIZATION-1). */
  from: string;
  to: string;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const lang = language === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const sectionTitle = SECTION_TERMINOLOGY[lang].advancedFinancial;
  const sectionSub = SECTION_TERMINOLOGY[lang].advancedFinancialNote;
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
    { restaurantId, from, to },
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
        <SemanticKpiSkeleton count={5} />
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل المؤشرات المالية. حاول مرة أخرى."
              : "Could not load financial metrics. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : isFullyEmpty ? (
        <RestaurantSectionEmpty
          message={
            isAr
              ? "لا توجد شيكات مسددة في هذه الفترة."
              : "No settled checks in this period."
          }
        />
      ) : (
        <div className={restaurantDash.kpiGrid}>
          <SemanticKpiCard
            label={kpiDisplayName("paidCheckCount", lang)}
            value={summary?.paidCheckCount ?? 0}
            icon={CheckCircle2}
            tone="info"
          />
          <SemanticKpiCard
            label={kpiDisplayName("averageCheck", lang)}
            value={averageCheck === "—" ? "—" : `${averageCheck} ${sym}`}
            icon={TrendingUp}
            tone="neutral"
            valueVariant="revenue"
          />
          <SemanticKpiCard
            label={kpiDisplayName("complimentaryCount", lang)}
            value={summary?.complimentaryCount ?? 0}
            icon={Gift}
            tone="accent"
          />
          <SemanticKpiCard
            label={isAr ? "نسبة المجانية" : "Complimentary Rate"}
            value={summary ? formatComplimentaryRate(summary) : "—"}
            icon={Percent}
            tone="warning"
          />
          <SemanticKpiCard
            label={kpiDisplayName("voidedCount", lang)}
            value={summary?.voidedCount ?? 0}
            icon={DollarSign}
            tone="warning"
          />
        </div>
      )}
    </RestaurantDashSection>
  );
}
