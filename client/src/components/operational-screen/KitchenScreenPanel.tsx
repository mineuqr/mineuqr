import { useMemo } from "react";
import { KitchenExecutionCard } from "@/components/kitchen/KitchenExecutionCard";
import { toKitchenTicketCard } from "@/lib/kitchen/viewModels";
import { computeSlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { useKitchenRuntimeStream } from "@/lib/operational-screen/kitchen/useKitchenRuntimeStream";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { Loader2 } from "lucide-react";

export function KitchenScreenPanel() {
  const context = useRuntimeContext();
  const language = context.presentation.language;
  const { queue, isLoading } = useKitchenRuntimeStream();

  if (isLoading && !queue) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const columns = queue?.columns ?? { pending: [], preparing: [], ready: [] };

  const renderColumn = (title: string, tickets: typeof columns.pending) => (
    <section className="min-w-0 flex-1 space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-3">
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
            />
          );
        })}
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{language === "ar" ? "لا طلبات" : "No orders"}</p>
        ) : null}
      </div>
    </section>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {renderColumn(language === "ar" ? "قيد الانتظار" : "Pending", columns.pending)}
      {renderColumn(language === "ar" ? "قيد التحضير" : "Preparing", columns.preparing)}
      {renderColumn(language === "ar" ? "جاهز" : "Ready", columns.ready)}
    </div>
  );
}
