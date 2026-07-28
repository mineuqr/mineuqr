/**
 * SETTLEMENT-HISTORY-UX-RATIONALIZATION-1 / REFUND-PRESENTATION-ADOPTION-1
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2
 * Operational Settlement History (Unified Financial Entry Point).
 * Presentation only — Refund documents appear in the ledger; مرتجع is the write entry.
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
import {
  SemanticTable,
  SemanticTableScroll,
  SemanticTableRoot,
  SemanticTableHeader,
  SemanticTableBody,
  SemanticTableRow,
  SemanticTableHead,
  SemanticTableCell,
  SemanticTableToolbar,
  SemanticTableFilters,
  SemanticTablePagination,
  SemanticTableEmptyState,
  SemanticTableLoadingState,
  SemanticTableErrorState,
  SemanticTableActions,
} from "@/design-system/semantic-table";
import {
  SemanticBadge,
  mapSettlementStatusToBadgeTone,
} from "@/design-system/semantic-badge";
import { Eye, Receipt, Undo2 } from "lucide-react";
import { SettlementDetailSheet } from "./SettlementDetailSheet";
import { SettlementLedgerRefundDialog } from "./SettlementLedgerRefundDialog";
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
  const [refundOpen, setRefundOpen] = useState(false);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">
          {settlementRecordUiLabel("historyTitle", language)}
        </h2>
        <Button
          type="button"
          onClick={() => setRefundOpen(true)}
          className="gap-2"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
          {settlementRecordUiLabel("ledgerRefundAction", language)}
        </Button>
      </div>

      <SemanticTableToolbar className="flex-col items-stretch gap-3">
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

        <SemanticTableFilters>
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        </SemanticTableFilters>
      </SemanticTableToolbar>

      <SemanticTable>
        <section className={cn(restaurantDash.panelInset, "p-0")}>
          {query.isLoading ? (
            <SemanticTableLoadingState
              label={settlementRecordUiLabel("loading", language)}
            />
          ) : null}

          {query.error ? (
            <SemanticTableErrorState
              message={settlementRecordErrorMessage(
                mapSettlementRecordApiError(query.error),
                language
              )}
            />
          ) : null}

          {!query.isLoading && !query.error && rows.length === 0 ? (
            <SemanticTableEmptyState
              message={settlementRecordUiLabel("empty", language)}
            />
          ) : null}

          {rows.length > 0 ? (
            <SemanticTableScroll className="rounded-none border-0">
              <SemanticTableRoot density="ledger">
                <SemanticTableHeader density="ledger">
                  <SemanticTableRow density="ledger">
                    <SemanticTableHead density="ledger">
                      {settlementRecordUiLabel("documentNumber", language)}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {settlementRecordUiLabel("documentType", language)}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {settlementRecordUiLabel("settlementTime", language)}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {settlementRecordUiLabel("source", language)}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {settlementRecordUiLabel("grandTotal", language)}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {settlementRecordUiLabel("paymentMethodSummary", language)}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger">
                      {settlementRecordUiLabel("status", language)}
                    </SemanticTableHead>
                    <SemanticTableHead density="ledger" className="text-end">
                      <span className="sr-only">
                        {settlementRecordUiLabel("viewAction", language)}
                      </span>
                    </SemanticTableHead>
                  </SemanticTableRow>
                </SemanticTableHeader>
                <SemanticTableBody>
                  {rows.map((row) => (
                    <SemanticTableRow
                      key={row.settlementRecordId}
                      density="ledger"
                    >
                      <SemanticTableCell
                        density="ledger"
                        className="font-semibold tabular-nums tracking-wide"
                      >
                        <div>{row.documentNumber}</div>
                        {row.originSettlementNumber ? (
                          <div className="text-xs font-normal text-slate-400">
                            {settlementRecordUiLabel("originSettlementNumber", language)}{" "}
                            {row.originSettlementNumber}
                          </div>
                        ) : null}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">
                        {row.documentTypeLabel}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger" className="whitespace-nowrap">
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
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">
                        {row.sourceLabel}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger" className="tabular-nums">
                        {row.grandTotalLabel}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">
                        {row.paymentMethodSummaryLabel}
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger">
                        <div className="leading-tight">
                          <SemanticBadge
                            tone={mapSettlementStatusToBadgeTone(row.settlementStatus)}
                          >
                            {row.statusLabel}
                          </SemanticBadge>
                          {row.generationLabel ? (
                            <div className="mt-1 text-xs text-slate-400">
                              {settlementRecordUiLabel("generation", language)}{" "}
                              {row.generationLabel}
                            </div>
                          ) : null}
                        </div>
                      </SemanticTableCell>
                      <SemanticTableCell density="ledger" actions>
                        <SemanticTableActions>
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
                        </SemanticTableActions>
                      </SemanticTableCell>
                    </SemanticTableRow>
                  ))}
                </SemanticTableBody>
              </SemanticTableRoot>
            </SemanticTableScroll>
          ) : null}
        </section>

        <SemanticTablePagination>
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
        </SemanticTablePagination>
      </SemanticTable>

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

      <SettlementLedgerRefundDialog
        open={refundOpen}
        restaurantId={restaurantId}
        language={language}
        onOpenChange={setRefundOpen}
        onPublished={(id) => {
          if (id) setDetailId(id);
        }}
        onSaveAndPrint={(id) => {
          if (id) setReceiptId(id);
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
