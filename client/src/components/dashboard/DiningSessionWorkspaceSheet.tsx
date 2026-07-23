import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DiningSessionActionBar } from "@/components/dashboard/DiningSessionActionBar";
import { DiningSessionOverviewSection } from "@/components/dashboard/DiningSessionOverviewSection";
import { DiningSessionOrdersSummarySection } from "@/components/dashboard/DiningSessionOrdersSummarySection";
import {
  DiningSessionWorkspaceRecovery,
  DiningSessionWorkspaceSkeleton,
} from "@/components/dashboard/DiningSessionWorkspaceRecovery";
import { DiningSessionTimelineList } from "@/components/dashboard/DiningSessionTimelineList";
import { OrderSettlementPanel } from "@/components/order-settlement/OrderSettlementPanel";
import { SplitPaymentPanel } from "@/components/split-payment/SplitPaymentPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { formatDashboardSessionLabel } from "@/lib/diningSessionDashboardCopy";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import {
  countSessionItems,
  isSessionNotFoundError,
} from "@/lib/diningSessionWorkspaceView";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  orderListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { restaurantDash } from "./restaurantDashStyles";

type DiningSessionWorkspaceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  sessionId: number | null;
  currencySymbol?: string;
  tableLabel?: string;
};

export function DiningSessionWorkspaceSheet({
  open,
  onOpenChange,
  restaurantId,
  sessionId,
  currencySymbol,
  tableLabel,
}: DiningSessionWorkspaceSheetProps) {
  const { language } = useLanguage();
  const { isAuthenticated, authPending } = useAuth();
  const lang = language === "ar" ? "ar" : "en";
  const sym = currencySymbol || "ر.س";
  const workspaceEnabled =
    restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId) &&
    open &&
    sessionId != null &&
    sessionId > 0;

  useDevQueryRuntimeLog("session.getOwnerWorkspace", {
    enabled: workspaceEnabled,
    authPending,
    isAuthenticated,
    pollMs: workspaceEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("order.list (session workspace items)", {
    enabled: workspaceEnabled,
    authPending,
    isAuthenticated,
  });
  useDevQueryRuntimeLog("orderSettlement.listByCheck", {
    enabled: workspaceEnabled,
    authPending,
    isAuthenticated,
  });
  useDevQueryRuntimeLog("splitPayment.listByCheck", {
    enabled: workspaceEnabled,
    authPending,
    isAuthenticated,
  });

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = trpc.session.getOwnerWorkspace.useQuery(
    { restaurantId, sessionId: sessionId ?? 0 },
    {
      ...orderListQueryOptions(workspaceEnabled),
      enabled: workspaceEnabled,
    }
  );

  const { data: restaurantOrders } = trpc.order.list.useQuery(
    { restaurantId },
    {
      enabled: workspaceEnabled,
      staleTime: 30_000,
    }
  );

  const itemsCount = useMemo(() => {
    if (!sessionId || !restaurantOrders) return 0;
    return countSessionItems(restaurantOrders, sessionId);
  }, [restaurantOrders, sessionId]);

  const [sheetSide, setSheetSide] = useState<"bottom" | "right">("right");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setSheetSide(mq.matches ? "bottom" : "right");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const sheetTitle =
    sessionId != null
      ? formatDashboardSessionLabel(sessionId, lang)
      : language === "ar"
        ? "الجلسة"
        : "Session";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={sheetSide}
        className={cn(
          "flex flex-col border-cyan-500/20 bg-slate-950 p-0",
          sheetSide === "bottom"
            ? "max-h-[92vh] sm:max-w-full"
            : "w-full sm:max-w-lg"
        )}
      >
        <SheetHeader className="border-b border-cyan-500/15 px-4 pb-4 pt-6 text-start sm:px-6">
          <SheetTitle className="text-lg text-white">{sheetTitle}</SheetTitle>
          <SheetDescription className="text-slate-400">
            {language === "ar"
              ? "مساحة تفاصيل الجلسة التشغيلية"
              : "Operational session detail workspace"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
          {isLoading ? <DiningSessionWorkspaceSkeleton /> : null}

          {!isLoading && error ? (
            <DiningSessionWorkspaceRecovery
              kind={isSessionNotFoundError(error) ? "notFound" : "loadError"}
              language={lang}
              onRetry={() => void refetch()}
              isFetching={isFetching}
            />
          ) : null}

          {!isLoading && !error && data ? (
            <>
              <DiningSessionOverviewSection
                sessionId={data.sessionId}
                tableNumber={data.tableNumber}
                status={data.status as DiningSessionStatus}
                openedAt={data.openedAt}
                closedAt={data.closedAt}
                language={lang}
                tableLabel={tableLabel}
              />

              <DiningSessionOrdersSummarySection
                orderCount={data.orderCount}
                itemsCount={itemsCount}
                ordersTotalAmount={data.ordersTotalAmount}
                language={lang}
                currencySymbol={sym}
              />

              <OrderSettlementPanel
                restaurantId={restaurantId}
                checkId={data.checkId}
                language={lang}
                currencySymbol={sym}
                enabled={workspaceEnabled}
                showDiagnostics={import.meta.env.DEV}
              />

              <SplitPaymentPanel
                restaurantId={restaurantId}
                checkId={data.checkId}
                language={lang}
                currencySymbol={sym}
                enabled={workspaceEnabled}
                showDiagnostics={import.meta.env.DEV}
              />

              {/*
                MULTI-CHECK-ALLOCATION-PRODUCTION-ADOPTION-1 (Rev 2.0):
                Multi Check Allocation UI is dormant — not mounted for operators.
                Core (Domain / Integration / Projection / API) remains active.
                Reactivate by remounting MultiCheckAllocationPanel behind
                isMultiCheckAllocationUiEnabled() when Settlement Record needs it.
              */}

              <section
                className={cn(restaurantDash.panelInset, "p-4")}
                aria-label={sessionSummaryLabel("actions", lang)}
              >
                <h3 className="mb-3 text-sm font-semibold text-white">
                  {sessionSummaryLabel("actions", lang)}
                </h3>
                <DiningSessionActionBar
                  restaurantId={restaurantId}
                  sessionId={data.sessionId}
                  status={data.status as DiningSessionStatus}
                />
              </section>

              <DiningSessionTimelineList
                events={data.events}
                language={lang}
                currencySymbol={sym}
              />
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
