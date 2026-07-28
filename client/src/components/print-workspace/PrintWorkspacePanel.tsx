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
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PRINT_FILTERS,
  useSavedFilters,
} from "@/lib/operational-workspace/useSavedFilters";
import {
  OperationalOrderStatus,
} from "@/design-system/operational-order-card";
import { formatProjectedFulfilmentLabel } from "@/lib/order-presentation/formatProjectedFulfilment";
import { operationalDisplayReference } from "@/lib/operational-workspace/orderDisplayIdentity";
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
import {
  printWorkspaceListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw, Settings2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

function mapPresetToView(presetId: string): PrintWorkspaceViewFilter {
  if (presetId === "completed") return "completed";
  if (presetId === "failures") return "awaiting";
  return "awaiting";
}

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

  const { presets, activeId, select } = useSavedFilters(
    "print",
    restaurantId,
    DEFAULT_PRINT_FILTERS
  );

  const printOpsBarItems = useMemo(() => {
    const rows = listQuery.data?.items ?? [];
    const awaiting = rows.filter((o) => o.isActive).length;
    const completed = rows.filter((o) => !o.isActive).length;
    const blocked = isPrintingReady && !printStatus.operational.canPrint ? 1 : 0;
    return [
      {
        id: "awaiting",
        label: isAr ? "بانتظار الطباعة" : "Awaiting print",
        value: awaiting,
        tone: awaiting > 0 ? ("warning" as const) : ("default" as const),
      },
      {
        id: "failures",
        label: isAr ? "فشل الطباعة" : "Print failures",
        value: blocked,
        tone: blocked > 0 ? ("danger" as const) : ("default" as const),
      },
      {
        id: "completed",
        label: isAr ? "مكتملة" : "Completed",
        value: completed,
        tone: "default" as const,
      },
    ];
  }, [listQuery.data?.items, isAr, isPrintingReady, printStatus.operational.canPrint]);

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
            <OperationsBar items={printOpsBarItems} />

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <WorkspaceFilters
                presets={presets}
                activeId={activeId}
                onSelect={(id) => {
                  select(id);
                  setView(mapPresetToView(id));
                }}
                language={language}
              />
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
                            <div className="min-w-0 space-y-1">
                              <p className="font-semibold text-white">{card.displayReference}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <OperationalOrderStatus
                                  status={card.status}
                                  statusLabel={card.statusLabel}
                                  isAr={isAr}
                                />
                                <span className="text-xs text-slate-400">{card.tableLabel}</span>
                              </div>
                              {card.notesPreview ? (
                                <p className="mt-1 line-clamp-2 break-words text-xs text-slate-400">
                                  {card.notesPreview}
                                </p>
                              ) : null}
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
                        {operationalDisplayReference(order)}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {formatStatusLabel(order.status, language)} ·{" "}
                        {formatProjectedFulfilmentLabel(
                          {
                            serviceMode: order.serviceMode,
                            fulfilmentAnchorType: order.fulfilmentAnchorType,
                            fulfilmentLabel: order.fulfilmentLabel,
                          },
                          { isAr, tableUnit: "table" }
                        )}
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
                          className="flex flex-col gap-1 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-200">
                              {isAr ? item.nameAr : item.nameEn || item.nameAr} ×{" "}
                              {item.quantity}
                            </span>
                            <span className="shrink-0 text-slate-400">
                              {item.price} {sym}
                            </span>
                          </div>
                          {item.itemNotes?.trim() ? (
                            <p className="break-words whitespace-pre-wrap text-xs text-slate-400">
                              {item.itemNotes.trim()}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {order.notes?.trim() ? (
                      <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 break-words whitespace-pre-wrap">
                        {order.notes.trim()}
                      </p>
                    ) : null}
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
