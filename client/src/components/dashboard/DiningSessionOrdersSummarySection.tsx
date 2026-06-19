import {
  formatSessionTotalAmount,
  sessionSummaryLabel,
} from "@/lib/diningSessionWorkspaceCopy";
import { cn } from "@/lib/utils";
import { restaurantDash } from "./restaurantDashStyles";

type Lang = "ar" | "en";

export function DiningSessionOrdersSummarySection({
  orderCount,
  itemsCount,
  ordersTotalAmount,
  language,
  currencySymbol,
}: {
  orderCount: number;
  itemsCount: number;
  ordersTotalAmount: string;
  language: Lang;
  currencySymbol: string;
}) {
  const rows = [
    {
      label: sessionSummaryLabel("ordersCount", language),
      value: String(orderCount),
    },
    {
      label: sessionSummaryLabel("itemsCount", language),
      value: String(itemsCount),
    },
    {
      label: sessionSummaryLabel("orderValue", language),
      value: formatSessionTotalAmount(ordersTotalAmount, currencySymbol, language),
    },
  ];

  return (
    <section
      className={cn(restaurantDash.panelInset, "p-4")}
      aria-label={sessionSummaryLabel("ordersSummary", language)}
    >
      <h3 className="mb-3 text-sm font-semibold text-white">
        {sessionSummaryLabel("ordersSummary", language)}
      </h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-slate-400">{row.label}</dt>
            <dd className="text-base font-semibold tabular-nums text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
