/**
 * Orders Workspace — operational order lifecycle.
 * SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 — Self Ordering (sessionless)
 * settle/cancel from Orders via staff Counter Pickup façade + MarkPaidSettlementDialog.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { MarkPaidSettlementDialog } from "@/components/dashboard/MarkPaidSettlementDialog";
import { OperationalCard } from "@/components/operational-workspace/OperationalCard";
import { OperationalDetailsSheet } from "@/components/operational-workspace/OperationalDetailsDrawer";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import { SemanticKpiCard, SemanticKpiSkeleton } from "@/design-system/semantic-card";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import { getOrdersWorkspaceActions } from "@/lib/operational-workspace/operationalActions";
import { isLateOrder } from "@/lib/operational-workspace/orderViewModels";
import {
  mapActiveOrderPresentation,
  useOrderPresentations,
} from "@/lib/order-presentation";
import { useOrderStatusActions } from "@/lib/operational-workspace/useOrderStatusActions";
import {
  DEFAULT_ORDER_FILTERS,
  useSavedFilters,
} from "@/lib/operational-workspace/useSavedFilters";
import { useGracePeriod } from "@/lib/operational-workspace/useGracePeriod";
import { retainCashierPosOperationalGraceItem } from "@/lib/operational-workspace/cashierPosGraceRetain";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import {
  isSessionlessSelfOrderingOrder,
  unpaidGrandTotalForOrder,
  unpaidOrderIdSet,
} from "@/lib/orders-workspace/selfOrderingOrderSettlementPresentation";
import {
  readActiveRegister,
  useFinancialShiftCurrent,
} from "@/lib/register-operations-presentation";
import {
  OPERATIONAL_LIFECYCLE_POLL_MS,
  orderReadListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { subscribeOrderLifecycleUpdates } from "@/lib/order-lifecycle-latency/orderLifecycleBroadcast";
import { scheduleOrdersListActiveInvalidation } from "@/lib/orders-workspace/ordersListActiveInvalidationCoordinator";
import { useOrdersWorkspaceRealtime } from "@/lib/orders-workspace/useOrdersWorkspaceRealtime";
import { handoffOperationalOrderToCashier } from "@/lib/cashier-workspace/cashierIncomingHandoff";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import { SemanticEmptyState, SemanticLoadingState } from "@/design-system/semantic-section-state";
import { Loader2, RefreshCw, ClipboardList, ChefHat, CheckCircle, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function OrdersWorkspacePanel({
  restaurantId,
  language,
  currencySymbol,
  tableLabel,
}: {
  restaurantId: number;
  language: string;
  currencySymbol?: string;
  tableLabel?: string;
}) {
  const isAr = language === "ar";
  const settleLang = isAr ? "ar" : "en";
  const tableUnit = tableLabel === "rooms" ? "room" : "table";
  const { isAuthenticated, authPending } = useAuth();
  const enabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const { presets, activeId, active, select } = useSavedFilters("orders", restaurantId, DEFAULT_ORDER_FILTERS);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [pendingActionOrderId, setPendingActionOrderId] = useState<number | null>(null);
  const [settleOrderId, setSettleOrderId] = useState<number | null>(null);
  const [settleAmount, setSettleAmount] = useState("0.00");
  const utils = trpc.useUtils();

  // REALTIME-ORDERS-ADOPTION-1 — SSE primary discovery; poll is recovery when live.
  useOrdersWorkspaceRealtime(restaurantId, enabled);

  const activeRegisterId = readActiveRegister(restaurantId)?.trim() || "";
  const shiftQuery = useFinancialShiftCurrent(
    { restaurantId, registerId: activeRegisterId },
    { enabled: enabled && activeRegisterId.length > 0 }
  );
  const shiftOpen = !!shiftQuery.data;

  useDevQueryRuntimeLog("order.read.listActive", {
    enabled,
    authPending,
    isAuthenticated,
    pollMs: enabled ? OPERATIONAL_LIFECYCLE_POLL_MS : undefined,
  });

  const listQuery = trpc.order.read.listActive.useQuery(
    {
      restaurantId,
      // Membership = server listActive (active lifecycle). Tab status is a slice.
      status:
        active?.status === "late"
          ? undefined
          : (active?.status as "pending" | "preparing" | "ready" | undefined),
      limit: 100,
    },
    orderReadListQueryOptions(enabled)
  );

  useEffect(() => {
    if (!enabled || restaurantId <= 0) return;
    return subscribeOrderLifecycleUpdates(restaurantId, () => {
      // Coexist with SSE — debounced shared invalidation (no storm).
      scheduleOrdersListActiveInvalidation({
        restaurantId,
        invalidate: () => {
          void utils.order.read.listActive.invalidate({ restaurantId });
        },
        dedupeKey: "broadcast",
      });
    });
  }, [enabled, restaurantId, utils.order.read.listActive]);

  const unpaidQuery = trpc.order.listUnpaidCounterPickup.useQuery(
    { restaurantId, limit: 100 },
    {
      enabled,
      staleTime: 3_000,
      refetchInterval: enabled ? 15_000 : false,
    }
  );

  const unpaidIds = useMemo(
    () => unpaidOrderIdSet(unpaidQuery.data),
    [unpaidQuery.data]
  );

  const detailQuery = trpc.order.read.getDetail.useQuery(
    { restaurantId, orderId: selectedOrderId ?? 0 },
    { enabled: enabled && selectedOrderId != null }
  );

  const invalidateAfterMoney = useCallback(async () => {
    await Promise.all([
      utils.order.read.listActive.invalidate({ restaurantId }),
      utils.order.listUnpaidCounterPickup.invalidate(),
      utils.crmp.financialShift.getTenderSummary.invalidate(),
      utils.kitchen.read.getQueue.invalidate({ restaurantId, status: "all" }),
    ]);
  }, [restaurantId, utils]);

  const sendToCashierMutation = trpc.order.sendToCashier.useMutation({
    onSuccess: () => {
      handoffOperationalOrderToCashier({
        utils,
        language: settleLang,
      });
      setPendingActionOrderId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingActionOrderId(null);
    },
  });

  const settleMutation = trpc.order.staffSettleCounterPickup.useMutation({
    onSuccess: async () => {
      toast.success(isAr ? "تم التحصيل" : "Settled");
      setSettleOrderId(null);
      setPendingActionOrderId(null);
      await invalidateAfterMoney();
      if (selectedOrderId) void detailQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingActionOrderId(null);
    },
  });

  const cancelSessionlessMutation = trpc.order.staffCancelCounterPickup.useMutation({
    onSuccess: async () => {
      toast.success(isAr ? "تم الإلغاء" : "Cancelled");
      setPendingActionOrderId(null);
      setSelectedOrderId(null);
      await invalidateAfterMoney();
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingActionOrderId(null);
    },
  });

  const orderActions = useOrderStatusActions(
    restaurantId,
    () => {
      // Pending cleared here; list refresh is optimistic + non-blocking invalidate.
      setPendingActionOrderId(null);
    },
    { language }
  );
  const orderActionsRef = useRef(orderActions);
  orderActionsRef.current = orderActions;

  const items = useMemo(() => {
    let rows = listQuery.data?.items ?? [];
    if (active?.status === "late") {
      rows = rows.filter((o) => isLateOrder(o.status as OrderLifecycleStatus, o.createdAt));
    }
    return rows;
  }, [listQuery.data, active?.status]);

  const { displayItems, isFading } = useGracePeriod(
    items,
    (o) => String(o.orderId),
    { retainRemoved: retainCashierPosOperationalGraceItem }
  );

  const settlementGateFor = useCallback(
    (order: {
      sessionId?: number | null;
      orderId: number;
      orderingChannel?: string | null;
    }) => {
      const sessionless = isSessionlessSelfOrderingOrder(order);
      const cashierPos = order.orderingChannel === ORDERING_CHANNEL_CASHIER_POS;
      return {
        sessionless,
        // listActive already requires a Paid/Complimentary Check for cashier_pos.
        // Counter Pickup unpaidIds can still list a stale open membership and
        // would expose Cancel on a settled Order.
        unpaidSessionless:
          !cashierPos && sessionless && unpaidIds.has(order.orderId),
        orderingChannel: order.orderingChannel ?? null,
      };
    },
    [unpaidIds]
  );

  const mapOrder = useCallback(
    (order: (typeof displayItems)[number]) =>
      mapActiveOrderPresentation(order, {
        tableUnit,
        availableActions: getOrdersWorkspaceActions(
          order.status as OrderLifecycleStatus,
          settlementGateFor(order)
        ),
      }),
    [tableUnit, settlementGateFor]
  );
  const getOrderKey = useCallback(
    (order: (typeof displayItems)[number]) => String(order.orderId),
    []
  );
  const presentations = useOrderPresentations(displayItems, mapOrder, getOrderKey);

  const cards = useMemo(
    () =>
      displayItems.map((order, index) => ({
        order,
        presentation: presentations[index]!,
        fading: isFading(order),
      })),
    [displayItems, presentations, isFading]
  );

  const needShiftMessage = isAr
    ? "افتح وردية على الصندوق النشط لتسوية طلبات الطلب الذاتي"
    : "Open a Financial Shift on the active register to settle Self Ordering";

  const openSettle = useCallback(
    (orderId: number) => {
      if (!shiftOpen || !activeRegisterId) {
        toast.error(needShiftMessage);
        return;
      }
      const grandTotal =
        unpaidGrandTotalForOrder(unpaidQuery.data, orderId) ??
        displayItems.find((o) => o.orderId === orderId)?.totalAmount ??
        "0.00";
      setSettleAmount(grandTotal);
      setSettleOrderId(orderId);
    },
    [
      shiftOpen,
      activeRegisterId,
      needShiftMessage,
      unpaidQuery.data,
      displayItems,
    ]
  );

  const confirmSettle = useCallback(
    (settlements: readonly StaffSettlementLineInput[]) => {
      if (settleOrderId == null || !activeRegisterId || settleMutation.isPending) {
        return;
      }
      setPendingActionOrderId(settleOrderId);
      settleMutation.mutate({
        restaurantId,
        orderId: settleOrderId,
        registerId: activeRegisterId,
        settlements: [...settlements],
      });
    },
    [settleOrderId, activeRegisterId, settleMutation, restaurantId]
  );

  const handleAction = useCallback(
    async (orderId: number, actionId: OperationalActionId) => {
      if (orderActionsRef.current.isPending) return;

      const order =
        displayItems.find((o) => o.orderId === orderId) ??
        (selectedOrderId === orderId ? detailQuery.data?.order : undefined);
      const gate = order
        ? settlementGateFor(order)
        : { sessionless: false, unpaidSessionless: false, orderingChannel: null };

      if (actionId === "send-to-cashier") {
        setPendingActionOrderId(orderId);
        sendToCashierMutation.mutate({ restaurantId, orderId });
        return;
      }

      if (
        actionId === "cancel-order" &&
        gate.orderingChannel === ORDERING_CHANNEL_CASHIER_POS
      ) {
        toast.error(
          isAr
            ? "لا يمكن إلغاء طلب الصندوق المسوّى — استخدم تم التقديم"
            : "Cannot cancel a settled Cashier order — use Served"
        );
        return;
      }

      if (actionId === "cancel-order" && gate.sessionless) {
        if (!gate.unpaidSessionless) {
          toast.error(
            isAr
              ? "لا يمكن إلغاء طلب مسوّى — استخدم مسار المرتجع"
              : "Cannot cancel a settled order — use refund workflow"
          );
          return;
        }
        const confirmLabel = isAr ? "إلغاء الطلب؟" : "Cancel order?";
        if (!window.confirm(confirmLabel)) return;
        setPendingActionOrderId(orderId);
        cancelSessionlessMutation.mutate({
          restaurantId,
          orderId,
          registerId: activeRegisterId || undefined,
        });
        return;
      }

      setPendingActionOrderId(orderId);
      try {
        await orderActionsRef.current.executeAction(orderId, actionId);
      } catch {
        // Error toast is owned by useOrderStatusActions; restore retry.
      } finally {
        setPendingActionOrderId(null);
      }
    },
    [
      displayItems,
      selectedOrderId,
      detailQuery.data?.order,
      settlementGateFor,
      isAr,
      cancelSessionlessMutation,
      restaurantId,
      activeRegisterId,
      sendToCashierMutation,
    ]
  );

  const handleOpenDetails = useCallback((orderId: number) => {
    setSelectedOrderId(orderId);
  }, []);

  const counts = useMemo(() => {
    const all = listQuery.data?.items ?? [];
    return {
      pending: all.filter((o) => o.status === "pending").length,
      preparing: all.filter((o) => o.status === "preparing").length,
      ready: all.filter((o) => o.status === "ready").length,
      late: all.filter((o) => isLateOrder(o.status as OrderLifecycleStatus, o.createdAt)).length,
    };
  }, [listQuery.data]);

  const selected = detailQuery.data?.order;
  const selectedPresentation = useMemo(() => {
    if (!selected) return null;
    const gate = settlementGateFor(selected);
    return mapActiveOrderPresentation(selected, {
      tableUnit,
      availableActions: getOrdersWorkspaceActions(
        selected.status as OrderLifecycleStatus,
        gate
      ),
    });
  }, [selected, tableUnit, settlementGateFor]);
  const selectedActions = selected
    ? getOrdersWorkspaceActions(
        selected.status as OrderLifecycleStatus,
        settlementGateFor(selected)
      )
    : [];

  const moneyPending =
    settleMutation.isPending || cancelSessionlessMutation.isPending;
  const actionPending = orderActions.isPending || moneyPending;

  if (listQuery.error && isEmailNotVerifiedError(listQuery.error)) {
    return <VerificationRequiredPanel variant="orders" />;
  }

  return (
    <OperationalWorkspaceShell
      title={isAr ? "الطلبات" : "Orders"}
      description={
        isAr
          ? "إدارة دورة حياة الطلبات وتسوية الطلب الذاتي"
          : "Order lifecycle and Self Ordering settlement"
      }
      headerAside={
        <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}>
          {listQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isAr ? "تحديث" : "Refresh"}
        </Button>
      }
      kpis={
        listQuery.isLoading ? (
          <SemanticKpiSkeleton count={4} />
        ) : (
          <>
            <SemanticKpiCard label={isAr ? "بانتظار القبول" : "Needs acceptance"} value={counts.pending} tone="warning" domain="orders" icon={ClipboardList} />
            <SemanticKpiCard label={isAr ? "قيد التحضير" : "Preparing"} value={counts.preparing} tone="accent" domain="kitchen" icon={ChefHat} />
            <SemanticKpiCard label={isAr ? "جاهز" : "Ready"} value={counts.ready} tone="success" domain="orders" icon={CheckCircle} />
            <SemanticKpiCard label={isAr ? "متأخر" : "Late"} value={counts.late} tone={counts.late > 0 ? "warning" : "neutral"} domain={counts.late > 0 ? "warning" : "orders"} icon={AlertTriangle} />
          </>
        )
      }
      operationsBar={
        <OperationsBar
          items={[
            { id: "accept", label: isAr ? "بانتظار القبول" : "Needs acceptance", value: counts.pending, tone: counts.pending > 0 ? "warning" : "default" },
            { id: "prep", label: isAr ? "قيد التحضير" : "Preparing", value: counts.preparing },
            { id: "ready", label: isAr ? "جاهز" : "Ready", value: counts.ready, tone: "success" },
            { id: "late", label: isAr ? "متأخر" : "Late", value: counts.late, tone: counts.late > 0 ? "danger" : "default" },
          ]}
        />
      }
      filters={<WorkspaceFilters presets={presets} activeId={activeId} onSelect={select} language={language} />}
      drawer={
        <OperationalDetailsSheet
          open={selectedOrderId != null}
          onOpenChange={(open) => !open && setSelectedOrderId(null)}
          title={selectedPresentation?.identity.displayReference ?? ""}
          language={language}
          timeline={detailQuery.data?.timeline}
          actions={selectedActions}
          actionPending={actionPending}
          onAction={async (actionId) => {
            if (!selectedOrderId) return;
            await handleAction(selectedOrderId, actionId);
          }}
        >
          {selectedPresentation ? (
            <OperationalCard
              presentation={selectedPresentation}
              currencySymbol={currencySymbol}
              language={language}
              executionOnly
            />
          ) : null}
        </OperationalDetailsSheet>
      }
    >
      {listQuery.error ? (
        <RestaurantSectionError
          message={listQuery.error.message}
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          onRetry={() => void listQuery.refetch()}
        />
      ) : listQuery.isLoading ? (
        <SemanticLoadingState variant="spinner" className="py-16" />
      ) : cards.length === 0 ? (
        <SemanticEmptyState
          variant="panel"
          icon={ClipboardList}
          message={isAr ? "لا توجد طلبات" : "No orders"}
          className="border-transparent bg-transparent"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ order, presentation, fading }) => (
            <OperationalCard
              key={order.orderId}
              presentation={presentation}
              currencySymbol={currencySymbol}
              language={language}
              fading={fading}
              actionPending={
                pendingActionOrderId === order.orderId && actionPending
              }
              onAction={handleAction}
              onOpenDetails={handleOpenDetails}
            />
          ))}
        </div>
      )}

      <MarkPaidSettlementDialog
        open={settleOrderId != null}
        language={settleLang}
        pending={settleMutation.isPending}
        outstandingAmount={
          unpaidGrandTotalForOrder(unpaidQuery.data, settleOrderId ?? 0) ??
          settleAmount
        }
        currencySymbol={currencySymbol}
        onOpenChange={(open) => {
          if (!open && !settleMutation.isPending) setSettleOrderId(null);
        }}
        onConfirm={confirmSettle}
      />
    </OperationalWorkspaceShell>
  );
}
