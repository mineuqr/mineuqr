/**
 * REPORTING-PRODUCT-HOTFIX-1 — Sales Source Analysis (presentation only).
 * Binds reporting channel facts when published. Never invents totals.
 */
import { RestaurantDashSection } from "./RestaurantDashSection";
import { RestaurantSectionEmpty } from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";
import { cn } from "@/lib/utils";
import {
  buildSalesSourceAnalysisVm,
  type SalesSourceChannelFact,
} from "@/lib/reporting-exports/salesSourceAnalysisPresentation";
import { Network } from "lucide-react";

export function SalesSourceAnalysisSection({
  language,
  sectionId,
  emphasized,
  /**
   * Channel facts from reporting only.
   * `null` = Reporting Platform has not published a channel contract (current production).
   * `[]` = contract exists, period empty.
   */
  facts = null,
}: {
  language: string;
  sectionId?: string;
  emphasized?: boolean;
  facts?: readonly SalesSourceChannelFact[] | null;
}) {
  const lang = language === "ar" ? "ar" : "en";
  const vm = buildSalesSourceAnalysisVm({ language: lang, facts });

  return (
    <RestaurantDashSection
      id={sectionId}
      title={vm.title}
      description={vm.description}
      ariaLabel={vm.title}
      className={cn(
        emphasized &&
          "rounded-2xl ring-2 ring-orange-400/35 ring-offset-2 ring-offset-slate-950"
      )}
    >
      {vm.projectionUnavailable || !vm.hasAnyFact ? (
        <RestaurantSectionEmpty
          icon={Network}
          title={
            vm.projectionUnavailable
              ? lang === "ar"
                ? "تحليل القنوات غير متاح بعد"
                : "Channel analysis not available yet"
              : lang === "ar"
                ? "لا توجد بيانات لهذه الفترة"
                : "No channel activity this period"
          }
          message={vm.unavailableMessage}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {vm.cards.map((ch) => (
            <div
              key={ch.channelId}
              className={cn(restaurantDash.kpiCardSupporting, "rounded-2xl p-4")}
            >
              <p className="text-xs font-medium text-slate-400 sm:text-sm">
                {ch.label}
              </p>
              {ch.hasFact ? (
                <>
                  <p
                    dir="ltr"
                    className="mt-2 text-lg font-semibold tabular-nums text-orange-200"
                  >
                    {ch.amountDisplay}
                  </p>
                  {ch.countDisplay != null ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {ch.countDisplay}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-lg font-semibold tabular-nums text-slate-500">
                  —
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </RestaurantDashSection>
  );
}
