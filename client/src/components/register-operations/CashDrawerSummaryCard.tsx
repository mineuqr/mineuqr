/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — Cash Drawer card (custody only).
 */

import {
  formatOpenedAtDisplay,
  formatRegisterMoneyDisplay,
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "@/lib/register-operations-presentation";
import { ShiftBadge } from "./RegisterStatusBadges";

type Props = {
  language: RegisterOperationsLang;
  currencySymbol: string;
  openingFloatAmount: string;
  expectedCashAmount: string;
  actualCashAmount: string | null;
  differenceAmount: string | null;
  openedAt: string;
  shiftStatusLabel: string;
  shiftTone: "active" | "none";
};

export function CashDrawerSummaryCard({
  language,
  currencySymbol,
  openingFloatAmount,
  expectedCashAmount,
  actualCashAmount,
  differenceAmount,
  openedAt,
  shiftStatusLabel,
  shiftTone,
}: Props) {
  return (
    <section
      aria-label={registerOperationsUiLabel("cashDrawerSection", language)}
      className="min-w-0 overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4 sm:p-5"
    >
      <h3 className="text-sm font-medium text-emerald-100/90 sm:text-base">
        {registerOperationsUiLabel("cashDrawerSection", language)}
      </h3>
      <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">
            {registerOperationsUiLabel("openingFloatTitle", language)}
          </dt>
          <dd className="mt-1 break-words text-base font-medium text-white">
            {formatRegisterMoneyDisplay(
              openingFloatAmount,
              currencySymbol,
              language
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">
            {registerOperationsUiLabel("expectedCashInDrawer", language)}
          </dt>
          <dd className="mt-1 break-words text-base font-medium text-white">
            {formatRegisterMoneyDisplay(
              expectedCashAmount,
              currencySymbol,
              language
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">
            {registerOperationsUiLabel("actualCashInDrawer", language)}
          </dt>
          <dd className="mt-1 break-words text-base font-medium text-white">
            {actualCashAmount != null
              ? formatRegisterMoneyDisplay(
                  actualCashAmount,
                  currencySymbol,
                  language
                )
              : registerOperationsUiLabel("none", language)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">
            {registerOperationsUiLabel("cashDifference", language)}
          </dt>
          <dd className="mt-1 break-words text-base font-medium text-white">
            {differenceAmount != null
              ? formatRegisterMoneyDisplay(
                  differenceAmount,
                  currencySymbol,
                  language
                )
              : registerOperationsUiLabel("none", language)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">
            {registerOperationsUiLabel("openedAt", language)}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium text-white">
            {formatOpenedAtDisplay(openedAt, language)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">
            {registerOperationsUiLabel("shiftStatus", language)}
          </dt>
          <dd className="mt-1.5">
            <ShiftBadge tone={shiftTone} label={shiftStatusLabel} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
