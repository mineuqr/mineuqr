/**
 * FINANCIAL-SHIFT-CLOSING-PRESENTATION-1 — Shift Closing Summary dialog.
 * Presentation + print workflow only. Close still requires confirmation.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ShiftClosingPrintReport } from "./ShiftClosingPrintReport";
import {
  buildShiftClosingReportVm,
  computeLiveCashDifference,
  formatRegisterMoneyDisplay,
  parseMoneyAmountInput,
  presentTenderSummaryRows,
  printShiftClosingReport,
  readAutoPrintClosingReport,
  registerOperationsUiLabel,
  writeAutoPrintClosingReport,
  type RegisterOperationsLang,
  type ShiftClosingReportVm,
} from "@/lib/register-operations-presentation";
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
    writeAutoPrintClosingReport(autoPrint);
    printShiftClosingReport();
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
        className="max-h-[min(92vh,52rem)] max-w-lg overflow-y-auto print:max-w-none print:border-0 print:shadow-none"
      >
        <DialogHeader className="print:hidden">
          <DialogTitle>
            {registerOperationsUiLabel("cashCountTitle", language)}
          </DialogTitle>
          <DialogDescription>
            {registerOperationsUiLabel("cashCountSubtitle", language)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 print:hidden">
          <section
            aria-label={registerOperationsUiLabel(
              "closingTenderSection",
              language
            )}
            className="rounded-lg border border-sky-500/25 bg-sky-950/20 p-3"
          >
            <h3 className="text-sm font-medium text-sky-100">
              {registerOperationsUiLabel("closingTenderSection", language)}
            </h3>
            {tenderLoading && !tenderSummary ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-sky-200">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {registerOperationsUiLabel("loading", language)}
              </p>
            ) : tenderRows.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                {registerOperationsUiLabel("tenderSummaryEmpty", language)}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-800/80">
                {tenderRows.map((row) => (
                  <li
                    key={row.key}
                    className="flex justify-between gap-2 py-1.5 text-sm"
                  >
                    <span
                      className={
                        row.emphasize ? "text-white" : "text-slate-300"
                      }
                    >
                      {row.label}
                    </span>
                    <span className="tabular-nums text-slate-100">
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
            className="space-y-3 rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-3"
          >
            <h3 className="text-sm font-medium text-emerald-100">
              {registerOperationsUiLabel("closingDrawerSection", language)}
            </h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">
                  {registerOperationsUiLabel("openingFloatTitle", language)}
                </dt>
                <dd className="font-medium text-white">
                  {formatRegisterMoneyDisplay(
                    openingFloatAmount,
                    currencySymbol,
                    language
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  {registerOperationsUiLabel("expectedCashInDrawer", language)}
                </dt>
                <dd className="font-medium text-white">
                  {formatRegisterMoneyDisplay(
                    expectedCashAmount,
                    currencySymbol,
                    language
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  {registerOperationsUiLabel("openedAt", language)}
                </dt>
                <dd className="font-medium text-white">
                  {reportVm?.openedAtLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  {registerOperationsUiLabel("closedAt", language)}
                </dt>
                <dd className="font-medium text-white">
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

            <div className="rounded-md border border-slate-700/50 bg-slate-950/40 px-3 py-2">
              <div className="text-xs text-slate-500">
                {registerOperationsUiLabel("cashCountDifference", language)}
              </div>
              <div className="mt-0.5 text-base font-semibold text-white">
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

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              className="size-4 accent-cyan-500"
              checked={autoPrint}
              disabled={pending}
              onChange={(e) => {
                setAutoPrint(e.target.checked);
                writeAutoPrintClosingReport(e.target.checked);
              }}
            />
            {registerOperationsUiLabel("autoPrintClosingReport", language)}
          </label>
        </div>

        {reportVm && (
          <div className="hidden print:block">
            <ShiftClosingPrintReport
              language={language}
              currencySymbol={currencySymbol}
              report={reportVm}
            />
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col print:hidden">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={pending || !reportVm}
            onClick={handlePrint}
          >
            <Printer className="size-4" aria-hidden />
            <span className="ms-2">
              {registerOperationsUiLabel("printClosingReport", language)}
            </span>
          </Button>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={onCancel}
            >
              {registerOperationsUiLabel("cashCountCancel", language)}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={pending}
              onClick={submit}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                registerOperationsUiLabel("cashCountConfirm", language)
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
