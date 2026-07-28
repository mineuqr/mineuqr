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
        <SemanticKpiSkeleton
          count={2}
          gridClassName={restaurantDash.kpiGridSecondary}
        />
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
          <div className={restaurantDash.kpiGridSecondary}>
            <SemanticKpiCard
              label={section.monetaryTenderTotal}
              value={formatMoneyDisplay(vm.monetaryTenderTotal, sym)}
              icon={CreditCard}
              tone="success"
              domain="payments"
              valueVariant="revenue"
            />
            <SemanticKpiCard
              label={vm.complimentaryLabel}
              value={formatMoneyDisplay(vm.complimentaryAmount, sym)}
              icon={CreditCard}
              tone="accent"
              domain="payments"
              valueVariant="revenue"
            />
          </div>
          <SemanticTableScroll className="rounded-lg border-slate-700/50">
            <SemanticTableRoot density="ledger">
              <SemanticTableHeader density="ledger" className="bg-slate-800/60 text-slate-300">
                <SemanticTableRow density="ledger">
                  <SemanticTableHead density="ledger">
                    {section.paymentMethod}
                  </SemanticTableHead>
                  <SemanticTableHead density="ledger">
                    {section.tenderAmount}
                  </SemanticTableHead>
                  <SemanticTableHead density="ledger">
                    {section.checksByMethod}
                  </SemanticTableHead>
                  <SemanticTableHead density="ledger">
                    {section.averageCheckByMethod}
                  </SemanticTableHead>
                  <SemanticTableHead density="ledger">
                    {section.mixPercent}
                  </SemanticTableHead>
                  <SemanticTableHead density="ledger">
                    {section.transactions}
                  </SemanticTableHead>
                </SemanticTableRow>
              </SemanticTableHeader>
              <SemanticTableBody>
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
                    <SemanticTableRow
                      key={b.paymentMethod}
                      density="ledger"
                      className={cn(
                        "text-slate-100 motion-safe:transition-colors",
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
                      <SemanticTableCell density="ledger" className="font-medium">
                        {b.label}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">
                        {formatMoneyDisplay(b.tenderAmount, sym)}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">{b.checkCount}</SemanticTableCell>
                      <SemanticTableCell density="ledger">
                        {formatMoneyDisplay(b.averageCheck, sym)}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">{b.mixPercent}%</SemanticTableCell>
                      <SemanticTableCell density="ledger">{b.transactionCount}</SemanticTableCell>
                    </SemanticTableRow>
                  );
                })}
              </SemanticTableBody>
            </SemanticTableRoot>
          </SemanticTableScroll>
        </div>
      )}
    </RestaurantDashSection>
  );
}
