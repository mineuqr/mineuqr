import { KitchenExecutionCard } from "@/components/kitchen/KitchenExecutionCard";
import {
  KitchenQueueErrorPanel,
  KitchenStaleDataBanner,
} from "@/components/operational-screen/KitchenQueueOperationalBanner";
import { toKitchenTicketCard } from "@/lib/kitchen/viewModels";
import { computeSlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { useKitchenRuntimeStream } from "@/lib/operational-screen/kitchen/useKitchenRuntimeStream";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const KITCHEN_GRID_CLASS =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

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

  if (isLoading && !queue && !isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
  const tickets = [...columns.pending, ...columns.preparing, ...columns.ready];

  return (
    <div>
      {isShowingStaleData ? <KitchenStaleDataBanner language={language} /> : null}
      {!isError && tickets.length === 0 ? (
        <p className={densityModel.emptyStateClass}>
          {isAr ? "لا طلبات" : "No orders"}
        </p>
      ) : (
        <div className={cn(KITCHEN_GRID_CLASS, densityModel.columnGap)}>
          {tickets.map((ticket) => {
            const model = toKitchenTicketCard(ticket);
            const sla = computeSlaSnapshot(
              ticket.status,
              ticket.columnElapsedSeconds,
              ticket.elapsedSeconds
            );
            return (
              <KitchenExecutionCard
                key={ticket.orderId}
                ticket={model}
                sla={sla}
                language={language}
                densityModel={densityModel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
