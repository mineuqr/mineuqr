/**
 * FINANCIAL-SHIFT-CLOSING-PRESENTATION-1 /
 * FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1 — Shift Closing Summary dialog.
 * Presentation + print workflow only. Close still requires confirmation.
 *
 * Layout: wide modal, single vertical body scroll, sticky footer (no H-scroll).
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  buildShiftClosingReportVm,
  computeLiveCashDifference,
  formatRegisterMoneyDisplay,
  parseMoneyAmountInput,
  presentTenderSummaryRows,
  readAutoPrintClosingReport,
  registerOperationsUiLabel,
  writeAutoPrintClosingReport,
  type RegisterOperationsLang,
  type ShiftClosingReportVm,
} from "@/lib/register-operations-presentation";
import { cn } from "@/lib/utils";
import { Loader2, Printer } from "lucide-react";

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

export type ShiftClosingConfirmPayload = Readonly<{
  actualCashAmount: string;
  autoPrint: boolean;
  report: ShiftClosingReportVm;
}>;

type Props = {
  open: boolean;
  language: RegisterOperationsLang;
  currencySymbol: string;
  restaurantName: string;
  registerName: string;
  operatorName: string;
  financialShiftId: string;
  openedAt: string;
  openingFloatAmount: string;
  expectedCashAmount: string;
  tenderSummary: TenderSummary | null | undefined;
  tenderLoading: boolean;
  pending: boolean;
  onConfirm: (payload: ShiftClosingConfirmPayload) => void;
  /** Loads the single print host then prints (parent owns the only print root). */
  onPrint: (report: ShiftClosingReportVm) => void;
  onCancel: () => void;
};

