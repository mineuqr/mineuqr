/**
 * FINANCIAL-SHIFT-CLOSING-PRESENTATION-1 — printable closing summary.
 * Uses window.print() (same infra as Settlement Receipt). Not a fiscal invoice.
 */

import {
  formatRegisterMoneyDisplay,
  registerOperationsUiLabel,
  type RegisterOperationsLang,
  type ShiftClosingReportVm,
} from "@/lib/register-operations-presentation";

type Props = {
  language: RegisterOperationsLang;
  currencySymbol: string;
  report: ShiftClosingReportVm;
};

function Line({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}

export function ShiftClosingPrintReport({
  language,
  currencySymbol,
  report,
}: Props) {
  const money = (amount: string) =>
    formatRegisterMoneyDisplay(amount, currencySymbol, language);

  return (
    <div
      id="shift-closing-report-print"
      className="space-y-3 text-slate-900"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="space-y-1 text-center">
        <p className="text-base font-semibold">{report.restaurantName}</p>
        <p className="font-medium">
          {registerOperationsUiLabel("closingReportTitle", language)}
        </p>
        <p className="text-xs text-slate-600">
          {registerOperationsUiLabel("closingReportNotInvoice", language)}
        </p>
      </div>

      <div className="space-y-1 border-t border-dashed border-slate-400 pt-2 text-sm">
        <Line
          label={registerOperationsUiLabel("registerLabel", language)}
          value={report.registerName}
        />
        <Line
          label={registerOperationsUiLabel("currentUser", language)}
          value={report.operatorName}
        />
        <Line
          label={registerOperationsUiLabel("closingShiftNumber", language)}
          value={report.shiftNumber}
        />
        <Line
          label={registerOperationsUiLabel("openedAt", language)}
          value={report.openedAtLabel}
        />
        <Line
          label={registerOperationsUiLabel("closedAt", language)}
          value={report.closedAtLabel}
        />
        <Line
          label={registerOperationsUiLabel("shiftDuration", language)}
          value={report.durationLabel}
        />
      </div>

      <div className="space-y-1 border-t border-dashed border-slate-400 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wide">
          {registerOperationsUiLabel("cashDrawerSection", language)}
        </p>
        <Line
          label={registerOperationsUiLabel("openingFloatTitle", language)}
          value={money(report.openingFloatAmount)}
        />
        <Line
          label={registerOperationsUiLabel("expectedCashInDrawer", language)}
          value={money(report.expectedCashAmount)}
        />
        <Line
          label={registerOperationsUiLabel("actualCashInDrawer", language)}
          value={money(report.actualCashAmount)}
        />
        <Line
          label={registerOperationsUiLabel("cashDifference", language)}
          value={money(report.differenceAmount)}
        />
      </div>

      <div className="space-y-1 border-t border-dashed border-slate-400 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wide">
          {registerOperationsUiLabel("tenderSummarySection", language)}
        </p>
        {report.tenderRows.map((row) => (
          <Line key={row.key} label={row.label} value={money(row.amount)} />
        ))}
      </div>

      <div className="space-y-1 border-t border-dashed border-slate-400 pt-2 text-sm">
        <Line
          label={registerOperationsUiLabel("ordersCount", language)}
          value={String(report.ordersCount)}
        />
        <Line
          label={registerOperationsUiLabel("settlementsCount", language)}
          value={String(report.settlementsCount)}
        />
      </div>

      <p className="border-t border-dashed border-slate-400 pt-2 text-center text-xs text-slate-600">
        {registerOperationsUiLabel("generatedAt", language)}:{" "}
        {report.generatedAtLabel}
      </p>
    </div>
  );
}
