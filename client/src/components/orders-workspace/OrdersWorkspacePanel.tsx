import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalCard } from "@/components/operational-workspace/OperationalCard";
import { OperationalDetailsDrawer } from "@/components/operational-workspace/OperationalDetailsDrawer";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import { RestaurantKpiCard, RestaurantKpiGridSkeleton } from "@/components/dashboard/RestaurantKpiCard";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
import { getOrderWorkspaceActions } from "@/lib/operational-workspace/operationalActions";
import { buildLinesSummaryFromItems, computeOrderCardSla, isLateOrder } from "@/lib/operational-workspace/orderViewModels";
import { formatOperationalOrderHeading } from "@/lib/operational-workspace/orderDisplayIdentity";
import { useOrderStatusActions } from "@/lib/operational-workspace/useOrderStatusActions";
import {
  DEFAULT_ORDER_FILTERS,
  useSavedFilters,
} from "@/lib/operational-workspace/useSavedFilters";
import { useGracePeriod } from "@/lib/operational-workspace/useGracePeriod";
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import {
  orderReadListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw, ClipboardList, ChefHat, CheckCircle, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

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
  const unit = tableLabel === "rooms" ? (isAr ? "غرفة" : "Room") : isAr ? "طاولة" : "Table";
  const { isAuthenticated, authPending } = useAuth();
  const enabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const { presets, activeId, active, select } = useSavedFilters("orders", restaurantId, DEFAULT_ORDER_FILTERS);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [pendingActionOrderId, setPendingActionOrderId] = useState<number | null>(null);

  useDevQueryRuntimeLog("order.read.listActive", {
    enabled,
    authPending,
    isAuthenticated,
    pollMs: enabled ? 10_000 : undefined,
  });

  const listQuery = trpc.order.read.listActive.useQuery(
    {
      restaurantId,
      status:
        active?.status === "late"
          ? undefined
          : (active?.status as "pending" | "preparing" | "ready" | undefined),
      limit: 100,
    },
    orderReadListQueryOptions(enabled)
  );

  const detailQuery = trpc.order.read.getDetail.useQuery(
    { restaurantId, orderId: selectedOrderId ?? 0 },
    { enabled: enabled && selectedOrderId != null }
  );

  const orderActions = useOrderStatusActions(restaurantId, () => {
    setPendingActionOrderId(null);
    void listQuery.refetch();
    if (selectedOrderId) void detailQuery.refetch();
  });

  const items = useMemo(() => {
    let rows = listQuery.data?.items ?? [];
    if (active?.status === "late") {
      rows = rows.filter((o) => isLateOrder(o.status as OrderLifecycleStatus, o.createdAt));
    }
    return rows;
  }, [listQuery.data, active?.status]);

  const { displayItems, isFading } = useGracePeriod(items, (o) => String(o.orderId));

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
  const selectedActions = selected
    ? getOrderWorkspaceActions(selected.status as OrderLifecycleStatus)
    : [];

  if (listQuery.error && isEmailNotVerifiedError(listQuery.error)) {
    return <VerificationRequiredPanel variant="orders" />;
  }

  return (
    <OperationalWorkspaceShell
      title={isAr ? "الطلبات" : "Orders"}
      description={isAr ? "إدارة دورة حياة الطلبات التشغيلية" : "Operational order lifecycle management"}
      headerAside={
        <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}>
          {listQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isAr ? "تحديث" : "Refresh"}
        </Button>
      }
      kpis={
        listQuery.isLoading ? (
          <RestaurantKpiGridSkeleton count={4} />
        ) : (
          <>
            <RestaurantKpiCard label={isAr ? "بانتظار القبول" : "Needs acceptance"} value={counts.pending} tone="warning" icon={ClipboardList} />
            <RestaurantKpiCard label={isAr ? "قيد التحضير" : "Preparing"} value={counts.preparing} tone="info" icon={ChefHat} />
            <RestaurantKpiCard label={isAr ? "جاهز" : "Ready"} value={counts.ready} tone="success" icon={CheckCircle} />
            <RestaurantKpiCard label={isAr ? "متأخر" : "Late"} value={counts.late} tone={counts.late > 0 ? "warning" : "neutral"} icon={AlertTriangle} />
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
        <OperationalDetailsDrawer
          open={selectedOrderId != null}
          onOpenChange={(open) => !open && setSelectedOrderId(null)}
          title={selected ? formatOperationalOrderHeading(selected) : ""}
          language={language}
          timeline={detailQuery.data?.timeline}
          actions={selectedActions}
          actionPending={orderActions.isPending}
          onAction={async (actionId) => {
            if (!selectedOrderId) return;
            setPendingActionOrderId(selectedOrderId);
            await orderActions.executeAction(selectedOrderId, actionId);
          }}
        >
          {selected ? (
            <OperationalCard
              displayReference={formatOperationalOrderHeading(selected)}
              tableLabel={`${unit} ${selected.tableNumber}`}
              linesSummary={buildLinesSummaryFromItems(selected.lineItems)}
              orderNotes={selected.notes}
              customerName={selected.customerName}
              totalAmount={selected.totalAmount}
              currencySymbol={currencySymbol}
              status={selected.status}
              sla={computeOrderCardSla(selected.status, selected.createdAt)}
              language={language}
              executionOnly
            />
          ) : null}
        </OperationalDetailsDrawer>
      }
    >
      {listQuery.error ? (
        <RestaurantSectionError
          message={listQuery.error.message}
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          onRetry={() => void listQuery.refetch()}
        />
      ) : listQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayItems.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardList className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <p className="text-muted-foreground">{isAr ? "لا توجد طلبات" : "No orders"}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayItems.map((order) => (
            <OperationalCard
              key={order.orderId}
              displayReference={formatOperationalOrderHeading(order)}
              tableLabel={`${unit} ${order.tableNumber}`}
              linesSummary={buildLinesSummaryFromItems(order.lineItems)}
              orderNotes={order.notes}
              customerName={order.customerName}
              totalAmount={order.totalAmount}
              currencySymbol={currencySymbol}
              status={order.status}
              sla={computeOrderCardSla(order.status, order.createdAt)}
              language={language}
              fading={isFading(order)}
              actions={
                isFading(order)
                  ? []
                  : getOrderWorkspaceActions(order.status as OrderLifecycleStatus)
              }
              actionPending={pendingActionOrderId === order.orderId && orderActions.isPending}
              onAction={async (actionId) => {
                setPendingActionOrderId(order.orderId);
                await orderActions.executeAction(order.orderId, actionId);
              }}
              onOpenDetails={() => setSelectedOrderId(order.orderId)}
            />
          ))}
        </div>
      )}
    </OperationalWorkspaceShell>
  );
}
