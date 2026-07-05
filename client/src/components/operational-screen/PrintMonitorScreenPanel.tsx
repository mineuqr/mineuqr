import { DATA_POLL_INTERVAL_MS } from "@/lib/operational-screen/bootstrapLogic";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";
import { Loader2, Printer } from "lucide-react";

export function PrintMonitorScreenPanel() {
  const context = useRuntimeContext();
  const language = context.presentation.language;
  const isAr = language === "ar";

  const summaryQuery = screenTrpc.operationalDevice.runtime.getPrintMonitorSummary.useQuery(undefined, {
    refetchInterval:
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? DATA_POLL_INTERVAL_MS
        : false,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const awaitingCount = summaryQuery.data?.awaitingCount ?? 0;
  const items = summaryQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/30 p-6">
        <Printer className="h-10 w-10 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">
            {isAr ? "طلبات بانتظار الطباعة" : "Orders awaiting print"}
          </p>
          <p className="text-4xl font-bold">{awaitingCount}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.orderId}
            className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3"
          >
            <span className="font-mono font-medium">#{item.orderNumber}</span>
            <span className="text-sm text-muted-foreground">
              {item.isActive ? (isAr ? "نشط" : "Active") : isAr ? "غير نشط" : "Inactive"}
            </span>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {isAr ? "لا توجد طلبات" : "No orders in queue"}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
