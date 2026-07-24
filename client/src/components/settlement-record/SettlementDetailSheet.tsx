/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — read-only Settlement Detail.
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import {
  mapSettlementRecordApiError,
  settlementRecordErrorMessage,
  settlementRecordUiLabel,
  toSettlementDetailViewModel,
  useSettlementRecordDetail,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type SettlementDetailSheetProps = {
  open: boolean;
  restaurantId: number;
  settlementRecordId: string | null;
  language: SettlementRecordLang;
  onOpenChange: (open: boolean) => void;
  onViewReceipt?: () => void;
  onViewHistory?: () => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-white break-all">{value}</p>
    </div>
  );
}

export function SettlementDetailSheet({
  open,
  restaurantId,
  settlementRecordId,
  language,
  onOpenChange,
  onViewReceipt,
  onViewHistory,
}: SettlementDetailSheetProps) {
  const query = useSettlementRecordDetail(
    {
      restaurantId,
      settlementRecordId: settlementRecordId ?? "",
    },
    { enabled: open && !!settlementRecordId }
  );

  const vm = useMemo(
    () => (query.data ? toSettlementDetailViewModel(query.data, language) : null),
    [query.data, language]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-slate-700/50 bg-slate-950 sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle className="text-white">
            {settlementRecordUiLabel("detailTitle", language)}
          </SheetTitle>
          <p className="text-xs text-slate-400">
            {settlementRecordUiLabel("readOnly", language)}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {settlementRecordUiLabel("loading", language)}
            </div>
          ) : null}

          {query.error ? (
            <p className="text-sm text-red-400">
              {settlementRecordErrorMessage(
                mapSettlementRecordApiError(query.error),
                language
              )}
            </p>
          ) : null}

          {vm ? (
            <>
              <section className={cn(restaurantDash.panelInset, "space-y-3 p-4")}>
                <Field
                  label={settlementRecordUiLabel("settlementNumber", language)}
                  value={vm.settlementNumber}
                />
                <Field
                  label={settlementRecordUiLabel("settlementTime", language)}
                  value={vm.settlementTimeLabel}
                />
                <Field
                  label={settlementRecordUiLabel("settlementStatus", language)}
                  value={vm.settlementStatusLabel}
                />
                <Field
                  label={settlementRecordUiLabel("sourceType", language)}
                  value={vm.sourceTypeLabel}
                />
                <Field
                  label={settlementRecordUiLabel("sourceNumber", language)}
                  value={vm.sourceIdentifier}
                />
                <Field
                  label={settlementRecordUiLabel("grandTotal", language)}
                  value={vm.grandTotalLabel}
                />
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("orders", language)}
                </h3>
                {vm.orders.length === 0 ? (
                  <p className="text-sm text-slate-400">—</p>
                ) : (
                  vm.orders.map((o) => (
                    <p key={o.orderId} className="text-sm text-slate-200">
                      {o.label}
                    </p>
                  ))
                )}
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("checks", language)}
                </h3>
                {vm.checks.map((c) => (
                  <p key={c.label} className="text-sm text-slate-200">
                    {c.label}
                  </p>
                ))}
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("items", language)}
                </h3>
                {vm.items.length === 0 ? (
                  <p className="text-sm text-slate-400">—</p>
                ) : (
                  vm.items.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between gap-2 text-sm text-slate-200"
                    >
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="tabular-nums text-slate-300">
                        {item.unitPriceLabel}
                      </span>
                    </div>
                  ))
                )}
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("financial", language)}
                </h3>
                <Field
                  label={settlementRecordUiLabel("subtotal", language)}
                  value={vm.financial.subtotalLabel}
                />
                <Field
                  label={settlementRecordUiLabel("discount", language)}
                  value={vm.financial.discountLabel}
                />
                <Field
                  label={settlementRecordUiLabel("taxAmount", language)}
                  value={vm.financial.taxLabel}
                />
                <Field
                  label={settlementRecordUiLabel("grandTotal", language)}
                  value={vm.financial.grandTotalLabel}
                />
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("tax", language)}
                </h3>
                {vm.taxLines.length === 0 ? (
                  <p className="text-sm text-slate-400">—</p>
                ) : (
                  vm.taxLines.map((line) => (
                    <div
                      key={line.name}
                      className="flex justify-between text-sm text-slate-200"
                    >
                      <span>
                        {line.name} ({line.rateLabel})
                      </span>
                      <span className="tabular-nums">{line.amountLabel}</span>
                    </div>
                  ))
                )}
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("payments", language)}
                </h3>
                {vm.payments.length === 0 ? (
                  <p className="text-sm text-slate-400">—</p>
                ) : (
                  vm.payments.map((p, idx) => (
                    <div
                      key={`${p.methodLabel}-${idx}`}
                      className="flex justify-between text-sm text-slate-200"
                    >
                      <span>
                        {p.methodLabel} · {p.statusLabel}
                      </span>
                      <span className="tabular-nums">{p.amountLabel}</span>
                    </div>
                  ))
                )}
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("operator", language)}
                </h3>
                <p className="text-sm text-slate-200">{vm.operatorLabel}</p>
              </section>

              <section className={cn(restaurantDash.panelInset, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-white">
                  {settlementRecordUiLabel("audit", language)}
                </h3>
                <Field label="createdAt" value={vm.createdAtLabel} />
                <Field label="settledAt" value={vm.settledAtLabel} />
                <Field label="businessDay" value={vm.businessDay} />
              </section>

              <div className="flex flex-col gap-2 sm:flex-row">
                {onViewReceipt ? (
                  <Button type="button" className="flex-1" onClick={onViewReceipt}>
                    {settlementRecordUiLabel("viewReceipt", language)}
                  </Button>
                ) : null}
                {onViewHistory ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={onViewHistory}
                  >
                    {settlementRecordUiLabel("viewHistory", language)}
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