export function ShiftClosingSummaryDialog({
  open,
  language,
  currencySymbol,
  restaurantName,
  registerName,
  operatorName,
  financialShiftId,
  openedAt,
  openingFloatAmount,
  expectedCashAmount,
  tenderSummary,
  tenderLoading,
  pending,
  onConfirm,
  onPrint,
  onCancel,
}: Props) {
  const [raw, setRaw] = useState(expectedCashAmount);
  const [error, setError] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [closedAtPreview, setClosedAtPreview] = useState(() =>
    new Date().toISOString()
  );

  useEffect(() => {
    if (!open) return;
    setRaw(expectedCashAmount);
    setError(null);
    setAutoPrint(readAutoPrintClosingReport());
    setClosedAtPreview(new Date().toISOString());
    const timer = window.setInterval(() => {
      setClosedAtPreview(new Date().toISOString());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [open, expectedCashAmount]);

  const liveDifference = useMemo(
    () => computeLiveCashDifference(expectedCashAmount, raw),
    [expectedCashAmount, raw]
  );

  const tenderRows = useMemo(
    () =>
      tenderSummary ? presentTenderSummaryRows(tenderSummary, language) : [],
    [tenderSummary, language]
  );

  const reportVm: ShiftClosingReportVm | null = useMemo(() => {
    const parsed = parseMoneyAmountInput(raw);
    const actual = parsed.ok ? parsed.amount : expectedCashAmount;
    const difference =
      liveDifference ??
      computeLiveCashDifference(expectedCashAmount, actual) ??
      "0.00";
    return buildShiftClosingReportVm({
      language,
      restaurantName,
      registerName,
      operatorName,
      financialShiftId,
      openedAt,
      closedAtIso: closedAtPreview,
      openingFloatAmount,
      expectedCashAmount,
      actualCashAmount: actual,
      differenceAmount: difference,
      tenderSummary: tenderSummary ?? null,
      generatedAtIso: closedAtPreview,
    });
  }, [
    language,
    restaurantName,
    registerName,
    operatorName,
    financialShiftId,
    openedAt,
    closedAtPreview,
    openingFloatAmount,
    expectedCashAmount,
    raw,
    liveDifference,
    tenderSummary,
  ]);

  const dir = language === "ar" ? "rtl" : "ltr";

  function submit() {
    if (pending || !reportVm) return;
    const parsed = parseMoneyAmountInput(raw);
    if (!parsed.ok) {
      setError(
        registerOperationsUiLabel(
          parsed.reason === "required"
            ? "openingFloatRequired"
            : "openingFloatInvalid",
          language
        )
      );
      return;
    }
    setError(null);
    writeAutoPrintClosingReport(autoPrint);
    onConfirm({
      actualCashAmount: parsed.amount,
      autoPrint,
      report: {
        ...reportVm,
        actualCashAmount: parsed.amount,
        differenceAmount:
          computeLiveCashDifference(expectedCashAmount, parsed.amount) ??
          reportVm.differenceAmount,
      },
    });
  }

  function handlePrint() {
    if (!reportVm) return;
    writeAutoPrintClosingReport(autoPrint);
    const parsed = parseMoneyAmountInput(raw);
    const actual = parsed.ok ? parsed.amount : expectedCashAmount;
    onPrint({
      ...reportVm,
      actualCashAmount: actual,
      differenceAmount:
        computeLiveCashDifference(expectedCashAmount, actual) ??
        reportVm.differenceAmount,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent
        dir={dir}
        showCloseButton={!pending}
        className={cn(
          // Override default Dialog narrow width — wide desktop modal, sheet-like mobile.
          "flex w-[min(100vw-1rem,56rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0",
          "max-h-[min(92dvh,52rem)] sm:max-w-4xl",
          // Mobile: near full-height bottom sheet feel without H-scroll.
          "max-sm:top-auto max-sm:bottom-2 max-sm:max-h-[min(94dvh,100%)] max-sm:translate-y-0"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-slate-800/80 px-4 py-4 text-start sm:px-6">
          <DialogTitle className="pe-8 text-lg sm:text-xl">
            {registerOperationsUiLabel("cashCountTitle", language)}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            {registerOperationsUiLabel("cashCountSubtitle", language)}
          </DialogDescription>
        </DialogHeader>

        {/* Single vertical scroll container — body only */}
        <div
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
          data-closing-scroll="body"
        >
          <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-5">
            <section
              aria-label={registerOperationsUiLabel(
                "closingTenderSection",
                language
              )}
              className="min-w-0 rounded-xl border border-sky-500/25 bg-sky-950/20 p-4 sm:p-5"
            >
              <h3 className="text-sm font-medium text-sky-100 sm:text-base">
                {registerOperationsUiLabel("closingTenderSection", language)}
              </h3>
              {tenderLoading && !tenderSummary ? (
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-sky-200">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {registerOperationsUiLabel("loading", language)}
                </p>
              ) : tenderRows.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  {registerOperationsUiLabel("tenderSummaryEmpty", language)}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-800/80">
                  {tenderRows.map((row) => (
                    <li
                      key={row.key}
                      className="flex min-w-0 items-baseline justify-between gap-3 py-2.5 text-sm"
                    >
                      <span
                        className={cn(
                          "min-w-0 break-words",
                          row.emphasize
                            ? "font-medium text-white"
                            : "text-slate-300"
                        )}
                      >
                        {row.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          row.emphasize
                            ? "font-semibold text-white"
                            : "text-slate-100"
                        )}
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

            <section
              aria-label={registerOperationsUiLabel(
                "closingDrawerSection",
                language
              )}
              className="flex min-w-0 flex-col gap-4 rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4 sm:p-5"
            >
              <h3 className="text-sm font-medium text-emerald-100 sm:text-base">
                {registerOperationsUiLabel("closingDrawerSection", language)}
              </h3>
              <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
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
                    {registerOperationsUiLabel(
                      "expectedCashInDrawer",
                      language
                    )}
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
                    {registerOperationsUiLabel("openedAt", language)}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-white">
                    {reportVm?.openedAtLabel}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">
                    {registerOperationsUiLabel("closedAt", language)}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-white">
                    {reportVm?.closedAtLabel}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <label
                  className="text-sm text-slate-300"
                  htmlFor="shift-closing-actual-cash"
                >
                  {registerOperationsUiLabel("cashCountActual", language)}
                  {currencySymbol ? ` (${currencySymbol})` : ""}
                </label>
                <Input
                  id="shift-closing-actual-cash"
                  inputMode="decimal"
                  autoFocus
                  value={raw}
                  disabled={pending}
                  className="min-h-11 text-base"
                  aria-invalid={error ? true : undefined}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
                {error && (
                  <p role="alert" className="text-sm text-rose-300">
                    {error}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-700/50 bg-slate-950/40 px-4 py-3">
                <div className="text-xs text-slate-500">
                  {registerOperationsUiLabel("cashCountDifference", language)}
                </div>
                <div className="mt-1 break-words text-lg font-semibold text-white">
                  {liveDifference != null
                    ? formatRegisterMoneyDisplay(
                        liveDifference,
                        currencySymbol,
                        language
                      )
                    : registerOperationsUiLabel("none", language)}
                </div>
              </div>
            </section>
          </div>

          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-cyan-500"
              checked={autoPrint}
              disabled={pending}
              onChange={(e) => {
                setAutoPrint(e.target.checked);
                writeAutoPrintClosingReport(e.target.checked);
              }}
            />
            <span className="min-w-0 break-words">
              {registerOperationsUiLabel("autoPrintClosingReport", language)}
            </span>
          </label>
        </div>

        {/* Sticky footer — always visible, never inside body scroll */}
        <div
          className="shrink-0 border-t border-slate-800/80 bg-background px-4 py-3 sm:px-6 sm:py-4"
          data-closing-footer="actions"
        >
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full touch-manipulation"
              disabled={pending || !reportVm}
              onClick={handlePrint}
            >
              <Printer className="size-4 shrink-0" aria-hidden />
              <span className="ms-2 truncate">
                {registerOperationsUiLabel("printClosingReport", language)}
              </span>
            </Button>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full touch-manipulation"
                disabled={pending}
                onClick={onCancel}
              >
                {registerOperationsUiLabel("cashCountCancel", language)}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full touch-manipulation"
                disabled={pending}
                onClick={submit}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <span className="truncate">
                    {registerOperationsUiLabel("cashCountConfirm", language)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
