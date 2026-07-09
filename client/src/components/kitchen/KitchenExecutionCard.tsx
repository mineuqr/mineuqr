import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenTicketCardModel, KitchenTicketLine } from "@/lib/kitchen/viewModels";
import { urgencyClassName } from "@/lib/kitchen/viewModels";
import {
  formatKitchenElapsedCompact,
  formatKitchenFulfillmentLabel,
  formatKitchenItemOverflow,
  formatKitchenStatusLabel,
  kitchenCardElapsedClass,
  kitchenStatusPresentation,
  productDisplayName,
  toArabicDigits,
} from "@/lib/kitchen/kitchenPresentation";
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { explainDelay } from "@/lib/operational-workspace/delayIntelligence";
import { AlertTriangle, Loader2, StickyNote } from "lucide-react";
import type { KeyboardEvent } from "react";

function KitchenStatusIndicator({
  status,
  isAr,
}: {
  status: KitchenTicketCardModel["status"];
  isAr: boolean;
}) {
  const presentation = kitchenStatusPresentation(status);

  return (
    <div
      className={cn("flex items-center gap-2.5", presentation.labelClass)}
      aria-label={formatKitchenStatusLabel(status, isAr)}
    >
      <span
        className={cn("h-3.5 w-3.5 shrink-0 rounded-full", presentation.dotClass)}
        aria-hidden
      />
      <span className="text-sm font-semibold tracking-tight">
        {formatKitchenStatusLabel(status, isAr)}
      </span>
    </div>
  );
}

function KitchenItemList({
  lineItems,
  linesSummary,
  isAr,
  densityModel,
}: {
  lineItems: KitchenTicketLine[];
  linesSummary: string;
  isAr: boolean;
  densityModel: PresentationDensityModel;
}) {
  if (lineItems.length === 0) {
    return <li className={cn(densityModel.lineItemClass, "col-span-2")}>{linesSummary}</li>;
  }

  const maxVisible = densityModel.maxVisibleLineItems;
  const visible = lineItems.slice(0, maxVisible);
  const overflow = lineItems.length - visible.length;

  return (
    <>
      {visible.map((line) => {
        const qty = isAr ? toArabicDigits(line.quantity) : String(line.quantity);
        const name = productDisplayName(line, isAr);
        return (
          <li key={line.lineItemId} className="contents">
            <span className="self-start pt-0.5 text-end font-mono text-base font-black tabular-nums leading-none text-foreground/90">
              {qty}×
            </span>
            <span className={cn(densityModel.lineItemClass, "min-w-0 break-words pb-0.5")}>
              {name}
            </span>
          </li>
        );
      })}
      {overflow > 0 ? (
        <li className="col-span-2 pt-0.5">
          <span className="text-sm font-semibold text-muted-foreground">
            {formatKitchenItemOverflow(overflow, isAr)}
          </span>
        </li>
      ) : null}
    </>
  );
}

/**
 * Kitchen execution card — operational ticket surface (header / body / footer).
 * Presentation only; functionality unchanged.
 */
