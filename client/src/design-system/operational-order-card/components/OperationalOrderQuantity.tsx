/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — dominant quantity primitive.
 */
import { cn } from "@/lib/utils";
import { formatOperationalQuantity } from "@/lib/operational-screen/operationalCardTypography";

export function OperationalOrderQuantity({
  quantityLabel,
  quantityClass,
  quantityColumnClass,
  lineItemClass,
}: {
  quantityLabel: string;
  quantityClass: string;
  quantityColumnClass: string;
  lineItemClass: string;
}) {
  const qty = formatOperationalQuantity(Number(quantityLabel) || 0);
  return (
    <span
      className={cn(quantityColumnClass, quantityClass, lineItemClass, "pt-0")}
      aria-label={`×${qty}`}
    >
      {qty}
    </span>
  );
}
