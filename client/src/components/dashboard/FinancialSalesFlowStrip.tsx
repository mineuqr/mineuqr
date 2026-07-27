/**
 * REPORTING-PRODUCT-POLISH-1 — Financial relationship strip (presentation only).
 * Shows Total Sales → Refund Amount → Net Sales using existing DTO values.
 */
import { kpiDisplayName } from "@/lib/reporting/kpiDisplay";
import { formatSettlementRevenue } from "@/lib/settlementOverviewDisplay";
import { REPORTING_CATEGORY_HEX } from "@/lib/reporting-exports/reportingExecutiveColors";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";
import { ChevronRight } from "lucide-react";
import { restaurantDash } from "./restaurantDashStyles";
import { cn } from "@/lib/utils";

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
      color: REPORTING_CATEGORY_HEX.net,
    },
    {
      id: "refundPublishedTotal" as const,
      label: kpiDisplayName("refundPublishedTotal", language),
      value: formatSettlementRevenue(refundPublishedTotal, currencySymbol),
      color: REPORTING_CATEGORY_HEX.refund,
    },
    {
      id: "netRevenue" as const,
      label: kpiDisplayName("netRevenue", language),
      value: formatSettlementRevenue(netRevenue, currencySymbol),
      color: REPORTING_CATEGORY_HEX.cash,
    },
  ];

  return (
    <section
      className={cn(restaurantDash.flowStrip, "rounded-2xl")}
      aria-label={isAr ? "من إجمالي المبيعات إلى الصافي" : "From Total Sales to Net"}
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
                  dir="ltr"
                  className="text-lg font-bold tabular-nums sm:text-xl"
                  style={{ color: step.color }}
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
