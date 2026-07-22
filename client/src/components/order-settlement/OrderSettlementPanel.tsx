/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — Check Order Settlement panel.
 * Renders API View Models only.
 */

import { useMemo } from "react";
import { formatRiyadhDateTime } from "@/lib/datetime";
import {
  mapOrderSettlementApiError,
  orderSettlementErrorMessage,
  orderSettlementUiLabel,
  toOrderSettlementPanelViewModel,
  useOrderSettlementSummaryByCheck,
  useOrderSettlementsByCheck,
  type OrderSettlementLang,
} from "@/lib/order-settlement-presentation";
import { cn } from "@/lib/utils";
import { restaurantDash, restaurantSemantic } from "@/components/dashboard/restaurantDashStyles";
import { Clock3, Loader2 } from "lucide-react";

type OrderSettlementPanelProps = {
  restaurantId: number;
  checkId: number | null | undefined;
  language: OrderSettlementLang;
  currencySymbol: string;
  /** When false, queries stay disabled (e.g. sheet closed). */
  enabled?: boolean;
  showDiagnostics?: boolean;
};

export function OrderSettlementPanel({
  restaurantId,
  checkId,
  language,
  currencySymbol,
  enabled = true,
  showDiagnostics = false,
}: OrderSettlementPanelProps) {
  const queryEnabled =
    enabled && checkId != null && checkId > 0 && restaurantId > 0;

  const listQuery = useOrderSettlementsByCheck(
    { restaurantId, checkId: checkId ?? 0 },
    { enabled: queryEnabled }
  );
  const summaryQuery = useOrderSettlementSummaryByCheck(
    { restaurantId, checkId: checkId ?? 0 },
    { enabled: queryEnabled }
  );

  const panel = useMemo(
    () =>
      toOrderSettlementPanelViewModel({
        list: listQuery.data,
        summary: summaryQuery.data,
        language,
        currencySymbol,
      }),
    [listQuery.data, summaryQuery.data, language, currencySymbol]
  );

  const isLoading = queryEnabled && (listQuery.isLoading || summaryQuery.isLoading);
  const error = listQuery.error ?? summaryQuery.error;

  if (!queryEnabled) {
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={orderSettlementUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {orderSettlementUiLabel("sectionTitle", language)}
        </h3>
        <EmptyState language={language} />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={orderSettlementUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {orderSettlementUiLabel("sectionTitle", language)}
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {orderSettlementUiLabel("loading", language)}
        </div>
      </section>
    );
  }

  if (error) {
    const kind = mapOrderSettlementApiError(error);
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={orderSettlementUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {orderSettlementUiLabel("sectionTitle", language)}
        </h3>
        <div
          className={cn(
            "rounded-lg border px-3 py-3 text-sm",
            restaurantSemantic.rowWarning
          )}
        >
          {orderSettlementErrorMessage(kind, language)}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(restaurantDash.panelInset, "p-4")}
      aria-label={orderSettlementUiLabel("sectionTitle", language)}
    >
      <h3 className="mb-3 text-sm font-semibold text-white">
        {orderSettlementUiLabel("sectionTitle", language)}
      </h3>

      {panel.isEmpty ? (
        <EmptyState language={language} />
      ) : (
        <ul className="flex flex-col gap-2">
          {panel.rows.map((row) => (
            <li
              key={`${row.checkId}-${row.orderId}`}
              className="rounded-lg border border-cyan-500/15 bg-slate-900/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-100">
                  {orderSettlementUiLabel("orderLabel", language)} #{row.orderId}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  {row.statusLabel}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <dt>{orderSettlementUiLabel("settledAmount", language)}</dt>
                  <dd className="tabular-nums text-slate-200">
                    {row.settledAmountDisplay}
                  </dd>
                </div>
                <div>
                  <dt>{orderSettlementUiLabel("outstandingAmount", language)}</dt>
                  <dd className="tabular-nums text-slate-200">
                    {row.outstandingAmountDisplay}
                  </dd>
                </div>
              </dl>
              {row.lastSettlementAt ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  {formatRiyadhDateTime(
                    row.lastSettlementAt,
                    language === "ar" ? "ar-SA" : "en-US",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {panel.summary && panel.summary.totalCount > 0 ? (
        <div className="mt-3 border-t border-cyan-500/10 pt-3 text-xs text-slate-400">
          <p className="mb-1 font-medium text-slate-300">
            {orderSettlementUiLabel("summaryTitle", language)}
          </p>
          <p>
            {orderSettlementUiLabel("totalOrders", language)}:{" "}
            <span className="tabular-nums text-slate-200">
              {panel.summary.totalCount}
            </span>
            {" · "}
            {orderSettlementStatusChip(
              "settled",
              panel.summary.settledCount,
              language
            )}
            {" · "}
            {orderSettlementStatusChip(
              "pending",
              panel.summary.pendingCount,
              language
            )}
          </p>
        </div>
      ) : null}

      {showDiagnostics && panel.rows[0] ? (
        <p className="mt-2 text-[10px] text-slate-600" title={panel.rows[0].projectionRevision}>
          {orderSettlementUiLabel("diagnostics", language)}:{" "}
          {panel.rows[0].projectionId} · v{panel.rows[0].projectionSchemaVersion}
        </p>
      ) : null}
    </section>
  );
}

function EmptyState({ language }: { language: OrderSettlementLang }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-3",
        restaurantSemantic.rowWarning
      )}
    >
      <Clock3 className={cn("h-5 w-5 shrink-0", restaurantSemantic.iconWarning)} aria-hidden />
      <p className="text-sm text-orange-200">
        {orderSettlementUiLabel("empty", language)}
      </p>
    </div>
  );
}

function orderSettlementStatusChip(
  status: "settled" | "pending",
  count: number,
  language: OrderSettlementLang
): string {
  const label =
    status === "settled"
      ? language === "ar"
        ? "مسوّى"
        : "Settled"
      : language === "ar"
        ? "معلق"
        : "Pending";
  return `${label} ${count}`;
}
