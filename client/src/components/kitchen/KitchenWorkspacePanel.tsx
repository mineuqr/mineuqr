import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { OperationalCard } from "@/components/operational-workspace/OperationalCard";
import { OperationalWorkspaceShell } from "@/components/operational-workspace/OperationalWorkspaceShell";
import { OperationsBar } from "@/components/operational-workspace/OperationsBar";
import { WorkspaceFilters } from "@/components/operational-workspace/WorkspaceFilters";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
import { computeSlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { useGracePeriod } from "@/lib/operational-workspace/useGracePeriod";
import {
  DEFAULT_KITCHEN_FILTERS,
  useSavedFilters,
} from "@/lib/operational-workspace/useSavedFilters";
import { toKitchenTicketCard } from "@/lib/kitchen/viewModels";
import {
  kitchenQueueQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw } from "lucide-react";
import { useMemo, useCallback } from "react";

const COLUMN_LABELS = {
  pending: { en: "New", ar: "جديد" },
  preparing: { en: "Preparing", ar: "قيد التحضير" },
  ready: { en: "Ready", ar: "جاهز" },
} as const;

export function KitchenWorkspacePanel({
  restaurantId,
  language,
}: {
  restaurantId: number;
  language: string;
}) {
  const isAr = language === "ar";
  const { isAuthenticated, authPending } = useAuth();
  const queriesEnabled = restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId);
  const { presets, activeId, active, select } = useSavedFilters(
    "kitchen",
    restaurantId,
    DEFAULT_KITCHEN_FILTERS
  );

  useDevQueryRuntimeLog("kitchen.read.getQueue", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? 10_000 : undefined,
  });

  const queueQuery = trpc.kitchen.read.getQueue.useQuery(
    { restaurantId, status: "all", limit: 200 },
    kitchenQueueQueryOptions(queriesEnabled)
  );

  const counts = queueQuery.data?.meta.counts ?? { pending: 0, preparing: 0, ready: 0 };

  const columns = useMemo(() => {
    const data = queueQuery.data;
    if (!data) return { pending: [], preparing: [], ready: [] };
    return {
      pending: data.columns.pending.map(toKitchenTicketCard),
      preparing: data.columns.preparing.map(toKitchenTicketCard),
      ready: data.columns.ready.map(toKitchenTicketCard),
    };
  }, [queueQuery.data]);

  const visibleColumn = active?.status as keyof typeof columns | undefined;

  const allTickets = useMemo(() => {
    if (visibleColumn && visibleColumn in columns) {
      return columns[visibleColumn];
    }
    return [...columns.pending, ...columns.preparing, ...columns.ready];
  }, [columns, visibleColumn]);

  const { displayItems: displayTickets, isFading } = useGracePeriod(
    allTickets,
    (t) => String(t.orderId)
  );

  const ticketsForColumn = useCallback(
    (columnId: "pending" | "preparing" | "ready") =>
      displayTickets.filter((ticket) => ticket.status === columnId),
    [displayTickets]
  );

  if (queueQuery.error && isEmailNotVerifiedError(queueQuery.error)) {
    return <VerificationRequiredPanel variant="operations" />;
  }

  return (
    <OperationalWorkspaceShell
      title={isAr ? "شاشة المطبخ" : "Kitchen Display"}
      description={
        isAr
          ? "مساحة تنفيذ — عرض العمل التشغيلي (إدارة الطلبات من مساحة الطلبات)"
          : "Execution workspace — visualize operational work (manage orders in Orders Workspace)"
      }
      headerAside={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void queueQuery.refetch()}
          disabled={queueQuery.isFetching}
        >
          {queueQuery.isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isAr ? "تحديث" : "Refresh"}
        </Button>
      }
      operationsBar={
        <OperationsBar
          items={[
            {
              id: "new",
              label: isAr ? COLUMN_LABELS.pending.ar : COLUMN_LABELS.pending.en,
              value: counts.pending,
              tone: counts.pending > 0 ? "warning" : "default",
            },
            {
              id: "prep",
              label: isAr ? COLUMN_LABELS.preparing.ar : COLUMN_LABELS.preparing.en,
              value: counts.preparing,
            },
            {
              id: "ready",
              label: isAr ? COLUMN_LABELS.ready.ar : COLUMN_LABELS.ready.en,
              value: counts.ready,
              tone: "success",
            },
            {
              id: "backlog",
              label: isAr ? "إجمالي الطابور" : "Kitchen backlog",
              value: counts.pending + counts.preparing + counts.ready,
            },
          ]}
        />
      }
      filters={<WorkspaceFilters presets={presets} activeId={activeId} onSelect={select} language={language} />}
    >
      {queueQuery.error ? (
        <RestaurantSectionError
          message={queueQuery.error.message}
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          onRetry={() => void queueQuery.refetch()}
        />
      ) : queueQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {(visibleColumn && visibleColumn in columns
            ? [visibleColumn]
            : (["pending", "preparing", "ready"] as const)
          ).map((columnId) => {
            const columnTickets = ticketsForColumn(columnId);
            return (
            <section
              key={columnId}
              className="flex min-h-[480px] flex-col rounded-2xl border bg-muted/10 p-4"
            >
              <header className="mb-4 flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-semibold">
                  {isAr ? COLUMN_LABELS[columnId].ar : COLUMN_LABELS[columnId].en}
                </h3>
                <span className="rounded-full bg-background px-3 py-1 text-sm font-medium">
                  {counts[columnId]}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                {columnTickets.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    {isAr ? "لا توجد تذاكر" : "No tickets"}
                  </p>
                ) : (
                  columnTickets.map((ticket) => (
                    <OperationalCard
                      key={ticket.orderId}
                      orderNumber={`#${ticket.orderNumber}`}
                      tableLabel={isAr ? `طاولة ${ticket.tableNumber}` : `Table ${ticket.tableNumber}`}
                      linesSummary={ticket.linesSummary}
                      orderNotes={ticket.orderNotes}
                      customerName={ticket.customerName}
                      status={ticket.status}
                      sla={computeSlaSnapshot(
                        ticket.status,
                        ticket.columnElapsedMinutes * 60,
                        ticket.elapsedMinutes * 60
                      )}
                      language={language}
                      executionOnly
                      fading={isFading(ticket)}
                      className="min-h-[180px]"
                    />
                  ))
                )}
              </div>
            </section>
            );
          })}
        </div>
      )}
    </OperationalWorkspaceShell>
  );
}
