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

  const renderColumn = (title: string, tickets: typeof columns.pending) => (
    <section className={cn("min-w-0 flex-1", densityModel.columnSectionGap)}>
      <h2 className={densityModel.sectionTitleClass}>{title}</h2>
      <div className={densityModel.ticketListGap}>
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
        {!isError && tickets.length === 0 ? (
          <p className={densityModel.emptyStateClass}>
            {isAr ? "لا طلبات" : "No orders"}
          </p>
        ) : null}
      </div>
    </section>
  );

  return (
    <div>
      {isShowingStaleData ? <KitchenStaleDataBanner language={language} /> : null}
      <div className={cn("grid lg:grid-cols-3", densityModel.columnGap)}>
        {renderColumn(isAr ? "قيد الانتظار" : "Pending", columns.pending)}
        {renderColumn(isAr ? "قيد التحضير" : "Preparing", columns.preparing)}
        {renderColumn(isAr ? "جاهز" : "Ready", columns.ready)}
      </div>
    </div>
  );
}
