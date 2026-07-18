/**
 * REPORTING-PAYMENT-METHOD-ANALYTICS-1 — Dashboard Payment Method Analysis.
 * Presentation only. Values from reporting.getPaymentMethodAnalytics.
 * Labels from Product Semantics.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  reportingBusinessSummaryQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { formatMoneyDisplay } from "@/lib/reporting-exports/format";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import {
  preferredPaymentMethodLabel,
  SECTION_TERMINOLOGY,
} from "@shared/reporting-platform";
import { CreditCard } from "lucide-react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { RestaurantKpiCard, RestaurantKpiGridSkeleton } from "./RestaurantKpiCard";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";

export function PaymentMethodAnalysisSection({
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
  from?: string;
  to?: string;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const lang = language === "ar" ? "ar" : "en";
  const isAr = lang === "ar";
  const section = SECTION_TERMINOLOGY[lang];
  const sectionTitle = section.paymentMethodAnalysis;
  const sectionSub = section.paymentAnalyticsNote;
  const sym = currencySymbol || "ر.س";

  useDevQueryRuntimeLog("reporting.getPaymentMethodAnalytics", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
  });

  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = trpc.reporting.getPaymentMethodAnalytics.useQuery(
    { restaurantId, from, to },
    reportingBusinessSummaryQueryOptions(queriesEnabled)
  );

  if (isEmailNotVerifiedError(error)) {
    return (
      <RestaurantDashSection
        title={sectionTitle}
        description={sectionSub}
        ariaLabel={sectionTitle}
      >
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const empty =
    !isLoading &&
    !isError &&
    analytics != null &&
    analytics.buckets.length === 0 &&
    analytics.complimentaryAmount === "0.00";

  return (
    <RestaurantDashSection
      title={sectionTitle}
      description={sectionSub}
      ariaLabel={sectionTitle}
    >
      {isLoading ? (
        <RestaurantKpiGridSkeleton count={4} />
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل تحليل طرق الدفع. حاول مرة أخرى."
              : "Could not load payment method analysis. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : empty ? (
        <RestaurantSectionEmpty
          message={
            isAr
              ? "لا توجد معاملات تسوية في هذه الفترة."
              : "No settlement tenders in this period."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className={restaurantDash.kpiGrid}>
            <RestaurantKpiCard
              label={section.monetaryTenderTotal}
              value={formatMoneyDisplay(
                analytics?.monetaryTenderTotal ?? "0.00",
                sym
              )}
              icon={CreditCard}
              tone="success"
              valueVariant="revenue"
            />
            <RestaurantKpiCard
              label={preferredPaymentMethodLabel("complimentary", lang)}
              value={formatMoneyDisplay(
                analytics?.complimentaryAmount ?? "0.00",
                sym
              )}
              icon={CreditCard}
              tone="accent"
              valueVariant="revenue"
            />
          </div>
          {analytics && analytics.buckets.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-800/60 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.paymentMethod}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.tenderAmount}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.checksByMethod}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.averageCheckByMethod}
                    </th>
                    <th className="px-3 py-2 text-start font-medium">
                      {section.mixPercent}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.buckets.map((b) => (
                    <tr
                      key={b.paymentMethod}
                      className="border-t border-slate-700/40 text-slate-100"
                    >
                      <td className="px-3 py-2">
                        {preferredPaymentMethodLabel(b.paymentMethod, lang)}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoneyDisplay(b.tenderAmount, sym)}
                      </td>
                      <td className="px-3 py-2">{b.checkCount}</td>
                      <td className="px-3 py-2">
                        {formatMoneyDisplay(b.averageCheck, sym)}
                      </td>
                      <td className="px-3 py-2">{b.mixPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </RestaurantDashSection>
  );
}
