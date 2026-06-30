import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { ConnectorSessionCard } from "@/components/print-workspace/ConnectorSessionCard";
import { CurrentPrinterCard } from "@/components/print-workspace/CurrentPrinterCard";
import { LocalConnectorCard } from "@/components/print-workspace/LocalConnectorCard";
import { PrinterSelectionDialog } from "@/components/print-workspace/PrinterSelectionDialog";
import { SystemReadyBanner } from "@/components/print-workspace/SystemReadyBanner";
import { WorkspaceDiagnosticsSection } from "@/components/print-workspace/WorkspaceDiagnosticsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  printWorkspaceListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { useCurrentPrinter } from "@/lib/print-workspace/useCurrentPrinter";
import { useOperationalPrintStatus } from "@/lib/print-workspace/useOperationalPrintStatus";
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
import { Loader2, Printer, RefreshCw, RotateCcw } from "lucide-react";
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
  onOpenPrinterManagement,
}: {
  restaurantId: number;
  language: string;
  currencySymbol?: string;
  onOpenPrinterManagement?: () => void;
}) {
  const isAr = language === "ar";
  const sym = currencySymbol || "ر.س";
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const { state, setView, setSearch, selectOrder, queryInput } = usePrintWorkspaceState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const printStatus = useOperationalPrintStatus(restaurantId, queriesEnabled);
  const currentPrinter = useCurrentPrinter(restaurantId, queriesEnabled);

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
    () => void detailQuery.refetch()
  );

  const cards = useMemo(
    () => (listQuery.data?.items ?? []).map((o) => toPrintWorkspaceOrderCard(o, language)),
    [listQuery.data?.items, language]
  );

  const verificationError = isEmailNotVerifiedError(listQuery.error) ? listQuery.error : null;

  return (
    <div className={restaurantDash.stack}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {isAr ? "مساحة الطباعة" : "Print Workspace"}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          {isAr ? "طباعة الطلبات من المطعم" : "Print orders from your restaurant"}
        </p>
      </div>

      {verificationError ? (
        <VerificationRequiredPanel variant="orders" compact />
      ) : (
        <>
          <SystemReadyBanner language={language} status={printStatus.operational} />

          <RestaurantDashSection title={isAr ? "موصل MineuQR" : "MineuQR Connector"}>
            <LocalConnectorCard
              language={language}
              status={printStatus.connector}
              isLoading={printStatus.isLoading}
              onRefresh={() => printStatus.refetch()}
            />
          </RestaurantDashSection>

          <RestaurantDashSection title={isAr ? "الطابعة" : "Printer"}>
            <CurrentPrinterCard
              language={language}
              current={currentPrinter.current}
              isLoading={currentPrinter.isLoading}
              isTesting={currentPrinter.isTesting}
              connectorOnline={printStatus.connectorOnline}
              onChangePrinter={() => setPickerOpen(true)}
              onTestPrint={async () => {
                try {
                  const result = await currentPrinter.testPrint();
                  setTestMessage(
                    result.success
                      ? isAr
                        ? "نجحت الطباعة التجريبية"
                        : "Test print succeeded"
                      : (result.message ?? result.failureReason ?? "Failed")
                  );
                } catch (e) {
                  setTestMessage(e instanceof Error ? e.message : "Failed");
                }
              }}
              onOpenManagement={() => onOpenPrinterManagement?.()}
            />
            {testMessage ? <p className="mt-2 text-xs text-slate-400">{testMessage}</p> : null}
          </RestaurantDashSection>

          <ConnectorSessionCard
            language={language}
            status={printStatus.session}
            isLoading={printStatus.isLoading}
          />

          <RestaurantDashSection title={isAr ? "الطباعة" : "Printing"}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
              <Input
                value={state.search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? "بحث برقم الطلب" : "Search order #"}
                className="max-w-xs bg-slate-900/60"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">
                    {isAr ? "الطلبات" : "Orders"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => listQuery.refetch()}
                    disabled={listQuery.isFetching}
                  >
                    <RefreshCw className={cn("h-4 w-4", listQuery.isFetching && "animate-spin")} />
                  </Button>
                </div>
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
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="lg:col-span-3">
                <p className="mb-2 text-sm font-medium text-slate-300">
                  {isAr ? "تفاصيل الطلب" : "Order details"}
                </p>
                {!state.selectedOrderId ? (
                  <p className="text-sm text-slate-400">
                    {isAr ? "اختر طلباً للطباعة." : "Select an order to print."}
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
                    {!printStatus.operational.canPrint ? (
                      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90">
                        {isAr
                          ? printStatus.operational.subline.ar
                          : printStatus.operational.subline.en}
                      </p>
                    ) : null}
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
                          variant="default"
                          disabled={!printStatus.operational.canPrint || printActions.isBusy}
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
                          disabled={!printStatus.operational.canPrint || printActions.isBusy}
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
                      </div>
                    </div>

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
                )}
              </div>
            </div>
          </RestaurantDashSection>

          <RestaurantDashSection
            title={isAr ? "التشخيص" : "Diagnostics"}
            headerAside={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDiagnosticsOpen((v) => !v)}
              >
                {diagnosticsOpen ? (isAr ? "إخفاء" : "Hide") : isAr ? "عرض" : "Show"}
              </Button>
            }
          >
            <WorkspaceDiagnosticsSection
              restaurantId={restaurantId}
              language={language}
              enabled={queriesEnabled}
              expanded={diagnosticsOpen}
              onExpandedChange={setDiagnosticsOpen}
            />
          </RestaurantDashSection>

          <PrinterSelectionDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            restaurantId={restaurantId}
            language={language}
            onSelected={() => {
              void currentPrinter.refetch();
              printStatus.refetch();
            }}
          />
        </>
      )}
    </div>
  );
}
