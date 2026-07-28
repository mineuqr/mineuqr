/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — scrollable structured item list.
 */
import type { OrderPresentationModel } from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";
import { cn } from "@/lib/utils";
import { OperationalOrderItem } from "./OperationalOrderItem";

export function OperationalOrderItems({
  presentation,
  isAr,
  lineItemClass,
  quantityClass,
  quantityColumnClass,
  notesClass,
  itemsScrollClass,
  linePrices,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
  lineItemClass: string;
  quantityClass: string;
  quantityColumnClass: string;
  notesClass: string;
  itemsScrollClass: string;
  /** Optional map lineItemId → price label (Waiter / Dashboard). */
  linePrices?: ReadonlyMap<number, string>;
}) {
  const lines = presentation.items.lines;

  if (lines.length === 0) {
    return (
      <p className={cn(lineItemClass, "list-none")}>
        {pickLocalizedLabel(presentation.items.summary, isAr)}
      </p>
    );
  }

  return (
    <div className={itemsScrollClass}>
      <ul className="space-y-0" aria-label={isAr ? "عناصر الطلب" : "Order items"}>
        {lines.map((line, index) => (
          <OperationalOrderItem
            key={line.lineItemId}
            line={line}
            isAr={isAr}
            isLast={index === lines.length - 1}
            lineItemClass={lineItemClass}
            quantityClass={quantityClass}
            quantityColumnClass={quantityColumnClass}
            notesClass={notesClass}
            linePrice={linePrices?.get(line.lineItemId) ?? null}
          />
        ))}
      </ul>
    </div>
  );
}
