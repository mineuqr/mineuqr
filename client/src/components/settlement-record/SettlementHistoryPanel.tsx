/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — Settlement History (paginated + filters).
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
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  mapSettlementRecordApiError,
  settlementRecordErrorMessage,
  settlementRecordUiLabel,
  toSettlementHistoryRowViewModel,
  useSettlementRecordHistory,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { SettlementDetailSheet } from "./SettlementDetailSheet";
import { SettlementReceiptDialog } from "./SettlementReceiptDialog";

type SettlementHistoryPanelProps = {
  restaurantId: number;
  language: SettlementRecordLang;
  restaurantName?: string;
  currencySymbol?: string;
};

export function SettlementHistoryPanel({
  restaurantId,
  language,
  restaurantName,
}: SettlementHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [outcome, setOutcome] = useState<"all" | "paid" | "complimentary" | "voided">(
    "all"
  );
  const [detailId, setDetailId] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const query = useSettlementRecordHistory({
    restaurantId,
    page,
    pageSize: 20,
    search: search.trim() || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    outcome: outcome === "all" ? null : outcome,
  });

  const rows = useMemo(
    () =>
      (query.data?.items ?? []).map((item) =>
        toSettlementHistoryRowViewModel(item, language)
      ),
    [query.data?.items, language]
  );

  const totalPages = Math.max(
    1,
    Math.ceil((query.data?.totalCount ?? 0) / (query.data?.pageSize ?? 20))
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">
          {settlementRecordUiLabel("historyTitle", language)}
        </h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder={settlementRecordUiLabel("search", language)}
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setPage(1);
            setDateFrom(e.target.value);
          }}
          aria-label={settlementRecordUiLabel("dateFrom", language)}
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setPage(1);
            setDateTo(e.target.value);
          }}
          aria-label={settlementRecordUiLabel("dateTo", language)}
        />
        <Select
          value={outcome}
          onValueChange={(v) => {
            setPage(1);
            setOutcome(v as typeof outcome);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={settlementRecordUiLabel("filterStatus", language)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {settlementRecordUiLabel("allStatuses", language)}
            </SelectItem>
            <SelectItem value="paid">
              {settlementRecordUiLabel("paid", language)}
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-700/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("settlementNumber", language)}
                </th>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("settlementTime", language)}
                </th>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("sourceType", language)}
                </th>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("sourceNumber", language)}
                </th>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("grandTotal", language)}
                </th>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("paymentStatus", language)}
                </th>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("paymentMethodSummary", language)}
                </th>
                <th className="px-3 py-2 font-medium">
                  {settlementRecordUiLabel("settlementStatus", language)}
                </th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.settlementRecordId}
                  className="border-b border-slate-800/80 text-slate-200"
                >
                  <td className="max-w-[160px] truncate px-3 py-2 font-mono text-xs">
                    {row.settlementNumber}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.settlementTimeLabel}</td>
                  <td className="px-3 py-2">{row.sourceTypeLabel}</td>
                  <td className="px-3 py-2">{row.sourceNumber}</td>
                  <td className="px-3 py-2 tabular-nums">{row.grandTotalLabel}</td>
                  <td className="px-3 py-2">{row.paymentStatusLabel}</td>
                  <td className="px-3 py-2">{row.paymentMethodSummaryLabel}</td>
                  <td className="px-3 py-2">{row.settlementStatusLabel}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailId(row.settlementRecordId)}
                      >
                        {settlementRecordUiLabel("viewDetail", language)}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setReceiptId(row.settlementRecordId)}
                      >
                        {settlementRecordUiLabel("viewReceipt", language)}
                      </Button>
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
