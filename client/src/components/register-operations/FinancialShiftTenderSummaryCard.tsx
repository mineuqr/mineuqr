/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — payment methods summary card.
 * Displays certified tender summary DTO only — no calculations.
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1 — payments/card domain shell.
 */

import {
  formatRegisterMoneyDisplay,
  presentTenderSummaryRows,
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "@/lib/register-operations-presentation";
import {
  SEMANTIC_CATEGORY_SURFACE,
  SEMANTIC_MOTION,
  SEMANTIC_PANEL_BASE,
} from "@/design-system/semantic-card";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type TenderSummary = Readonly<{
  monetaryTenderTotal: string;
  cashTenderTotal: string;
  complimentaryAmount: string;
  refundAmount: string;
  attributedSettlementCount: number;
  methods: readonly Readonly<{
    paymentMethod: string;
    amount: string;
    transactionCount: number;
  }>[];
}>;

type Props = {
  language: RegisterOperationsLang;
  currencySymbol: string;
  summary: TenderSummary | null | undefined;
  loading: boolean;
};

export function FinancialShiftTenderSummaryCard({
  language,
  currencySymbol,
  summary,
  loading,
}: Props) {
  const rows = summary ? presentTenderSummaryRows(summary, language) : [];

  return (
    <section
      aria-label={registerOperationsUiLabel("tenderSummarySection", language)}
      className={cn(
        SEMANTIC_PANEL_BASE,
        SEMANTIC_MOTION,
        "min-w-0 overflow-hidden p-4 sm:p-5 shadow-none",
        SEMANTIC_CATEGORY_SURFACE.card.shell
      )}
    >
      <h3 className="text-sm font-medium text-sky-100/90 sm:text-base">
        {registerOperationsUiLabel("tenderSummarySection", language)}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
        {registerOperationsUiLabel("tenderSummaryHint", language)}
      </p>

      {loading && !summary ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-sky-200">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {registerOperationsUiLabel("loading", language)}
        </p>
      ) : !summary || summary.attributedSettlementCount === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          {registerOperationsUiLabel("tenderSummaryEmpty", language)}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-800/80">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex min-w-0 items-baseline justify-between gap-3 py-2.5 text-sm"
            >
              <span
                className={
                  row.emphasize
                    ? "min-w-0 break-words font-medium text-white"
                    : "min-w-0 break-words text-slate-300"
                }
              >
                {row.label}
              </span>
              <span
                className={
                  row.emphasize
                    ? "shrink-0 tabular-nums font-semibold text-white"
                    : "shrink-0 tabular-nums text-slate-200"
                }
              >
                {formatRegisterMoneyDisplay(
                  row.amount,
                  currencySymbol,
                  language
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
