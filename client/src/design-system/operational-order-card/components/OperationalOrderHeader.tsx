/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — identity + channel/table header.
 */
import type { OrderPresentationModel } from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";
import { cn } from "@/lib/utils";

export function OperationalOrderHeader({
  presentation,
  isAr,
  orderNumberClass,
  tableLabelClass,
  showCustomer = false,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
  orderNumberClass: string;
  tableLabelClass: string;
  showCustomer?: boolean;
}) {
  const fulfillment = pickLocalizedLabel(presentation.fulfillment.label, isAr);

  return (
    <header className="mb-1.5 shrink-0 border-b border-border/15 pb-1.5">
      <p className={cn(orderNumberClass, "whitespace-nowrap tabular-nums")}>
        {presentation.identity.displayReference}
      </p>
      {fulfillment ? (
        <p className={cn(tableLabelClass, "mt-1")}>{fulfillment}</p>
      ) : null}
      {showCustomer && presentation.customer.name ? (
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {presentation.customer.name}
        </p>
      ) : null}
    </header>
  );
}