export function KitchenExecutionCard({
  ticket,
  sla,
  language,
  densityModel,
  fading,
  className,
  action,
  onAction,
  actionPending,
  onOpenDetails,
  selected,
}: {
  ticket: KitchenTicketCardModel;
  sla: SlaSnapshot;
  language: string;
  densityModel: PresentationDensityModel;
  fading?: boolean;
  className?: string;
  action?: OperationalAction | null;
  onAction?: (actionId: OperationalAction["id"]) => void;
  actionPending?: boolean;
  onOpenDetails?: () => void;
  selected?: boolean;
}) {
  const isAr = language === "ar";
  const delay = explainDelay({ status: ticket.status, sla, isAr });
  const showWarning =
    sla.status === "late" || sla.status === "critical" || sla.status === "at-risk";
  const statusPresentation = kitchenStatusPresentation(ticket.status);
  const fulfillmentLabel = formatKitchenFulfillmentLabel(ticket.tableNumber, isAr);
  const actionLabel = action ? (isAr ? action.labelAr : action.labelEn) : null;
  const hasFooter = Boolean(action && onAction);
  const elapsed = formatKitchenElapsedCompact(ticket.columnElapsedMinutes, isAr);
  const elapsedClass = kitchenCardElapsedClass(sla, densityModel.timingClass);
  const isInteractive = Boolean(onOpenDetails);

  function handleTicketKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpenDetails) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetails();
    }
  }

  return (
    <article
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden bg-card",
        "rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.07)]",
        "ring-1 ring-border/40 transition-[box-shadow,ring-color] duration-150 touch-manipulation",
        densityModel.cardRadius,
        densityModel.cardPadding,
        densityModel.cardMinHeight,
        urgencyClassName(ticket.urgencyTier),
        selected && "ring-2 ring-primary/55 shadow-[0_8px_28px_rgba(0,0,0,0.1)]",
        fading && "opacity-60",
        className
      )}
      dir={isAr ? "rtl" : "ltr"}
      aria-label={
        isAr
          ? `طلب ${ticket.orderNumber}، ${formatKitchenStatusLabel(ticket.status, true)}`
          : `Order ${ticket.orderNumber}, ${formatKitchenStatusLabel(ticket.status, false)}`
      }
    >
      <div
        className={cn("absolute inset-x-0 top-0 h-1", statusPresentation.accentClass)}
        aria-hidden
      />

      <div
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={
          isInteractive
            ? isAr
              ? `عرض تفاصيل الطلب ${ticket.orderNumber}`
              : `View order ${ticket.orderNumber} details`
            : undefined
        }
        onClick={onOpenDetails}
        onKeyDown={handleTicketKeyDown}
        className={cn(
          "flex min-h-0 flex-1 flex-col outline-none",
          isInteractive &&
            "cursor-pointer rounded-lg transition-colors duration-150 hover:bg-muted/20 active:bg-muted/35",
          isInteractive &&
            "focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
        )}
      >
        <header className="mb-3 shrink-0 space-y-1.5 pt-0.5">
          <p className={cn(densityModel.orderNumberClass, "whitespace-nowrap")}>
            {`#${ticket.orderNumber}`}
          </p>

          <KitchenStatusIndicator status={ticket.status} isAr={isAr} />

          <p className={elapsedClass} aria-label={isAr ? "الوقت المنقضي" : "Elapsed time"}>
            {elapsed}
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          <p className={densityModel.tableLabelClass}>{fulfillmentLabel}</p>

          <ul
            className="grid min-h-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2.5 gap-y-2"
            aria-label={isAr ? "عناصر الطلب" : "Order items"}
          >
            <KitchenItemList
              lineItems={ticket.lineItems}
              linesSummary={ticket.linesSummary}
              isAr={isAr}
              densityModel={densityModel}
            />
          </ul>

          {ticket.orderNotes ? (
            <p className={cn("flex items-start gap-2", densityModel.notesClass)}>
              <StickyNote
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80"
                aria-hidden
              />
              <span className="line-clamp-2 break-words">{ticket.orderNotes}</span>
            </p>
          ) : null}

          {showWarning ? (
            <p
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1.5",
                densityModel.warningClass,
                sla.status === "critical"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
              )}
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{delay.message}</span>
            </p>
          ) : null}
        </div>
      </div>

      {hasFooter ? (
        <footer className="mt-auto shrink-0 pt-3">
          <Button
            type="button"
            size="lg"
            variant={action!.variant === "destructive" ? "destructive" : "default"}
            className={cn(
              "h-12 w-full rounded-lg border-0 text-base font-bold text-white shadow-sm",
              "transition-[box-shadow,transform,background-color] duration-150",
              "hover:shadow-md active:scale-[0.98]",
              "focus-visible:ring-2 focus-visible:ring-offset-2",
              statusPresentation.actionButtonClass
            )}
            disabled={actionPending}
            onClick={(event) => {
              event.stopPropagation();
              onAction!(action!.id);
            }}
            aria-label={actionLabel ?? undefined}
          >
            {actionPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              actionLabel
            )}
          </Button>
        </footer>
      ) : null}
    </article>
  );
}
