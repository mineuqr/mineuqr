import { Badge } from "@/components/ui/badge";
import { formatOrderStatusLabel, type OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";

type Lang = "ar" | "en";

export type WorkspaceOrderRow = {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  preparing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ready: "bg-green-500/20 text-green-400 border-green-500/30",
  served: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

type DiningSessionOrdersListProps = {
  orders: WorkspaceOrderRow[];
  language: Lang;
  currencySymbol: string;
};

export function DiningSessionOrdersList({
  orders,
  language,
  currencySymbol,
}: DiningSessionOrdersListProps) {
  const formatTime = (value: string) =>
    formatRiyadhDateTime(value, language === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        {sessionSummaryLabel("ordersInSession", language)}
      </h3>

      {orders.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {sessionSummaryLabel("noOrders", language)}
        </p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/40">
          {orders.map((order) => {
            const statusKey = order.status as OrderLifecycleStatus;
            const statusLabel = formatOrderStatusLabel(statusKey, language);
            const colorClass = statusColors[order.status] ?? statusColors.pending;

            return (
              <li
                key={order.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      #{order.orderNumber}
                    </span>
                    <Badge className={`${colorClass} border px-2 py-0 text-xs`}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <time
                    dateTime={order.createdAt}
                    className="mt-1 block text-xs tabular-nums text-muted-foreground"
                  >
                    {formatTime(order.createdAt)}
                  </time>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                  {order.totalAmount} {currencySymbol}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
