/**
 * FINANCIAL-SHIFT-CLOSING-PRESENTATION-1 /
 * FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1 /
 * FINANCIAL-SHIFT-CLOSING-DIALOG-DIMENSIONS-1 — Shift Closing Summary dialog.
 * Presentation only. Close still requires confirmation.
 *
 * Layout: content-height desktop reconciliation window, equal cards,
 * compact sticky footer, body scroll only when viewport is short.
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
import {
  SEMANTIC_SURFACE_PREMIUM,
  semanticDomainReportingSurfaceClass,
} from "@/design-system/semantic-card";
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
  shiftNumber?: number | null;
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
  shiftNumber,
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
      shiftNumber,
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
    shiftNumber,
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
          // Content-height reconciliation window — wide on desktop, not oversized tall.
          "flex h-auto w-[min(100vw-1.5rem,72rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-xl p-0",
          "max-h-[min(88dvh,40rem)] sm:max-w-6xl",
          // Mobile: bottom-anchored sheet without forcing empty vertical space.
          "max-sm:top-auto max-sm:bottom-2 max-sm:max-h-[min(92dvh,100%)] max-sm:translate-y-0 max-sm:rounded-2xl"
        )}
      >
        <DialogHeader className="shrink-0 space-y-0.5 border-b border-slate-800/80 px-4 py-3 text-start sm:px-5 sm:py-3.5">
          <DialogTitle className="pe-8 text-base font-semibold tracking-tight sm:text-lg">
            {registerOperationsUiLabel("cashCountTitle", language)}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 sm:text-sm">
            {registerOperationsUiLabel("cashCountSubtitle", language)}
          </DialogDescription>
        </DialogHeader>

        {/* Single vertical scroll — only when viewport is shorter than content */}
        <div
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-3.5"
          data-closing-scroll="body"
        >
          <div
            className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 md:gap-4"
            data-closing-cards="equal"
          >
            <section
              aria-label={registerOperationsUiLabel(
                "closingTenderSection",
                language
              )}
              data-domain="orders"
              className={cn(
                SEMANTIC_SURFACE_PREMIUM,
                "flex min-h-0 min-w-0 flex-col rounded-lg p-3.5 sm:p-4",
                semanticDomainReportingSurfaceClass("orders")
              )}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-200/90 sm:text-sm sm:normal-case sm:tracking-normal sm:font-medium sm:text-sky-100">
                {registerOperationsUiLabel("closingTenderSection", language)}
              </h3>
              {tenderLoading && !tenderSummary ? (
                <p className="mt-2.5 inline-flex items-center gap-2 text-sm text-sky-200">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {registerOperationsUiLabel("loading", language)}
                </p>
              ) : tenderRows.length === 0 ? (
                <p className="mt-2.5 text-sm text-slate-400">
                  {registerOperationsUiLabel("tenderSummaryEmpty", language)}
                </p>
              ) : (
                <ul className="mt-2.5 flex-1 divide-y divide-slate-800/80">
                  {tenderRows.map((row) => (
                    <li
                      key={row.key}
                      className="flex min-w-0 items-baseline justify-between gap-3 py-2 text-sm"
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
              data-domain="payments"
              className={cn(
                SEMANTIC_SURFACE_PREMIUM,
                "flex min-h-0 min-w-0 flex-col gap-3 rounded-lg p-3.5 sm:p-4",
                semanticDomainReportingSurfaceClass("payments")
              )}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90 sm:text-sm sm:normal-case sm:tracking-normal sm:font-medium sm:text-emerald-100">
                {registerOperationsUiLabel("closingDrawerSection", language)}
              </h3>
              <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2.5">
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500 sm:text-xs">
                    {registerOperationsUiLabel("openingFloatTitle", language)}
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-white sm:text-base">
                    {formatRegisterMoneyDisplay(
                      openingFloatAmount,
                      currencySymbol,
                      language
                    )}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500 sm:text-xs">
                    {registerOperationsUiLabel(
                      "expectedCashInDrawer",
                      language
                    )}
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-white sm:text-base">
                    {formatRegisterMoneyDisplay(
                      expectedCashAmount,
                      currencySymbol,
                      language
                    )}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500 sm:text-xs">
                    {registerOperationsUiLabel("openedAt", language)}
                  </dt>
                  <dd className="mt-0.5 break-words text-xs font-medium text-slate-100 sm:text-sm">
                    {reportVm?.openedAtLabel}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-slate-500 sm:text-xs">
                    {registerOperationsUiLabel("closedAt", language)}
                  </dt>
                  <dd className="mt-0.5 break-words text-xs font-medium text-slate-100 sm:text-sm">
                    {reportVm?.closedAtLabel}
                  </dd>
                </div>
              </dl>

              <div className="space-y-1.5">
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
                  className="min-h-10 text-base sm:min-h-11"
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

              <div className="mt-auto rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2.5">
                <div className="text-[11px] text-slate-500 sm:text-xs">
                  {registerOperationsUiLabel("cashCountDifference", language)}
                </div>
                <div className="mt-0.5 break-words text-base font-semibold tabular-nums text-white sm:text-lg">
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

          <label className="mt-3 flex items-center gap-2.5 py-1 text-sm text-slate-300">
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

        {/* Compact sticky footer — actions in one row from sm+ */}
        <div
          className="shrink-0 border-t border-slate-800/80 bg-background px-4 py-2.5 sm:px-5 sm:py-3"
          data-closing-footer="actions"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto sm:min-w-[9.5rem] sm:shrink-0"
              disabled={pending || !reportVm}
              onClick={handlePrint}
            >
              <Printer className="size-4 shrink-0" aria-hidden />
              <span className="ms-2 truncate">
                {registerOperationsUiLabel("printClosingReport", language)}
              </span>
            </Button>
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto sm:min-w-[7.5rem]"
                disabled={pending}
                onClick={onCancel}
              >
                {registerOperationsUiLabel("cashCountCancel", language)}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:min-w-[10rem] sm:flex-1 sm:max-w-[16rem]"
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
