/**
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — Shift Archive browse + report access.
 * Reads Financial Shift directly. DRAP display window is transparent.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  buildShiftClosingReportVm,
  formatOpsShiftNumber,
  formatRegisterMoneyDisplay,
  printShiftClosingReport,
  registerOperationsUiLabel,
  useFinancialShiftArchive,
  useFinancialShiftClosingReport,
  type RegisterOperationsLang,
  type ShiftClosingReportVm,
} from "@/lib/register-operations-presentation";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2, Printer, Search } from "lucide-react";
import { ShiftClosingPrintHost } from "./ShiftClosingPrintHost";

type Preset = "today" | "last_7" | "last_30" | "last_90" | "all";

type Props = {
  restaurantId: number;
  language: RegisterOperationsLang;
  currencySymbol: string;
  restaurantName: string;
  onBack: () => void;
};

export function FinancialShiftArchivePanel({
  restaurantId,
  language,
  currencySymbol,
  restaurantName,
  onBack,
}: Props) {
  const dir = language === "ar" ? "rtl" : "ltr";
  const [preset, setPreset] = useState<Preset>("last_30");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printReport, setPrintReport] = useState<ShiftClosingReportVm | null>(
    null
  );
  const limit = 25;

  const shiftNumberFilter = useMemo(() => {
    const n = Number(query.trim());
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }, [query]);

  const archiveQuery = useFinancialShiftArchive({
    restaurantId,
    preset,
    shiftNumber: shiftNumberFilter,
    financialShiftIdQuery:
      shiftNumberFilter == null && query.trim() ? query.trim() : undefined,
    limit,
    offset: page * limit,
  });

  const reportQuery = useFinancialShiftClosingReport(
    {
      restaurantId,
      financialShiftId: selectedId ?? "",
    },
    { enabled: Boolean(selectedId) }
  );

  const presets: { id: Preset; labelKey: Parameters<typeof registerOperationsUiLabel>[0] }[] = [
    { id: "today", labelKey: "archiveToday" },
    { id: "last_7", labelKey: "archiveLast7" },
    { id: "last_30", labelKey: "archiveLast30" },
    { id: "last_90", labelKey: "archiveLast90" },
    { id: "all", labelKey: "archiveAll" },
  ];

  function reportVmFromApi(): ShiftClosingReportVm | null {
    const r = reportQuery.data;
    if (!r) return null;
    return buildShiftClosingReportVm({
      language,
      restaurantName,
      registerName: r.registerName,
      operatorName: registerOperationsUiLabel("currentUserFallback", language),
      financialShiftId: r.financialShiftId,
      shiftNumber: r.shiftNumber,
      openedAt: r.openedAt,
      closedAtIso: r.closedAt ?? r.openedAt,
      openingFloatAmount: r.openingFloatAmount,
      expectedCashAmount: r.expectedCashAmount,
      actualCashAmount: r.actualCashAmount,
      differenceAmount: r.differenceAmount,
      tenderSummary: r.tender,
      generatedAtIso: new Date().toISOString(),
    });
  }

  function runPrint() {
    const vm = reportVmFromApi();
    if (!vm) return;
    setPrintReport(vm);
    window.setTimeout(() => printShiftClosingReport(), 50);
  }

  return (
    <section
      className={cn(restaurantDash.panel, "space-y-4 p-4 sm:p-6")}
      dir={dir}
      aria-label={registerOperationsUiLabel("shiftArchive", language)}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              <ArrowRight
                className={cn("size-4", language === "ar" ? "" : "rotate-180")}
              />
              <span className="ms-1">
                {registerOperationsUiLabel("currentShiftNav", language)}
              </span>
            </Button>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
            {registerOperationsUiLabel("shiftArchive", language)}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {registerOperationsUiLabel("shiftArchiveSubtitle", language)}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-slate-500 start-3" />
          <Input
            className="ps-9"
            value={query}
            onChange={(e) => {
              setPage(0);
              setQuery(e.target.value);
            }}
            placeholder={registerOperationsUiLabel("archiveSearch", language)}
            aria-label={registerOperationsUiLabel("archiveSearch", language)}
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label={registerOperationsUiLabel("archiveWindow", language)}>
          {presets.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              onClick={() => {
                setPage(0);
                setPreset(p.id);
              }}
            >
              {registerOperationsUiLabel(p.labelKey, language)}
            </Button>
          ))}
        </div>
      </div>

      {archiveQuery.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          {registerOperationsUiLabel("loading", language)}
        </p>
      ) : (archiveQuery.data?.items.length ?? 0) === 0 ? (
        <p className="py-10 text-center text-slate-400">
          {registerOperationsUiLabel("archiveEmpty", language)}
        </p>
      ) : (
        <ul className="space-y-2">
          {archiveQuery.data!.items.map((row) => (
            <li
              key={row.financialShiftId}
              className={cn(
                "rounded-xl border px-3 py-3 sm:flex sm:items-center sm:justify-between",
                selectedId === row.financialShiftId
                  ? "border-cyan-400/40 bg-cyan-950/20"
                  : "border-slate-700/60 bg-slate-950/30"
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-start"
                onClick={() => setSelectedId(row.financialShiftId)}
              >
                <p className="font-medium text-white">
                  #{formatOpsShiftNumber(row.shiftNumber)} · {row.registerName}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {row.status} · {row.closedAt ?? row.openedAt}
                </p>
                <p className="mt-1 text-sm tabular-nums text-slate-200">
                  {formatRegisterMoneyDisplay(
                    row.expectedCashAmount,
                    currencySymbol,
                    language
                  )}
                </p>
              </button>
              <div className="mt-2 flex flex-wrap gap-2 sm:mt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedId(row.financialShiftId)}
                >
                  {registerOperationsUiLabel("viewClosingReport", language)}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(archiveQuery.data?.total ?? 0) > limit && (
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ‹
          </Button>
          <span className="text-xs text-slate-500">
            {page + 1} /{" "}
            {Math.max(1, Math.ceil((archiveQuery.data?.total ?? 0) / limit))}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={(page + 1) * limit >= (archiveQuery.data?.total ?? 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </Button>
        </div>
      )}

      {selectedId && (
        <div className="space-y-3 rounded-xl border border-slate-600/50 bg-slate-900/40 p-4">
          <h3 className="text-base font-medium text-white">
            {registerOperationsUiLabel("closingReportTitle", language)}
          </h3>
          {reportQuery.isLoading ? (
            <Loader2 className="size-5 animate-spin text-slate-400" />
          ) : reportQuery.data ? (
            <>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">
                    {registerOperationsUiLabel("closingShiftNumber", language)}
                  </dt>
                  <dd className="font-medium text-white">
                    {formatOpsShiftNumber(reportQuery.data.shiftNumber)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    {registerOperationsUiLabel("expectedCashInDrawer", language)}
                  </dt>
                  <dd className="font-medium text-white">
                    {formatRegisterMoneyDisplay(
                      reportQuery.data.expectedCashAmount,
                      currencySymbol,
                      language
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    {registerOperationsUiLabel("actualCashInDrawer", language)}
                  </dt>
                  <dd className="font-medium text-white">
                    {formatRegisterMoneyDisplay(
                      reportQuery.data.actualCashAmount,
                      currencySymbol,
                      language
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    {registerOperationsUiLabel("cashDifference", language)}
                  </dt>
                  <dd className="font-medium text-white">
                    {formatRegisterMoneyDisplay(
                      reportQuery.data.differenceAmount,
                      currencySymbol,
                      language
                    )}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={runPrint}>
                  <Printer className="size-4" aria-hidden />
                  <span className="ms-2">
                    {registerOperationsUiLabel("reprintClosingReport", language)}
                  </span>
                </Button>
                <Button type="button" variant="secondary" onClick={runPrint}>
                  {registerOperationsUiLabel("downloadClosingPdf", language)}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-rose-300">
              {registerOperationsUiLabel("archiveEmpty", language)}
            </p>
          )}
        </div>
      )}

      <ShiftClosingPrintHost
        language={language}
        currencySymbol={currencySymbol}
        report={printReport}
      />
    </section>
  );
}
