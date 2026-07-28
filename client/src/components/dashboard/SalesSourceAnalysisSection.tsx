/**
 * REPORTING-SALES-CHANNEL-ANALYTICS-1 — Sales Source Analysis (presentation).
 * Binds SalesChannelAnalyticsDto only. Never invents totals or mix %.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  reportingBusinessSummaryQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { formatMoneyDisplay } from "@/lib/reporting-exports/format";
import {
  buildSalesSourceAnalysisVmFromDto,
} from "@/lib/reporting-exports/salesSourceAnalysisPresentation";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantDashSection } from "./RestaurantDashSection";
import { SemanticKpiSkeleton } from "@/design-system/semantic-card";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";

export function SalesSourceAnalysisSection({
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
  from?: string;
  to?: string;
  sectionId?: string;
  emphasized?: boolean;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const lang = language === "ar" ? "ar" : "en";
  const sym = currencySymbol || "ر.س";

  useDevQueryRuntimeLog("reporting.getSalesChannelAnalytics", {
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
  } = trpc.reporting.getSalesChannelAnalytics.useQuery(
    { restaurantId, from, to },
    reportingBusinessSummaryQueryOptions(queriesEnabled)
  );

  if (isEmailNotVerifiedError(error)) {
    return (
      <RestaurantDashSection
        id={sectionId}
        title={lang === "ar" ? "تحليل مصدر المبيعات" : "Sales Source Analysis"}
        description={
          lang === "ar"
            ? "المبيعات حسب قناة الطلب — من منصة التقارير."
            : "Sales by ordering channel — Reporting Platform."
        }
        ariaLabel={
          lang === "ar" ? "تحليل مصدر المبيعات" : "Sales Source Analysis"
        }
      >
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const vm =
    analytics != null
      ? buildSalesSourceAnalysisVmFromDto({ language: lang, analytics })
      : null;

  return (
    <RestaurantDashSection
      id={sectionId}
      title={
        vm?.title ??
        (lang === "ar" ? "تحليل مصدر المبيعات" : "Sales Source Analysis")
      }
      description={
        vm?.description ??
        (lang === "ar"
          ? "المبيعات حسب قناة الطلب للفترة المحددة — من حقائق التقارير فقط."
          : "Sales by ordering channel for the selected period — reporting facts only.")
      }
      ariaLabel={
        vm?.title ??
        (lang === "ar" ? "تحليل مصدر المبيعات" : "Sales Source Analysis")
      }
      className={cn(
        emphasized &&
          "rounded-2xl ring-2 ring-orange-400/35 ring-offset-2 ring-offset-slate-950"
      )}
    >
      {isLoading && !analytics ? (
        <SemanticKpiSkeleton count={4} />
      ) : isError ? (
        <RestaurantSectionError
          message={
            lang === "ar"
              ? "تعذر تحميل تحليل مصادر المبيعات."
              : "Could not load sales source analysis."
          }
          retryLabel={lang === "ar" ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : vm == null || !vm.hasAnyFact ? (
        <RestaurantSectionEmpty
          icon={Network}
          title={
            lang === "ar"
              ? "لا توجد بيانات لهذه الفترة"
              : "No channel activity this period"
          }
          message={
            vm?.unavailableMessage ??
            (lang === "ar"
              ? "لا توجد مبيعات حسب القناة لهذه الفترة."
              : "No channel sales recorded for this period.")
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {vm.cards
            .filter((ch) =>
              ["table", "waiter", "qr", "kiosk"].includes(ch.channelId)
                ? true
                : ch.amountDisplay != null && ch.amountDisplay !== "0.00"
            )
            .map((ch) => (
              <div
                key={ch.channelId}
                className={cn(restaurantDash.kpiCardSupporting, "rounded-2xl p-4")}
              >
                <p className="text-xs font-medium text-slate-400 sm:text-sm">
                  {ch.label}
                </p>
                <p
                  dir="ltr"
                  className="mt-2 text-lg font-semibold tabular-nums text-orange-200"
                >
                  {formatMoneyDisplay(ch.amountDisplay ?? "0.00", sym)}
                </p>
                {ch.salesMixDisplay != null ? (
                  <p className="mt-1 text-[11px] text-slate-500" dir="ltr">
                    {ch.salesMixDisplay}
                    {lang === "ar" ? " من المبيعات" : " of sales"}
                  </p>
                ) : null}
                {ch.countDisplay != null ? (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {ch.countDisplay}
                  </p>
                ) : null}
              </div>
            ))}
        </div>
      )}
    </RestaurantDashSection>
  );
}
