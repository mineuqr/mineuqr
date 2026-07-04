import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { KitchenColumn } from "@/components/kitchen/KitchenColumn";
import { KitchenColumnSkeleton } from "@/components/kitchen/KitchenTicketCard";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { RestaurantSectionError } from "@/components/dashboard/RestaurantSectionStates";
import { Button } from "@/components/ui/button";
import { useKitchenActions } from "@/lib/kitchen/useKitchenActions";
import { toKitchenTicketCard } from "@/lib/kitchen/viewModels";
import {
  kitchenQueueQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

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
  const [actionPendingOrderId, setActionPendingOrderId] = useState<number | null>(null);

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

  const kitchenActions = useKitchenActions(restaurantId, () => {
    setActionPendingOrderId(null);
    void queueQuery.refetch();
  });

  const columns = useMemo(() => {
    const data = queueQuery.data;
    if (!data) {
      return { pending: [], preparing: [], ready: [] };
    }
    return {
      pending: data.columns.pending.map(toKitchenTicketCard),
      preparing: data.columns.preparing.map(toKitchenTicketCard),
      ready: data.columns.ready.map(toKitchenTicketCard),
    };
  }, [queueQuery.data]);

  const counts = queueQuery.data?.meta.counts ?? { pending: 0, preparing: 0, ready: 0 };

  async function handleAdvance(
    orderId: number,
    action: "start-preparing" | "mark-ready" | "mark-served"
  ) {
    setActionPendingOrderId(orderId);
    try {
      await kitchenActions.advanceTicket(orderId, action);
    } catch {
      setActionPendingOrderId(null);
    }
  }

  if (queueQuery.error && isEmailNotVerifiedError(queueQuery.error)) {
    return <VerificationRequiredPanel language={language} />;
  }

  return (
    <RestaurantDashSection
      title={isAr ? "شاشة المطبخ" : "Kitchen Display"}
      description={
        isAr
          ? "تتبع الطلبات النشطة وتحديث حالة التحضير"
          : "Track active orders and advance preparation status"
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
    >
      {queueQuery.error ? (
        <RestaurantSectionError
          message={queueQuery.error.message}
          onRetry={() => void queueQuery.refetch()}
        />
      ) : queueQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <KitchenColumnSkeleton />
          <KitchenColumnSkeleton />
          <KitchenColumnSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <KitchenColumn
            columnId="pending"
            tickets={columns.pending}
            count={counts.pending}
            language={language}
            actionPendingOrderId={actionPendingOrderId}
            onAdvance={handleAdvance}
          />
          <KitchenColumn
            columnId="preparing"
            tickets={columns.preparing}
            count={counts.preparing}
            language={language}
            actionPendingOrderId={actionPendingOrderId}
            onAdvance={handleAdvance}
          />
          <KitchenColumn
            columnId="ready"
            tickets={columns.ready}
            count={counts.ready}
            language={language}
            actionPendingOrderId={actionPendingOrderId}
            onAdvance={handleAdvance}
          />
        </div>
      )}
    </RestaurantDashSection>
  );
}
