import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import { DiningSessionActionBar } from "@/components/dashboard/DiningSessionActionBar";
import { DiningSessionOverviewSection } from "@/components/dashboard/DiningSessionOverviewSection";
import { DiningSessionOrdersSummarySection } from "@/components/dashboard/DiningSessionOrdersSummarySection";
import {
  DiningSessionWorkspaceRecovery,
  DiningSessionWorkspaceSkeleton,
} from "@/components/dashboard/DiningSessionWorkspaceRecovery";
import { DiningSessionTimelineList } from "@/components/dashboard/DiningSessionTimelineList";
import { OrderSettlementPanel } from "@/components/order-settlement/OrderSettlementPanel";
import { SettlementSessionStatusPanel } from "@/components/settlement-record/SettlementSessionStatusPanel";
import { SettlementDetailSheet } from "@/components/settlement-record/SettlementDetailSheet";
import { SettlementReceiptDialog } from "@/components/settlement-record/SettlementReceiptDialog";
import { SemanticDetailSheet } from "@/design-system/semantic-detail-sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { formatDashboardSessionLabel } from "@/lib/diningSessionDashboardCopy";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import {
  countSessionItems,
  isSessionNotFoundError,
} from "@/lib/diningSessionWorkspaceView";
import { syncDashboardUrl } from "@/lib/dashboardUrl";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  orderListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { restaurantDash } from "./restaurantDashStyles";
import { subscribeSessionOrderCreated } from "@/lib/order-lifecycle-latency/orderLifecycleBroadcast";
import { isOwnerSessionRefreshTarget } from "@/lib/dining-session/notifyOwnerSessionOrderCreated";

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
  const utils = trpc.useUtils();
  const lang = language === "ar" ? "ar" : "en";
  const sym = currencySymbol || "ر.س";
  const [workspaceSettlementId, setWorkspaceSettlementId] = useState<string | null>(null);
  const [workspaceDetailOpen, setWorkspaceDetailOpen] = useState(false);
  const [workspaceReceiptOpen, setWorkspaceReceiptOpen] = useState(false);
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

  useEffect(() => {
    if (!workspaceEnabled || sessionId == null || sessionId <= 0) return;
    return subscribeSessionOrderCreated(restaurantId, (message) => {
      if (
        !isOwnerSessionRefreshTarget({
          restaurantId,
          openSessionId: sessionId,
          messageRestaurantId: message.restaurantId,
          messageSessionId: message.sessionId,
        })
      ) {
        return;
      }
      void utils.session.getOwnerWorkspace.invalidate({
        restaurantId,
        sessionId: message.sessionId,
      });
    });
  }, [
    workspaceEnabled,
    restaurantId,
    sessionId,
    utils.session.getOwnerWorkspace,
  ]);

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
    <SemanticDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      side={sheetSide}
      size="md"
      title={sheetTitle}
      subtitle={
        language === "ar"
          ? "مساحة تفاصيل الجلسة التشغيلية"
          : "Operational session detail workspace"
      }
      className={cn(
        "border-cyan-500/20 bg-slate-950",
        sheetSide === "bottom" && "sm:max-w-full"
      )}
      headerClassName="border-cyan-500/15"
      bodyClassName="flex flex-col gap-4 pb-6"
    >
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

          <SettlementSessionStatusPanel
            restaurantId={restaurantId}
            sessionId={data.sessionId}
            language={lang}
            enabled={workspaceEnabled}
            sessionStatus={data.status}
            onOpenDetail={(id) => {
              setWorkspaceSettlementId(id);
              setWorkspaceDetailOpen(true);
            }}
            onOpenReceipt={(id) => {
              setWorkspaceSettlementId(id);
              setWorkspaceReceiptOpen(true);
            }}
            onOpenHistory={() =>
              syncDashboardUrl({ restaurantId, section: "settlements" })
            }
          />

          {/*
            SETTLEMENT-UI-CLEANUP-1:
            Split Payment + Multi Check Allocation operator UI is dormant.
            Panels are not mounted — no allocation/split queries from this sheet.
            Core (Domain / Integration / Projection / API) remains active.
            Reactivate via isSplitPaymentUiEnabled() /
            isMultiCheckAllocationUiEnabled() when product requires it.
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
              outstandingAmount={data.ordersTotalAmount}
              currencySymbol={sym}
            />
          </section>

          <DiningSessionTimelineList
            events={data.events}
            language={lang}
            currencySymbol={sym}
          />

          <SettlementDetailSheet
            open={workspaceDetailOpen}
            restaurantId={restaurantId}
            settlementRecordId={workspaceSettlementId}
            language={lang}
            onOpenChange={setWorkspaceDetailOpen}
            onOpenSettlementRecord={(id) => setWorkspaceSettlementId(id)}
            onViewReceipt={() => {
              setWorkspaceDetailOpen(false);
              setWorkspaceReceiptOpen(true);
            }}
            onViewHistory={() =>
              syncDashboardUrl({ restaurantId, section: "settlements" })
            }
          />
          <SettlementReceiptDialog
            open={workspaceReceiptOpen}
            restaurantId={restaurantId}
            settlementRecordId={workspaceSettlementId}
            language={lang}
            onOpenChange={setWorkspaceReceiptOpen}
          />
        </>
      ) : null}
    </SemanticDetailSheet>
  );
}
