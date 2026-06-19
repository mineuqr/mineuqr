import type { SessionSettlementSummary } from "@/lib/diningSessionWorkspaceView";
import {
  formatSessionTotalAmount,
  sessionSummaryLabel,
} from "@/lib/diningSessionWorkspaceCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { Clock3 } from "lucide-react";
import { restaurantDash, restaurantSemantic } from "./restaurantDashStyles";

type Lang = "ar" | "en";

function settlementMethodLabel(method: "paid" | "complimentary", language: Lang): string {
  return method === "paid"
    ? sessionSummaryLabel("settlementPaid", language)
    : sessionSummaryLabel("settlementComplimentary", language);
}

export function DiningSessionSettlementSummarySection({
  settlement,
  language,
  currencySymbol,
}: {
  settlement: SessionSettlementSummary;
  language: Lang;
  currencySymbol: string;
}) {
  if (settlement.state === "pending") {
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={sessionSummaryLabel("settlementSummary", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {sessionSummaryLabel("settlementSummary", language)}
        </h3>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-3",
            restaurantSemantic.rowWarning
          )}
        >
          <Clock3 className={cn("h-5 w-5 shrink-0", restaurantSemantic.iconWarning)} aria-hidden />
          <p className="text-sm text-orange-200">
            {sessionSummaryLabel("settlementPending", language)}
          </p>
        </div>
      </section>
    );
  }

  const settledTime = settlement.settledAt
    ? formatRiyadhDateTime(settlement.settledAt, language === "ar" ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const rows = [
    {
      label: sessionSummaryLabel("settlementMethod", language),
      value: settlementMethodLabel(settlement.method, language),
    },
    {
      label: sessionSummaryLabel("settlementAmount", language),
      value: formatSessionTotalAmount(settlement.amount, currencySymbol, language),
    },
    {
      label: sessionSummaryLabel("settlementTime", language),
      value: settledTime,
    },
  ];

  return (
    <section
      className={cn(restaurantDash.panelInset, "p-4")}
      aria-label={sessionSummaryLabel("settlementSummary", language)}
    >
      <h3 className="mb-3 text-sm font-semibold text-white">
        {sessionSummaryLabel("settlementSummary", language)}
      </h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-slate-400">{row.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
