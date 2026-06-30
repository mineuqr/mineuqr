import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  printWorkspaceListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { usePrintWorkspaceActionPort } from "@/lib/print-workspace/usePrintWorkspaceActions";
import {
  formatStatusLabel,
  toPrintWorkspaceOrderCard,
  type PrintWorkspaceViewFilter,
} from "@/lib/print-workspace/viewModels";
import { usePrintWorkspaceState } from "@/lib/print-workspace/usePrintWorkspaceState";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Eye, Loader2, Printer, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

const VIEW_TABS: { id: PrintWorkspaceViewFilter; en: string; ar: string }[] = [
  { id: "awaiting", en: "Awaiting print", ar: "بانتظار الطباعة" },
  { id: "completed", en: "Recently completed", ar: "مكتملة مؤخراً" },
  { id: "all", en: "All orders", ar: "كل الطلبات" },
];

export function PrintWorkspacePanel({
  restaurantId,
  language,
  currencySymbol,
}: {
  restaurantId: number;
  language: string;
  currencySymbol?: string;
}) {
  const isAr = language === "ar";
  const sym = currencySymbol || "ر.س";
  const { isAuthenticated, authPending } = useAuth();
  const utils = trpc.useUtils();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const { state, setView, setSearch, setStatusFilter, selectOrder, queryInput } =
    usePrintWorkspaceState();

  useDevQueryRuntimeLog("printWorkspace.read.listOrders", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? 10_000 : undefined,
  });

  const listQuery = trpc.printWorkspace.read.listOrders.useQuery(
    { restaurantId, ...queryInput, limit: 50 },
    printWorkspaceListQueryOptions(queriesEnabled)
  );

  const detailQuery = trpc.printWorkspace.read.getOrderDetail.useQuery(
    { restaurantId, orderId: state.selectedOrderId ?? 0 },
    { enabled: queriesEnabled && state.selectedOrderId != null }
  );

  const printActions = usePrintWorkspaceActionPort(
    restaurantId,
    detailQuery.data?.order.orderId ?? 0,
    detailQuery.data?.order.orderNumber ?? "",
    () => {
      void detailQuery.refetch();
    }
  );

  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  const activePrintJob = useMemo(
    () =>
      detailQuery.data?.printJobs.find((job) =>
        ["pending", "dispatched", "printing"].includes(job.status)
      ) ?? null,
    [detailQuery.data?.printJobs]
  );

  const cards = useMemo(
    () => (listQuery.data?.items ?? []).map((o) => toPrintWorkspaceOrderCard(o, language)),
    [listQuery.data?.items, language]
  );

  const verificationError = isEmailNotVerifiedError(listQuery.error) ? listQuery.error : null;

  const pageTitle = isAr ? "مساحة الطباعة" : "Print Workspace";
  const pageSub = isAr
    ? "عرض تشغيلي للطلبات القابلة للطباعة — من نموذج القراءة فقط"
    : "Operational view of printable orders — read model only";

  return (
    <div className={restaurantDash.stack}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{pageTitle}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{pageSub}</p>
      </div>

      {verificationError ? (
        <VerificationRequiredPanel variant="orders" compact />
      ) : (
        <>
          <RestaurantDashSection title={isAr ? "التصفية" : "Filters"}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {VIEW_TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    size="sm"
                    variant={state.view === tab.id ? "default" : "outline"}
                    onClick={() => setView(tab.id)}
                  >
                    {isAr ? tab.ar : tab.en}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={state.search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isAr ? "بحث برقم الطلب أو العميل" : "Search order # or customer"}
                  className="max-w-xs bg-slate-900/60"
                />
                <select
                  className="h-9 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-200"
                  value={state.statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as typeof state.statusFilter)
                  }
                >
                  <option value="">{isAr ? "كل الحالات" : "All statuses"}</option>
                  {(["pending", "preparing", "ready", "served", "cancelled"] as const).map(
                    (s) => (
                      <option key={s} value={s}>
                        {formatStatusLabel(s, language)}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </RestaurantDashSection>

          <div className="grid gap-4 lg:grid-cols-5">
            <RestaurantDashSection
              title={isAr ? "الطلبات" : "Orders"}
              className="lg:col-span-2"
              headerAside={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => listQuery.refetch()}
                  disabled={listQuery.isFetching}
                >
                  <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
                </Button>
              }
            >
              {listQuery.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                </div>
              ) : listQuery.isError ? (
                <RestaurantSectionError
                  message={listQuery.error.message}
                  retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
                  isFetching={listQuery.isFetching}
                  onRetry={() => listQuery.refetch()}
                />
              ) : cards.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {isAr ? "لا توجد طلبات مطابقة." : "No matching orders."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {cards.map((card) => (
                    <li key={card.orderId}>
                      <button
                        type="button"
                        onClick={() => selectOrder(card.orderId)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-start transition",
                          state.selectedOrderId === card.orderId
                            ? "border-primary/60 bg-primary/10"
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-white">{card.orderNumber}</p>
                            <p className="text-xs text-slate-400">
                              {card.tableLabel} · {card.statusLabel}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-emerald-400">
                            {card.totalAmount} {sym}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {card.itemCount} {isAr ? "صنف" : "items"} · {card.customerLabel}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </RestaurantDashSection>

            <RestaurantDashSection title={isAr ? "تفاصيل الطلب" : "Order details"} className="lg:col-span-3">
              {!state.selectedOrderId ? (
                <p className="text-sm text-slate-400">
                  {isAr ? "اختر طلباً لعرض التفاصيل." : "Select an order to view details."}
                </p>
              ) : detailQuery.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                </div>
              ) : detailQuery.isError || !detailQuery.data ? (
                <RestaurantSectionError
                  message={detailQuery.error?.message ?? (isAr ? "غير موجود" : "Not found")}
                  retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
                  isFetching={detailQuery.isFetching}
                  onRetry={() => detailQuery.refetch()}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {detailQuery.data.order.orderNumber}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {formatStatusLabel(detailQuery.data.order.status, language)} ·{" "}
                        {isAr ? "طاولة" : "Table"} {detailQuery.data.order.tableNumber}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!detailQuery.data || printActions.isBusy}
                        onClick={() =>
                          void printActions.printOrder({
                            restaurantId,
                            orderId: detailQuery.data!.order.orderId,
                            orderNumber: detailQuery.data!.order.orderNumber,
                          })
                        }
                      >
                        <Printer className="h-4 w-4 me-1" />
                        {isAr ? "طباعة" : "Print"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!detailQuery.data || printActions.isBusy}
                        onClick={() =>
                          void printActions.reprint({
                            restaurantId,
                            orderId: detailQuery.data!.order.orderId,
                            orderNumber: detailQuery.data!.order.orderNumber,
                          })
                        }
                      >
                        <RotateCcw className="h-4 w-4 me-1" />
                        {isAr ? "إعادة طباعة" : "Reprint"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!detailQuery.data || printActions.isBusy}
                        onClick={async () => {
                          if (!detailQuery.data) return;
                          try {
                            const preview = await utils.printWorkspace.read.previewTicket.fetch({
                              restaurantId,
                              orderId: detailQuery.data.order.orderId,
                            });
                            setPreviewMessage(
                              preview?.payload
                                ? JSON.stringify(preview.payload, null, 2)
                                : isAr
                                  ? "لا توجد بيانات معاينة"
                                  : "No preview data"
                            );
                          } catch {
                            setPreviewMessage(isAr ? "فشلت المعاينة" : "Preview failed");
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 me-1" />
                        {isAr ? "معاينة" : "Preview"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!activePrintJob || printActions.isBusy}
                        onClick={() =>
                          void printActions.cancelPrint({
                            restaurantId,
                            orderId: detailQuery.data!.order.orderId,
                            orderNumber: detailQuery.data!.order.orderNumber,
                          })
                        }
                      >
                        <XCircle className="h-4 w-4 me-1" />
                        {isAr ? "إلغاء الطباعة" : "Cancel print"}
                      </Button>
                    </div>
                  </div>

                  {previewMessage ? (
                    <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
                      {previewMessage}
                    </pre>
                  ) : null}

                  {detailQuery.data.printJobs.length > 0 ? (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-slate-300">
                        {isAr ? "مهام الطباعة" : "Print jobs"}
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {detailQuery.data.printJobs.map((job) => (
                          <li key={job.id}>
                            #{job.id} · {job.status} · {job.source} · {job.createdAt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {detailQuery.data.order.notes ? (
                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100/90">
                      <span className="font-medium">{isAr ? "ملاحظات: " : "Notes: "}</span>
                      {detailQuery.data.order.notes}
                    </p>
                  ) : null}

                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-300">
                      {isAr ? "الأصناف" : "Items"}
                    </h4>
                    <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                      {detailQuery.data.order.lineItems.map((item) => (
                        <li
                          key={item.lineItemId}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <span className="text-slate-200">
                            {isAr ? item.nameAr : item.nameEn || item.nameAr} × {item.quantity}
                          </span>
                          <span className="text-slate-400">
                            {item.price} {sym}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {detailQuery.data.timeline.length > 0 ? (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-slate-300">
                        {isAr ? "سجل الحالة" : "Status history"}
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {detailQuery.data.timeline.map((ev) => (
                          <li key={ev.eventId}>
                            {ev.fromStatus ? `${ev.fromStatus} → ` : ""}
                            {ev.toStatus} · {ev.occurredAt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </RestaurantDashSection>
          </div>
        </>
      )}
    </div>
  );
}
