/**
 * REPORTING-VISUAL-HIERARCHY-1 — Financial relationship strip (presentation only).
 * Shows Total Sales → Refund Amount → Net Sales using existing DTO values.
 * No formulas invented — displays BusinessMetricsSummary fields as-is.
 */
import { kpiDisplayName } from "@/lib/reporting/kpiDisplay";
import { formatSettlementRevenue } from "@/lib/settlementOverviewDisplay";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";
import { ChevronRight } from "lucide-react";
import { restaurantDash } from "./restaurantDashStyles";

export function FinancialSalesFlowStrip({
  language,
  revenue,
  refundPublishedTotal,
  netRevenue,
  currencySymbol,
}: {
  language: "en" | "ar";
  revenue: string;
  refundPublishedTotal: string;
  netRevenue: string;
  currencySymbol: string;
}) {
  const isAr = language === "ar";
  const note = SECTION_TERMINOLOGY[language].refundAnalyticsNote;

  const steps = [
    {
      id: "revenue" as const,
      label: kpiDisplayName("revenue", language),
      value: formatSettlementRevenue(revenue, currencySymbol),
      emphasis: "primary" as const,
    },
    {
      id: "refundPublishedTotal" as const,
      label: kpiDisplayName("refundPublishedTotal", language),
      value: formatSettlementRevenue(refundPublishedTotal, currencySymbol),
      emphasis: "secondary" as const,
    },
    {
      id: "netRevenue" as const,
      label: kpiDisplayName("netRevenue", language),
      value: formatSettlementRevenue(netRevenue, currencySymbol),
      emphasis: "primary" as const,
    },
  ];

  return (
    <section
      className={restaurantDash.flowStrip}
      aria-label={isAr ? "علاقة المبيعات والمرتجعات" : "Sales to net relationship"}
    >
      <div className="w-full space-y-3">
        <div>
          <h3 className={restaurantDash.bandTitle}>
            {isAr ? "من إجمالي المبيعات إلى الصافي" : "From Total Sales to Net"}
          </h3>
          <p className={restaurantDash.bandHint}>{note}</p>
        </div>
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2"
          dir="ltr"
        >
          {steps.map((step, index) => (
            <div key={step.id} className="flex min-w-0 flex-1 items-stretch gap-2">
              <div className={restaurantDash.flowStep}>
                <span className="text-[11px] font-medium text-slate-400 sm:text-xs">
                  {step.label}
                </span>
                <span
                  className={
                    step.emphasis === "primary"
                      ? "text-lg font-bold tabular-nums text-white sm:text-xl"
                      : "text-base font-semibold tabular-nums text-orange-300/90 sm:text-lg"
                  }
                >
                  {step.value}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className="flex items-center justify-center text-slate-500"
                  aria-hidden
                >
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
