/**
 * SETTLEMENT-HISTORY-UX-RATIONALIZATION-1 / REFUND-PRESENTATION-ADOPTION-1
 * Operational Settlement History (Unified Financial Entry Point).
 * Presentation only — Refund is a status/kind within the same ledger.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  defaultSettlementHistoryRange,
  mapSettlementRecordApiError,
  settlementHistoryFiltersForStatusFacet,
  settlementQuickRangeBounds,
  settlementRecordErrorMessage,
  settlementRecordUiLabel,
  toSettlementHistoryRowViewModel,
  useSettlementRecordHistory,
  type SettlementHistoryStatusFacet,
  type SettlementQuickRange,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { cn } from "@/lib/utils";
import { Eye, Loader2, Receipt } from "lucide-react";
import { SettlementDetailSheet } from "./SettlementDetailSheet";
import { SettlementReceiptDialog } from "./SettlementReceiptDialog";

type SettlementHistoryPanelProps = {
  restaurantId: number;
  language: SettlementRecordLang;
  restaurantName?: string;
  currencySymbol?: string;
};

type SourceFilter = "all" | "session" | "check";

const INITIAL_RANGE = defaultSettlementHistoryRange();

export function SettlementHistoryPanel({
  restaurantId,
  language,
  restaurantName,
}: SettlementHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [quickRange, setQuickRange] = useState<SettlementQuickRange>("30d");
  const [dateFrom, setDateFrom] = useState(INITIAL_RANGE.dateFrom);
  const [dateTo, setDateTo] = useState(INITIAL_RANGE.dateTo);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFacet, setStatusFacet] =
    useState<SettlementHistoryStatusFacet>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const apiFilters = settlementHistoryFiltersForStatusFacet(statusFacet);

  const query = useSettlementRecordHistory({
    restaurantId,
    page,
    pageSize: 20,
    search: search.trim() || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    outcome: apiFilters.outcome,
    recordKind: apiFilters.recordKind,
  });

  const rows = useMemo(() => {
    const mapped = (query.data?.items ?? []).map((item) =>
      toSettlementHistoryRowViewModel(item, language)
    );
    if (sourceFilter === "all") return mapped;
    return mapped.filter((row) => row.sourceType === sourceFilter);
  }, [query.data?.items, language, sourceFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil((query.data?.totalCount ?? 0) / (query.data?.pageSize ?? 20))
  );

  const applyQuickRange = (range: Exclude<SettlementQuickRange, "custom">) => {
    const bounds = settlementQuickRangeBounds(range);
    setQuickRange(range);
    setDateFrom(bounds.dateFrom);
    setDateTo(bounds.dateTo);
    setPage(1);
  };

  const onDateFromChange = (value: string) => {
    setQuickRange("custom");
    setDateFrom(value);
    setPage(1);
  };

  const onDateToChange = (value: string) => {
    setQuickRange("custom");
    setDateTo(value);
    setPage(1);
  };

  const quickButtons: Array<{
    id: Exclude<SettlementQuickRange, "custom">;
    labelKey: "quickToday" | "quick7d" | "quick30d" | "quick90d";
  }> = [
    { id: "today", labelKey: "quickToday" },
    { id: "7d", labelKey: "quick7d" },
    { id: "30d", labelKey: "quick30d" },
    { id: "90d", labelKey: "quick90d" },
  ];

  return (
    <div className="space-y-4" dir={language === "ar" ? "rtl" : "ltr"}>
      <div>
        <h2 className="text-xl font-semibold text-white">
          {settlementRecordUiLabel("historyTitle", language)}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickButtons.map((btn) => (
          <Button
            key={btn.id}
            type="button"
            size="sm"
            variant={quickRange === btn.id ? "default" : "outline"}
            className="min-w-[4.5rem]"
            onClick={() => applyQuickRange(btn.id)}
          >
            {settlementRecordUiLabel(btn.labelKey, language)}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder={settlementRecordUiLabel("search", language)}
          aria-label={settlementRecordUiLabel("search", language)}
        />
        <div className="space-y-1">
          <label className="text-xs text-slate-400" htmlFor="settlement-date-from">
            {settlementRecordUiLabel("dateFrom", language)}
          </label>
          <Input
            id="settlement-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            aria-label={settlementRecordUiLabel("dateFrom", language)}
            className="[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400" htmlFor="settlement-date-to">
            {settlementRecordUiLabel("dateTo", language)}
          </label>
          <Input
            id="settlement-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            aria-label={settlementRecordUiLabel("dateTo", language)}
            className="[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400" htmlFor="settlement-status-facet">
            {settlementRecordUiLabel("filterStatus", language)}
          </label>
          <Select
            value={statusFacet}
            onValueChange={(v) => {
              setPage(1);
              setStatusFacet(v as SettlementHistoryStatusFacet);
            }}
          >
            <SelectTrigger
              id="settlement-status-facet"
              aria-label={settlementRecordUiLabel("filterStatus", language)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {settlementRecordUiLabel("allStatuses", language)}
              </SelectItem>
              <SelectItem value="paid">
                {settlementRecordUiLabel("paid", language)}
              </SelectItem>
              <SelectItem value="refunded">
                {settlementRecordUiLabel("refunded", language)}
              </SelectItem>
              <SelectItem value="complimentary">
                {settlementRecordUiLabel("complimentary", language)}
              </SelectItem>
              <SelectItem value="voided">
                {settlementRecordUiLabel("voided", language)}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400" htmlFor="settlement-source-filter">
            {settlementRecordUiLabel("filterSource", language)}
          </label>
          <Select
            value={sourceFilter}
            onValueChange={(v) => {
              setPage(1);
              setSourceFilter(v as SourceFilter);
            }}
          >
            <SelectTrigger
              id="settlement-source-filter"
              aria-label={settlementRecordUiLabel("filterSource", language)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {settlementRecordUiLabel("allSources", language)}
              </SelectItem>
              <SelectItem value="session">
                {settlementRecordUiLabel("sessionSource", language)}
              </SelectItem>
              <SelectItem value="check">
                {settlementRecordUiLabel("checkSource", language)}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className={cn(restaurantDash.panelInset, "overflow-x-auto p-0")}>
        {query.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            {settlementRecordUiLabel("loading", language)}
          </div>
        ) : null}

        {query.error ? (
          <p className="p-4 text-sm text-red-400">
            {settlementRecordErrorMessage(
              mapSettlementRecordApiError(query.error),
              language
            )}
          </p>
        ) : null}

        {!query.isLoading && !query.error && rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">
            {settlementRecordUiLabel("empty", language)}
          </p>
        ) : null}

        {rows.length > 0 ? (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-700/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-start font-medium">
                  {settlementRecordUiLabel("settlementNumber", language)}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {settlementRecordUiLabel("settlementTime", language)}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {settlementRecordUiLabel("source", language)}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {settlementRecordUiLabel("grandTotal", language)}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {settlementRecordUiLabel("paymentMethodSummary", language)}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {settlementRecordUiLabel("status", language)}
                </th>
                <th className="px-3 py-2 text-end font-medium">
                  <span className="sr-only">
                    {settlementRecordUiLabel("viewAction", language)}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.settlementRecordId}
                  className="border-b border-slate-800/80 text-slate-200"
                >
                  <td className="px-3 py-2 font-semibold tabular-nums tracking-wide">
                    {row.settlementNumber}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="leading-tight">
                      <div>{row.settlementTimeDateLabel}</div>
                      <div className="text-xs text-slate-400">
                        {row.settlementTimeClockLabel}
                      </div>
                      <div className="text-xs text-slate-500">
                        {settlementRecordUiLabel("businessDay", language)}{" "}
                        {row.businessDay}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.sourceLabel}</td>
                  <td className="px-3 py-2 tabular-nums">{row.grandTotalLabel}</td>
                  <td className="px-3 py-2">{row.paymentMethodSummaryLabel}</td>
                  <td className="px-3 py-2">
                    <div className="leading-tight">
                      <div>{row.statusLabel}</div>
                      {row.generationLabel ? (
                        <div className="text-xs text-slate-400">
                          {settlementRecordUiLabel("generation", language)}{" "}
                          {row.generationLabel}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            aria-label={settlementRecordUiLabel(
                              "receiptAction",
                              language
                            )}
                            onClick={() => setReceiptId(row.settlementRecordId)}
                          >
                            <Receipt className="h-4 w-4" aria-hidden />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {settlementRecordUiLabel("receiptAction", language)}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            aria-label={settlementRecordUiLabel(
                              "viewAction",
                              language
                            )}
                            onClick={() => setDetailId(row.settlementRecordId)}
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {settlementRecordUiLabel("viewAction", language)}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1 || query.isFetching}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {settlementRecordUiLabel("previous", language)}
        </Button>
        <p className="text-sm text-slate-300">
          {settlementRecordUiLabel("pageOf", language)} {page} / {totalPages}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={!query.data?.hasMore || query.isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          {settlementRecordUiLabel("next", language)}
        </Button>
      </div>

      <SettlementDetailSheet
        open={detailId != null}
        restaurantId={restaurantId}
        settlementRecordId={detailId}
        language={language}
        onOpenChange={(open) => !open && setDetailId(null)}
        onOpenSettlementRecord={(id) => setDetailId(id)}
        onViewReceipt={() => {
          if (detailId) setReceiptId(detailId);
        }}
      />

      <SettlementReceiptDialog
        open={receiptId != null}
        restaurantId={restaurantId}
        settlementRecordId={receiptId}
        language={language}
        restaurantName={restaurantName}
        onOpenChange={(open) => !open && setReceiptId(null)}
      />
    </div>
  );
}
