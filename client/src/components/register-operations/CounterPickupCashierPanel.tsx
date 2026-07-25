/**
 * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — Phase 4
 * Cashier unpaid sessionless Check queue: Settle + Cancel.
 * Reuses MarkPaidSettlementDialog. Money stays on Check settle façade.
 */

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkPaidSettlementDialog } from "@/components/dashboard/MarkPaidSettlementDialog";
import { trpc } from "@/lib/trpc";
import { readActiveRegister } from "@/lib/register-operations-presentation";
import type { RegisterOperationsLang } from "@/lib/register-operations-presentation";
import type { StaffSettlementLineInput } from "@shared/operational-session";

type Props = {
  restaurantId: number;
  language: RegisterOperationsLang;
  registerId: string | null;
  shiftOpen: boolean;
  currencySymbol?: string;
};

function copy(
  key:
    | "title"
    | "search"
    | "empty"
    | "needShift"
    | "settle"
    | "cancel"
    | "settled"
    | "cancelled"
    | "refresh",
  language: RegisterOperationsLang
): string {
  const ar: Record<typeof key, string> = {
    title: "طلبات الكاونتر غير المدفوعة",
    search: "بحث برقم الاستلام…",
    empty: "لا توجد طلبات غير مدفوعة",
    needShift: "افتح وردية على الصندوق لتسوية طلبات الكاونتر",
    settle: "تحصيل",
    cancel: "إلغاء",
    settled: "تم التحصيل",
    cancelled: "تم الإلغاء",
    refresh: "تحديث",
  };
  const en: Record<typeof key, string> = {
    title: "Unpaid counter pickup",
    search: "Search pickup number…",
    empty: "No unpaid counter orders",
    needShift: "Open a Financial Shift on this register to settle",
    settle: "Settle",
    cancel: "Cancel",
    settled: "Settled",
    cancelled: "Cancelled",
    refresh: "Refresh",
  };
  return language === "ar" ? ar[key] : en[key];
}

export function CounterPickupCashierPanel({
  restaurantId,
  language,
  registerId,
  shiftOpen,
  currencySymbol = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [settleOrderId, setSettleOrderId] = useState<number | null>(null);
  const [settleAmount, setSettleAmount] = useState("0.00");
  const utils = trpc.useUtils();

  const listQuery = trpc.order.listUnpaidCounterPickup.useQuery(
    {
      restaurantId,
      query: query.trim() || undefined,
      limit: 40,
    },
    { refetchInterval: 15_000 }
  );

  const settleMutation = trpc.order.staffSettleCounterPickup.useMutation({
    onSuccess: () => {
      toast.success(copy("settled", language));
      setSettleOrderId(null);
      void utils.order.listUnpaidCounterPickup.invalidate();
      void utils.crmp.financialShift.getTenderSummary.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const cancelMutation = trpc.order.staffCancelCounterPickup.useMutation({
    onSuccess: () => {
      toast.success(copy("cancelled", language));
      void utils.order.listUnpaidCounterPickup.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const rows = listQuery.data ?? [];
  const activeRegisterId =
    registerId?.trim() || readActiveRegister(restaurantId);

  const settleRow = useMemo(
    () => rows.find((r) => r.orderId === settleOrderId) ?? null,
    [rows, settleOrderId]
  );

  function openSettle(orderId: number, grandTotal: string) {
    if (!shiftOpen || !activeRegisterId) {
      toast.error(copy("needShift", language));
      return;
    }
    setSettleAmount(grandTotal);
    setSettleOrderId(orderId);
  }

  function confirmSettle(settlements: readonly StaffSettlementLineInput[]) {
    if (settleOrderId == null || !activeRegisterId) return;
    settleMutation.mutate({
      restaurantId,
      orderId: settleOrderId,
      registerId: activeRegisterId,
      settlements: [...settlements],
    });
  }

  function runCancel(orderId: number) {
    if (!window.confirm(copy("cancel", language) + "?")) return;
    cancelMutation.mutate({
      restaurantId,
      orderId,
      registerId: activeRegisterId ?? undefined,
    });
  }

  const busy = settleMutation.isPending || cancelMutation.isPending;
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <section
      dir={dir}
      aria-label={copy("title", language)}
      className="rounded-xl border border-violet-500/25 bg-violet-950/15 p-3 sm:p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-violet-100">
          {copy("title", language)}
        </h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-violet-200"
          disabled={listQuery.isFetching}
          onClick={() => void listQuery.refetch()}
        >
          {listQuery.isFetching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            copy("refresh", language)
          )}
        </Button>
      </div>

      {!shiftOpen && (
        <p className="mb-3 text-xs text-amber-200/90" role="status">
          {copy("needShift", language)}
        </p>
      )}

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={copy("search", language)}
        className="mb-3 bg-slate-950/40"
        aria-label={copy("search", language)}
      />

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">{copy("empty", language)}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={`${row.checkId}-${row.orderId}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-950/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {row.displayReference}
                </p>
                <p className="text-xs text-slate-400">
                  #{row.orderId} · {row.orderStatus} · {currencySymbol}
                  {row.grandTotal}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !shiftOpen}
                  onClick={() => openSettle(row.orderId, row.grandTotal)}
                >
                  {copy("settle", language)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => runCancel(row.orderId)}
                >
                  {copy("cancel", language)}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MarkPaidSettlementDialog
        open={settleOrderId != null}
        language={language === "ar" ? "ar" : "en"}
        pending={settleMutation.isPending}
        outstandingAmount={settleRow?.grandTotal ?? settleAmount}
        currencySymbol={settleRow?.currencySymbol || currencySymbol}
        onOpenChange={(open) => {
          if (!open) setSettleOrderId(null);
        }}
        onConfirm={confirmSettle}
      />
    </section>
  );
}
