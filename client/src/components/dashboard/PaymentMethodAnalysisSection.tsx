/**
 * REPORTING-PAYMENT-METHOD-ANALYTICS-1 / PRESENTATION-ADOPTION-1
 * Dashboard Payment Method Analysis — Reporting DTO only, shared view model.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  reportingBusinessSummaryQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { formatMoneyDisplay } from "@/lib/reporting-exports/format";
import { buildPaymentMethodAnalysisViewModel } from "@/lib/reporting-exports/paymentMethodAnalysisPresentation";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";
import { toCanonicalPaymentMethod } from "@shared/operational-session";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { RestaurantKpiCard, RestaurantKpiGridSkeleton } from "./RestaurantKpiCard";
import { RestaurantSectionError } from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";
import {
  REPORTING_CATEGORY_HEX,
  reportingCategoryFill,
} from "@/lib/reporting-exports/reportingExecutiveColors";

export function PaymentMethodAnalysisSection({
  restaurantId,
  language,
  queriesEnabled,
  currencySymbol,
  from,
  to,
  sectionId,
  highlightCanonical,
  emphasized,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
  from?: string;
  to?: string;
  sectionId?: string;
  /** Smart drill-down: emphasize cash or card tender rows. */
  highlightCanonical?: "cash" | "card" | null;
  emphasized?: boolean;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const lang = language === "ar" ? "ar" : "en";
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

  const vm =
    analytics != null
      ? buildPaymentMethodAnalysisViewModel({ language: lang, analytics })
      : null;

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

  return (
    <RestaurantDashSection
      id={sectionId}
      title={sectionTitle}
      description={sectionSub}
      ariaLabel={sectionTitle}
      className={cn(
        emphasized &&
          "rounded-2xl ring-2 ring-sky-400/35 ring-offset-2 ring-offset-slate-950"
      )}
    >
      {isLoading ? (
        <RestaurantKpiGridSkeleton count={4} />
      ) : isError ? (
        <RestaurantSectionError
          message={section.paymentAnalyticsLoadError}
          retryLabel={lang === "ar" ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : vm == null ? null : (
        <div className="space-y-4">
          {!vm.hasActivity ? (
            <p className="text-sm text-slate-400" role="status">
              {vm.emptyMessage}
            </p>
          ) : null}
          <div className={restaurantDash.kpiGrid}>
            <RestaurantKpiCard
              label={section.monetaryTenderTotal}
              value={formatMoneyDisplay(vm.monetaryTenderTotal, sym)}
              icon={CreditCard}
              tone="success"
              valueVariant="revenue"
            />
            <RestaurantKpiCard
              label={vm.complimentaryLabel}
              value={formatMoneyDisplay(vm.complimentaryAmount, sym)}
              icon={CreditCard}
              tone="accent"
              valueVariant="revenue"
            />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="w-full min-w-[640px] text-sm">
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
                  <th className="px-3 py-2 text-start font-medium">
                    {section.transactions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {vm.rows.map((b) => {
                  const canonical = toCanonicalPaymentMethod(b.paymentMethod);
                  const isHit =
                    highlightCanonical != null &&
                    canonical === highlightCanonical;
                  const rowTint =
                    canonical === "cash"
                      ? REPORTING_CATEGORY_HEX.cash
                      : canonical === "card"
                        ? REPORTING_CATEGORY_HEX.card
                        : REPORTING_CATEGORY_HEX.neutral;
                  return (
                    <tr
                      key={b.paymentMethod}
                      className={cn(
                        "border-t border-slate-700/40 text-slate-100 motion-safe:transition-colors",
                        isHit && "bg-sky-500/10"
                      )}
                      style={
                        isHit
                          ? {
                              boxShadow: `inset 3px 0 0 ${rowTint}`,
                              backgroundColor: reportingCategoryFill(
                                canonical === "cash" ? "cash" : "card",
                                0.12
                              ),
                            }
                          : undefined
                      }
                    >
                      <td className="px-3 py-2 font-medium">{b.label}</td>
                      <td className="px-3 py-2">
                        {formatMoneyDisplay(b.tenderAmount, sym)}
                      </td>
                      <td className="px-3 py-2">{b.checkCount}</td>
                      <td className="px-3 py-2">
                        {formatMoneyDisplay(b.averageCheck, sym)}
                      </td>
                      <td className="px-3 py-2">{b.mixPercent}%</td>
                      <td className="px-3 py-2">{b.transactionCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </RestaurantDashSection>
  );
}
