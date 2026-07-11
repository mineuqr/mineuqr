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
import { mapKitchenTicketPresentation } from "@/lib/order-presentation";
import { useOperationalDeviceOrderActions } from "@/lib/operational-screen/interaction/useOperationalDeviceOrderActions";
import { resolveOperationalScreenAction } from "@/lib/operational-screen/interaction/deviceOrderExecutionCapabilities";
import { useKitchenRuntimeStream } from "@/lib/operational-screen/kitchen/useKitchenRuntimeStream";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { cn } from "@/lib/utils";

export function KitchenScreenPanel() {
  const context = useRuntimeContext();
  const language = context.presentation.language;
  const isAr = language === "ar";
  const densityModel = context.resolvedDensityModel;
  const {
    queue,
    isLoading,
    isError,
    isShowingStaleData,
    operatorMessage,
    retry,
    isRefetching,
  } = useKitchenRuntimeStream();
  const { bindTicket } = useOperationalDeviceOrderActions();

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

  const columns = queue?.columns ?? { pending: [], preparing: [], ready: [] };
  const tickets = sortKitchenTicketsForDisplay([
    ...columns.pending,
    ...columns.preparing,
    ...columns.ready,
  ]);
  const counts = queue?.meta.counts ?? { pending: 0, preparing: 0, ready: 0 };
  const delayed = countDelayedKitchenTickets(tickets);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3">
      <KitchenQueueSummaryBar counts={counts} delayed={delayed} language={language} />

      {isShowingStaleData ? <KitchenStaleDataBanner language={language} /> : null}

      {!isError && tickets.length === 0 ? (
        <KitchenOperationalIdleState language={language} />
      ) : (
        <div
          className={cn(KITCHEN_GRID_CLASS, densityModel.columnGap)}
          aria-label={isAr ? "طابور المطبخ" : "Kitchen queue"}
        >
          {tickets.map((ticket) => {
            const presentation = mapKitchenTicketPresentation(ticket);
            const primaryAction = resolveOperationalScreenAction(
              context.identity.role,
              ticket.status
            );
            const interaction = bindTicket(ticket.orderId);
            return (
              <KitchenExecutionCard
                key={ticket.orderId}
                presentation={presentation}
                language={language}
                densityModel={densityModel}
                action={primaryAction}
                onAction={interaction.onPrimaryAction}
                actionPending={interaction.actionPending}
                actionSucceeded={interaction.actionSucceeded}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
