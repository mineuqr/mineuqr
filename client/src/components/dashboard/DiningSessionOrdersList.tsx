/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — session order rows use SemanticBadge status.
 */
import {
  OperationalOrderStatus,
} from "@/design-system/operational-order-card";
import { formatOrderStatusLabel, type OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import { formatOperationalOrderHeading } from "@/lib/operational-workspace/orderDisplayIdentity";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";

type Lang = "ar" | "en";

export type WorkspaceOrderRow = {
  id: number;
  orderNumber: string;
  displayReference?: string;
  businessDay?: string | null;
  dailyDisplayNumber?: number | null;
  status: string;
  totalAmount: string;
  createdAt: string;
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
  const isAr = language === "ar";
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

            return (
              <li
                key={order.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {formatOperationalOrderHeading(order)}
                    </span>
                    <OperationalOrderStatus
                      status={order.status}
                      statusLabel={statusLabel}
                      isAr={isAr}
                    />
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
