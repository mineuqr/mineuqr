import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { CurrentPrinterCard } from "@/components/print-workspace/CurrentPrinterCard";
import { PrintJobMonitor } from "@/components/print-workspace/PrintJobMonitor";
import { PrinterSelectionDialog } from "@/components/print-workspace/PrinterSelectionDialog";
import { PrintingSetupZone } from "@/components/print-workspace/PrintingSetupZone";
import { PrintingStatusBanner } from "@/components/print-workspace/PrintingStatusBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  printWorkspaceListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { useCurrentPrinter } from "@/lib/print-workspace/useCurrentPrinter";
import { useOperationalPrintStatus } from "@/lib/print-workspace/useOperationalPrintStatus";
import {
  deriveOnboardingStep,
  derivePrinterOperationalState,
  derivePrintingReadinessLevel,
} from "@/lib/print-workspace/operationalViewModels";
import { usePrintWorkspaceActionPort } from "@/lib/print-workspace/usePrintWorkspaceActions";
import { hasActivePrintJob } from "@/lib/print-workspace/printJobViewModels";
import {
  formatStatusLabel,
  toPrintWorkspaceOrderCard,
  type PrintWorkspaceViewFilter,
} from "@/lib/print-workspace/viewModels";
import { usePrintWorkspaceState } from "@/lib/print-workspace/usePrintWorkspaceState";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Settings2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

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
  const setupRef = useRef<HTMLDivElement>(null);
  const [printerPickerOpen, setPrinterPickerOpen] = useState(false);

  const printStatus = useOperationalPrintStatus(restaurantId, queriesEnabled);
  const currentPrinter = useCurrentPrinter(restaurantId, queriesEnabled);

  const printerState = derivePrinterOperationalState(
    currentPrinter.current,
    printStatus.connectorOnline
  );
  const readinessLevel = derivePrintingReadinessLevel({
    operational: printStatus.operational,
    printerState,
    printerTested: Boolean(currentPrinter.current?.lastValidatedAt),
  });

  const onboardingStep = deriveOnboardingStep({
    connectorOk: printStatus.connectorOnline,
    sessionOk: printStatus.sessionRegistered,
    printerConfigured: Boolean(
      currentPrinter.current?.configured && currentPrinter.current.printer
    ),
    printerIsDefault: Boolean(currentPrinter.current?.isDefault),
    printerTested: Boolean(currentPrinter.current?.lastValidatedAt),
    printerReady: Boolean(
      currentPrinter.current?.status?.isReady && currentPrinter.current.status.isOnline
    ),
    discoveredCount: 0,
  });

  const isPrintingReady = onboardingStep === "ready";

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
    {
      enabled: queriesEnabled && state.selectedOrderId != null,
      refetchInterval: (query) => {
        const jobs = query.state.data?.printJobs ?? [];
        return jobs.length > 0 && hasActivePrintJob(jobs) ? 3_000 : false;
      },
    }
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

  const scrollToSetup = () => {
    setupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleStatusRefresh = () => {
    printStatus.refetch();
    void currentPrinter.refetch();
  };

  const handleBannerPrimaryAction = () => {
    handleStatusRefresh();
    const action = printStatus.operational.nextAction;
    if (
      action === "start_connector" ||
      action === "setup_printer" ||
      action === "fix_printer"
    ) {
      scrollToSetup();
    }
  };

  return (
    <div className={restaurantDash.stack}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {isAr ? "الطباعة" : "Printing"}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            {isAr ? "طباعة طلبات المطعم" : "Print orders for your restaurant"}
          </p>
        </div>
        {onOpenPrinterManagement ? (
          <Button type="button" size="sm" variant="outline" onClick={onOpenPrinterManagement}>
            <Settings2 className="h-4 w-4 me-1" />
            {isAr ? "إعدادات الطابعة" : "Printer settings"}
          </Button>
        ) : null}
      </div>

      {verificationError ? (
        <VerificationRequiredPanel variant="orders" compact />
      ) : (
        <>
          <PrintingStatusBanner
            language={language}
            status={printStatus.operational}
            readinessLevel={readinessLevel}
            onPrimaryAction={isPrintingReady ? undefined : handleBannerPrimaryAction}
          />

          {!isPrintingReady ? (
            <div ref={setupRef}>
              <PrintingSetupZone
                restaurantId={restaurantId}
                language={language}
                connectorOk={printStatus.connectorOnline}
                sessionOk={printStatus.sessionRegistered}
                currentPrinter={currentPrinter.current}
                onStatusChange={handleStatusRefresh}
                onTestPrint={async () => {
                  await currentPrinter.testPrint();
                }}
                isTesting={currentPrinter.isTesting}
              />
            </div>
          ) : (
            <RestaurantDashSection title={isAr ? "الطابعة" : "Printer"}>
              <CurrentPrinterCard
                language={language}
                current={currentPrinter.current}
                isLoading={currentPrinter.isLoading}
                isTesting={currentPrinter.isTesting}
                connectorOnline={printStatus.connectorOnline}
                onChangePrinter={() => setPrinterPickerOpen(true)}
                onTestPrint={async () => {
                  await currentPrinter.testPrint();
                }}
                onOpenManagement={() => onOpenPrinterManagement?.()}
              />
            </RestaurantDashSection>
          )}

          <RestaurantDashSection title={isAr ? "الطلبات" : "Orders"}>
            {!isPrintingReady ? (
              <p className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                {isAr
                  ? "أكمل إعداد الطباعة أعلاه لطباعة الطلبات."
                  : "Complete printing setup above to print orders."}
              </p>
            ) : null}
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
                    {isPrintingReady
                      ? isAr
                        ? "لا توجد طلبات مطابقة."
                        : "No matching orders."
                      : isAr
                        ? "ستظهر الطلبات هنا بعد إعداد الطباعة."
                        : "Orders will appear here after printing setup is complete."}
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
                  (() => {
                    const order = detailQuery.data!.order;
                    const printJobs = detailQuery.data!.printJobs;
                    return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {order.orderNumber}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {formatStatusLabel(order.status, language)} ·{" "}
                        {isAr ? "طاولة" : "Table"} {order.tableNumber}
                      </p>
                    </div>

                    <PrintJobMonitor
                      language={language}
                      restaurantId={restaurantId}
                      orderId={order.orderId}
                      orderNumber={order.orderNumber}
                      printJobs={printJobs}
                      printingReady={isPrintingReady}
                      actions={printActions}
                      isRefreshing={detailQuery.isFetching}
                    />

                    <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                      {order.lineItems.map((item) => (
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
                    );
                  })()
                )}
              </div>
            </div>
          </RestaurantDashSection>

          <PrinterSelectionDialog
            open={printerPickerOpen}
            onOpenChange={setPrinterPickerOpen}
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
