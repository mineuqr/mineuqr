import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenTicketCardModel, KitchenTicketLine } from "@/lib/kitchen/viewModels";
import { urgencyClassName } from "@/lib/kitchen/viewModels";
import {
  formatKitchenStatusLabel,
  kitchenStatusPresentation,
  productDisplayName,
} from "@/lib/kitchen/kitchenPresentation";
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import {
  formatOperationalElapsedCompact,
  formatOperationalFulfillmentLabel,
  formatOperationalItemOverflow,
  formatOperationalQuantity,
  operationalCardElapsedClass,
  operationalStatusLabelClass,
} from "@/lib/operational-screen/operationalCardTypography";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { explainDelay } from "@/lib/operational-workspace/delayIntelligence";
import { AlertTriangle, Check, Loader2, StickyNote } from "lucide-react";
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
      className={cn("inline-flex items-center gap-2", presentation.labelClass)}
      aria-label={formatKitchenStatusLabel(status, isAr)}
    >
      <span
        className={cn("h-3 w-3 shrink-0 rounded-full", presentation.dotClass)}
        aria-hidden
      />
      <span className={operationalStatusLabelClass(status)}>
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
    return <li className={cn(densityModel.lineItemClass, "list-none")}>{linesSummary}</li>;
  }

  const maxVisible = densityModel.maxVisibleLineItems;
  const visible = lineItems.slice(0, maxVisible);
  const overflow = lineItems.length - visible.length;

  return (
    <>
      {visible.map((line) => {
        const qty = formatOperationalQuantity(line.quantity);
        const name = productDisplayName(line, isAr);
        return (
          <li key={line.lineItemId} className="flex min-w-0 items-baseline gap-1">
            <span className={cn("shrink-0 font-mono", densityModel.quantityClass)}>
              ×{qty}
            </span>
            <span className={cn(densityModel.lineItemClass, "min-w-0 truncate")}>{name}</span>
          </li>
        );
      })}
      {overflow > 0 ? (
        <li className="list-none pt-0.5">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {formatOperationalItemOverflow(overflow, isAr)}
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
  actionSucceeded,
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
  actionSucceeded?: boolean;
  onOpenDetails?: () => void;
  selected?: boolean;
}) {
  const isAr = language === "ar";
  const delay = explainDelay({ status: ticket.status, sla, isAr });
  const showWarning =
    sla.status === "late" || sla.status === "critical" || sla.status === "at-risk";
  const statusPresentation = kitchenStatusPresentation(ticket.status);
  const fulfillmentLabel = formatOperationalFulfillmentLabel(ticket.tableNumber, isAr);
  const actionLabel = action ? (isAr ? action.labelAr : action.labelEn) : null;
  const hasFooter = Boolean(action && onAction);
  const elapsed = formatOperationalElapsedCompact(ticket.columnElapsedMinutes, isAr);
  const elapsedClass = operationalCardElapsedClass(sla, densityModel.timingClass);
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
        "rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_14px_rgba(0,0,0,0.06)]",
        "ring-1 ring-border/40 transition-[box-shadow,ring-color] duration-150 touch-manipulation",
        densityModel.cardRadius,
        densityModel.cardPadding,
        densityModel.cardMinHeight,
        urgencyClassName(ticket.urgencyTier),
        selected && "ring-2 ring-primary/55 shadow-[0_6px_22px_rgba(0,0,0,0.1)]",
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
        className={cn("absolute inset-x-0 top-0 h-0.5", statusPresentation.accentClass)}
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
        <header className="mb-1.5 shrink-0 space-y-0.5">
          <p className={cn(densityModel.orderNumberClass, "whitespace-nowrap tabular-nums")}>
            {ticket.orderNumber}
          </p>

          <KitchenStatusIndicator status={ticket.status} isAr={isAr} />

          <p className={elapsedClass} aria-label={isAr ? "الوقت المنقضي" : "Elapsed time"}>
            {elapsed}
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <ul className="space-y-1" aria-label={isAr ? "عناصر الطلب" : "Order items"}>
            <KitchenItemList
              lineItems={ticket.lineItems}
              linesSummary={ticket.linesSummary}
              isAr={isAr}
              densityModel={densityModel}
            />
          </ul>

          <p className={densityModel.tableLabelClass}>{fulfillmentLabel}</p>

          {ticket.orderNotes ? (
            <p className={cn("flex items-start gap-1.5", densityModel.notesClass)}>
              <StickyNote
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
                aria-hidden
              />
              <span className="line-clamp-2 break-words">{ticket.orderNotes}</span>
            </p>
          ) : null}

          {showWarning ? (
            <p
              className={cn(
                "flex items-start gap-1.5 rounded px-1.5 py-1",
                densityModel.warningClass,
                sla.status === "critical"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
              )}
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>{delay.message}</span>
            </p>
          ) : null}
        </div>
      </div>

      {hasFooter ? (
        <footer className="mt-1 shrink-0 border-t border-border/20 pt-2">
          <Button
            type="button"
            size="lg"
            variant={action!.variant === "destructive" ? "destructive" : "default"}
            className={cn(
              "h-11 w-full rounded-lg border-0 text-sm font-bold text-white shadow-sm",
              "transition-[box-shadow,transform,background-color] duration-150",
              "active:scale-[0.98]",
              "focus-visible:ring-2 focus-visible:ring-offset-2",
              statusPresentation.actionButtonClass
            )}
            disabled={actionPending}
            aria-busy={actionPending ? true : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onAction!(action!.id);
            }}
            aria-label={actionLabel ?? undefined}
          >
            {actionPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : actionSucceeded ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-5 w-5" aria-hidden />
                {actionLabel}
              </span>
            ) : (
              actionLabel
            )}
          </Button>
        </footer>
      ) : null}
    </article>
  );
}
