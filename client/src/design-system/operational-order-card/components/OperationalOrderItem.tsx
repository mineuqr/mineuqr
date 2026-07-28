/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — single structured line item.
 */
import { cn } from "@/lib/utils";
import type { OrderPresentationLineItem } from "@/lib/order-presentation";
import { OPERATIONAL_ITEM_ROW_DIVIDER_CLASS } from "@/lib/operational-screen/operationalCardTypography";
import { OperationalOrderQuantity } from "./OperationalOrderQuantity";
import { OperationalOrderModifiers } from "./OperationalOrderModifiers";
import { OperationalOrderNotes } from "./OperationalOrderNotes";

export function OperationalOrderItem({
  line,
  isAr,
  isLast,
  lineItemClass,
  quantityClass,
  quantityColumnClass,
  notesClass,
  linePrice,
}: {
  line: OrderPresentationLineItem;
  isAr: boolean;
  isLast: boolean;
  lineItemClass: string;
  quantityClass: string;
  quantityColumnClass: string;
  notesClass: string;
  /** Optional Waiter/Dashboard financial column — presentation only. */
  linePrice?: string | null;
}) {
  const name = isAr ? line.nameAr : line.nameEn || line.nameAr;
  const state = line.lineState ?? "normal";

  return (
    <li
      className={cn(
        "flex min-w-0 items-start gap-[10px] py-1 first:pt-0",
        !isLast && OPERATIONAL_ITEM_ROW_DIVIDER_CLASS,
        state === "cancelled" && "opacity-55 line-through",
        state === "complimentary" && "opacity-90"
      )}
      data-line-state={state}
    >
      <OperationalOrderQuantity
        quantityLabel={line.quantityLabel}
        quantityClass={quantityClass}
        quantityColumnClass={quantityColumnClass}
        lineItemClass={lineItemClass}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span className={cn(lineItemClass, "block break-words")}>{name}</span>
          {linePrice ? (
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {linePrice}
            </span>
          ) : null}
        </div>
        {state === "complimentary" ? (
          <p className={cn(notesClass, "mt-0.5 text-emerald-400/90")}>
            {isAr ? "مجاني" : "Complimentary"}
          </p>
        ) : null}
        {state === "cancelled" ? (
          <p className={cn(notesClass, "mt-0.5 text-rose-400/90")}>
            {isAr ? "ملغى" : "Cancelled"}
          </p>
        ) : null}
        <OperationalOrderModifiers modifiers={line.modifiers} notesClass={notesClass} />
        <OperationalOrderNotes notes={line.itemNotes} notesClass={notesClass} variant="item" />
      </div>
    </li>
  );
}
