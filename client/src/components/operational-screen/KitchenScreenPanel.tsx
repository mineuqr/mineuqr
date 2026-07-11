import { useCallback, useMemo } from "react";
import { KitchenExecutionCard } from "@/components/kitchen/KitchenExecutionCard";
import {
  KitchenQueueErrorPanel,
  KitchenStaleDataBanner,
} from "@/components/operational-screen/KitchenQueueOperationalBanner";
import {
  KITCHEN_GRID_CLASS,
  KitchenOperationalIdleState,
  KitchenOperationalLoadingState,
} from "@/components/operational-screen/KitchenOperationalStates";
import { KitchenQueueSummaryBar } from "@/components/operational-screen/KitchenQueueSummaryBar";
import {
  countDelayedKitchenTickets,
  sortKitchenTicketsForDisplay,
} from "@/lib/operational-screen/operationalScreenPresentation";
import type { KitchenTicketDto } from "@/lib/kitchen/types";
import {
  mapKitchenTicketPresentation,
  useOrderPresentations,
} from "@/lib/order-presentation";
import { useOperationalDeviceOrderActions } from "@/lib/operational-screen/interaction/useOperationalDeviceOrderActions";
import { resolveOperationalScreenAction } from "@/lib/operational-screen/interaction/deviceOrderExecutionCapabilities";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import { useKitchenRuntimeStream } from "@/lib/operational-screen/kitchen/useKitchenRuntimeStream";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { cn } from "@/lib/utils";

const KITCHEN_STATUSES = ["pending", "preparing", "ready"] as const;

export function KitchenScreenPanel() {
  const context = useRuntimeContext();
  const language = context.presentation.language;
  const isAr = language === "ar";
  const densityModel = context.resolvedDensityModel;
  const role = context.identity.role;
  const {
    queue,
    isLoading,
    isError,
    isShowingStaleData,
    operatorMessage,
    retry,
    isRefetching,
  } = useKitchenRuntimeStream();
  const { canExecute, executeAction, pendingOrderId, successOrderId } =
    useOperationalDeviceOrderActions();

  const tickets = useMemo(() => {
    const columns = queue?.columns ?? { pending: [], preparing: [], ready: [] };
    return sortKitchenTicketsForDisplay([
      ...columns.pending,
      ...columns.preparing,
      ...columns.ready,
    ]);
  }, [queue]);

  const mapTicket = useCallback(
    (ticket: KitchenTicketDto) => mapKitchenTicketPresentation(ticket),
    []
  );
  const getTicketKey = useCallback(
    (ticket: KitchenTicketDto) => String(ticket.orderId),
    []
  );
  const presentations = useOrderPresentations(tickets, mapTicket, getTicketKey);

  // Runtime capability affecting the card: primary action per status for this
  // role. Recomputed only when the role changes, so card `action` props stay
  // referentially stable across queue polls.
  const actionByStatus = useMemo(() => {
    const map = new Map<string, OperationalAction | null>();
    for (const status of KITCHEN_STATUSES) {
      map.set(status, resolveOperationalScreenAction(role, status));
    }
    return map;
  }, [role]);

  const counts = queue?.meta.counts ?? { pending: 0, preparing: 0, ready: 0 };
  const delayed = countDelayedKitchenTickets(tickets);

  if (isLoading && !queue && !isError) {
    return <KitchenOperationalLoadingState language={language} />;
  }

  if (isError && !queue) {
    return (
      <KitchenQueueErrorPanel
        message={operatorMessage ?? (isAr ? "تعذر تحميل الطابور" : "Queue unavailable")}
        retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
        onRetry={retry}
        isRetrying={isRefetching}
        language={language}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3">
      <KitchenQueueSummaryBar counts={counts} delayed={delayed} language={language} />

      {isShowingStaleData ? <KitchenStaleDataBanner language={language} /> : null}

      {!isError && presentations.length === 0 ? (
        <KitchenOperationalIdleState language={language} />
      ) : (
        <div
          className={cn(KITCHEN_GRID_CLASS, densityModel.columnGap)}
          aria-label={isAr ? "طابور المطبخ" : "Kitchen queue"}
        >
          {presentations.map((presentation) => (
            <KitchenExecutionCard
              key={presentation.orderId}
              presentation={presentation}
              language={language}
              densityModel={densityModel}
              action={actionByStatus.get(presentation.status) ?? null}
              onAction={canExecute ? executeAction : undefined}
              actionPending={pendingOrderId === presentation.orderId}
              actionSucceeded={successOrderId === presentation.orderId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
