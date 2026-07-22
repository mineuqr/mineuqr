/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — Check Split Payment panel.
 * Renders API View Models only.
 */

import { useMemo, useState } from "react";
import { formatRiyadhDateTime } from "@/lib/datetime";
import {
  mapSplitPaymentApiError,
  splitPaymentErrorMessage,
  splitPaymentUiLabel,
  toSplitPaymentAttemptViewModelList,
  toSplitPaymentPanelViewModel,
  useSplitPaymentAttemptsByCheck,
  useSplitPaymentOutstanding,
  useSplitPaymentSummaryByCheck,
  useSplitPaymentsByCheck,
  type SplitPaymentLang,
} from "@/lib/split-payment-presentation";
import { cn } from "@/lib/utils";
import { restaurantDash, restaurantSemantic } from "@/components/dashboard/restaurantDashStyles";
import { ChevronDown, Clock3, Loader2 } from "lucide-react";

type SplitPaymentPanelProps = {
  restaurantId: number;
  checkId: number | null | undefined;
  language: SplitPaymentLang;
  currencySymbol: string;
  /** When false, queries stay disabled (e.g. sheet closed). */
  enabled?: boolean;
  showDiagnostics?: boolean;
};

export function SplitPaymentPanel({
  restaurantId,
  checkId,
  language,
  currencySymbol,
  enabled = true,
  showDiagnostics = false,
}: SplitPaymentPanelProps) {
  const queryEnabled =
    enabled && checkId != null && checkId > 0 && restaurantId > 0;
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(
    null
  );

  const listQuery = useSplitPaymentsByCheck(
    { restaurantId, checkId: checkId ?? 0 },
    { enabled: queryEnabled }
  );
  const outstandingQuery = useSplitPaymentOutstanding(
    { restaurantId, checkId: checkId ?? 0 },
    { enabled: queryEnabled }
  );
  const summaryQuery = useSplitPaymentSummaryByCheck(
    { restaurantId, checkId: checkId ?? 0 },
    { enabled: queryEnabled }
  );
  const attemptsQuery = useSplitPaymentAttemptsByCheck(
    { restaurantId, checkId: checkId ?? 0 },
    { enabled: queryEnabled }
  );

  const outstandingMissing =
    outstandingQuery.error != null &&
    mapSplitPaymentApiError(outstandingQuery.error) === "notFound";
  const outstandingFatal =
    outstandingQuery.error != null && !outstandingMissing;

  const panel = useMemo(
    () =>
      toSplitPaymentPanelViewModel({
        list: listQuery.data,
        outstanding: outstandingMissing ? null : outstandingQuery.data,
        summary: summaryQuery.data,
        language,
        currencySymbol,
      }),
    [
      listQuery.data,
      outstandingQuery.data,
      outstandingMissing,
      summaryQuery.data,
      language,
      currencySymbol,
    ]
  );

  const attempts = useMemo(
    () =>
      toSplitPaymentAttemptViewModelList(
        attemptsQuery.data,
        language,
        currencySymbol
      ),
    [attemptsQuery.data, language, currencySymbol]
  );

  const isLoading =
    queryEnabled &&
    (listQuery.isLoading ||
      outstandingQuery.isLoading ||
      summaryQuery.isLoading);
  const error =
    listQuery.error ?? summaryQuery.error ?? (outstandingFatal ? outstandingQuery.error : null);

  if (!queryEnabled) {
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={splitPaymentUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {splitPaymentUiLabel("sectionTitle", language)}
        </h3>
        <EmptyState language={language} />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={splitPaymentUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {splitPaymentUiLabel("sectionTitle", language)}
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {splitPaymentUiLabel("loading", language)}
        </div>
      </section>
    );
  }

  if (error) {
    const kind = mapSplitPaymentApiError(error);
    return (
      <section
        className={cn(restaurantDash.panelInset, "p-4")}
        aria-label={splitPaymentUiLabel("sectionTitle", language)}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">
          {splitPaymentUiLabel("sectionTitle", language)}
        </h3>
        <div
          className={cn(
            "rounded-lg border px-3 py-3 text-sm",
            restaurantSemantic.rowWarning
          )}
        >
          {splitPaymentErrorMessage(kind, language)}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(restaurantDash.panelInset, "p-4")}
      aria-label={splitPaymentUiLabel("sectionTitle", language)}
    >
      <h3 className="mb-1 text-sm font-semibold text-white">
        {splitPaymentUiLabel("sectionTitle", language)}
      </h3>
      <p className="mb-3 text-[11px] text-slate-500">
        {splitPaymentUiLabel("notFinancialSettlement", language)}
      </p>

      {panel.outstanding ? (
        <div className="mb-3 rounded-lg border border-cyan-500/15 bg-slate-900/40 px-3 py-2">
          <p className="mb-2 text-xs font-medium text-slate-300">
            {splitPaymentUiLabel("outstandingTitle", language)}
          </p>
          <dl className="grid grid-cols-3 gap-2 text-xs text-slate-400">
            <div>
              <dt>{splitPaymentUiLabel("financialResponsibility", language)}</dt>
              <dd className="tabular-nums text-slate-200">
                {panel.outstanding.financialResponsibilityDisplay}
              </dd>
            </div>
            <div>
              <dt>{splitPaymentUiLabel("appliedPaymentValue", language)}</dt>
              <dd className="tabular-nums text-slate-200">
                {panel.outstanding.appliedPaymentValueDisplay}
              </dd>
            </div>
            <div>
              <dt>{splitPaymentUiLabel("outstandingBalance", language)}</dt>
              <dd className="tabular-nums text-slate-200">
                {panel.outstanding.outstandingBalanceDisplay}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {panel.isEmpty ? (
        <EmptyState language={language} />
      ) : (
        <ul className="flex flex-col gap-2">
          {panel.rows.map((row) => {
            const expanded = expandedPaymentId === row.paymentId;
            return (
              <li
                key={row.paymentId}
                className="rounded-lg border border-cyan-500/15 bg-slate-900/40 px-3 py-2"
              >
                <button
                  type="button"
                  className="flex w-full flex-wrap items-baseline justify-between gap-2 text-start"
                  onClick={() =>
                    setExpandedPaymentId(expanded ? null : row.paymentId)
                  }
                  aria-expanded={expanded}
                >
                  <span className="text-sm font-medium text-slate-100">
                    {splitPaymentUiLabel("paymentLabel", language)}{" "}
                    {row.paymentReference}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                    {row.statusLabel}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        expanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </span>
                </button>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <div>
                    <dt>{splitPaymentUiLabel("amount", language)}</dt>
                    <dd className="tabular-nums text-slate-200">
                      {row.amountDisplay}
                    </dd>
                  </div>
                  <div>
                    <dt>{splitPaymentUiLabel("allocatedAmount", language)}</dt>
                    <dd className="tabular-nums text-slate-200">
                      {row.allocatedAmountDisplay}
                    </dd>
                  </div>
                  <div>
                    <dt>{splitPaymentUiLabel("unallocatedAmount", language)}</dt>
                    <dd className="tabular-nums text-slate-200">
                      {row.unallocatedAmountDisplay}
                    </dd>
                  </div>
                </dl>

                {expanded ? (
                  <div className="mt-3 space-y-3 border-t border-cyan-500/10 pt-3 text-xs text-slate-400">
                    {row.tenders.length > 0 ? (
                      <div>
                        <p className="mb-1 font-medium text-slate-300">
                          {splitPaymentUiLabel("tendersTitle", language)}
                        </p>
                        <ul className="space-y-1">
                          {row.tenders.map((t) => (
                            <li
                              key={t.tenderId}
                              className="flex justify-between gap-2"
                            >
                              <span>{t.method}</span>
                              <span className="tabular-nums text-slate-200">
                                {t.amountDisplay}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {row.allocations.length > 0 ? (
                      <div>
                        <p className="mb-1 font-medium text-slate-300">
                          {splitPaymentUiLabel("allocationsTitle", language)}
                        </p>
                        <ul className="space-y-1">
                          {row.allocations.map((a) => (
                            <li
                              key={a.allocationId}
                              className="flex justify-between gap-2"
                            >
                              <span>
                                {splitPaymentUiLabel("orderLabel", language)} #
                                {a.orderId}
                              </span>
                              <span className="tabular-nums text-slate-200">
                                {a.amountDisplay}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {row.timeline.length > 0 ? (
                      <div>
                        <p className="mb-1 font-medium text-slate-300">
                          {splitPaymentUiLabel("timelineTitle", language)}
                        </p>
                        <ul className="space-y-1">
                          {row.timeline.map((e) => (
                            <li
                              key={`${e.kind}-${e.id}`}
                              className="flex justify-between gap-2"
                            >
                              <span>
                                {e.kind}
                                {e.method ? ` · ${e.method}` : ""}
                                {e.orderId != null
                                  ? ` · #${e.orderId}`
                                  : ""}
                              </span>
                              <span className="tabular-nums text-slate-200">
                                {e.amountDisplay}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {row.lastPaymentActivityAt ? (
                      <p className="text-[11px] text-slate-500">
                        {formatRiyadhDateTime(
                          row.lastPaymentActivityAt,
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
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {attempts.length > 0 ? (
        <div className="mt-3 border-t border-cyan-500/10 pt-3 text-xs text-slate-400">
          <p className="mb-1 font-medium text-slate-300">
            {splitPaymentUiLabel("attemptsTitle", language)}
          </p>
          <ul className="space-y-1">
            {attempts.map((attempt) => (
              <li
                key={attempt.attemptId}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <span>
                  {attempt.method} · {attempt.statusLabel}
                </span>
                <span className="tabular-nums text-slate-200">
                  {attempt.amountDisplay}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {panel.summary && panel.summary.totalCount > 0 ? (
        <div className="mt-3 border-t border-cyan-500/10 pt-3 text-xs text-slate-400">
          <p className="mb-1 font-medium text-slate-300">
            {splitPaymentUiLabel("summaryTitle", language)}
          </p>
          <p>
            {splitPaymentUiLabel("totalPayments", language)}:{" "}
            <span className="tabular-nums text-slate-200">
              {panel.summary.totalCount}
            </span>
            {" · "}
            {language === "ar" ? "مطبق" : "Applied"} {panel.summary.appliedCount}
            {" · "}
            {language === "ar" ? "معلق" : "Pending"} {panel.summary.pendingCount}
          </p>
        </div>
      ) : null}

      {showDiagnostics && panel.rows[0] ? (
        <p
          className="mt-2 text-[10px] text-slate-600"
          title={panel.rows[0].projection.projectionRevision}
        >
          {splitPaymentUiLabel("diagnostics", language)}:{" "}
          {panel.rows[0].projection.projectionId} · v
          {panel.rows[0].projection.projectionSchemaVersion}
          {" · "}
          {splitPaymentUiLabel("apiContract", language)} v
          {panel.rows[0].projection.apiContractVersion}
        </p>
      ) : null}
    </section>
  );
}

function EmptyState({ language }: { language: SplitPaymentLang }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-3",
        restaurantSemantic.rowWarning
      )}
    >
      <Clock3
        className={cn("h-5 w-5 shrink-0", restaurantSemantic.iconWarning)}
        aria-hidden
      />
      <p className="text-sm text-orange-200">
        {splitPaymentUiLabel("empty", language)}
      </p>
    </div>
  );
}
