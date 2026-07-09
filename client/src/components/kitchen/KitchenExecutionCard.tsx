import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenTicketCardModel } from "@/lib/kitchen/viewModels";
import { urgencyClassName } from "@/lib/kitchen/viewModels";
import {
  deriveKitchenOrderType,
  formatKitchenElapsed,
  formatKitchenOrderType,
  formatKitchenStatusLabel,
  formatQuantityLine,
  toArabicDigits,
} from "@/lib/kitchen/kitchenPresentation";
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { explainDelay } from "@/lib/operational-workspace/delayIntelligence";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";

/**
 * Kitchen execution card — compact operational layout.
 * Spacing and typography come from resolved PresentationDensityModel.
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
}) {
  const isAr = language === "ar";
  const delay = explainDelay({ status: ticket.status, sla, isAr });
  const showWarning =
    sla.status === "late" || sla.status === "critical" || sla.status === "at-risk";
  const orderType = deriveKitchenOrderType(ticket.tableNumber);
  const tableValue = isAr ? toArabicDigits(ticket.tableNumber) : String(ticket.tableNumber);
  const actionLabel = action ? (isAr ? action.labelAr : action.labelEn) : null;

  return (
    <article
      className={cn(
        "w-full border shadow-sm transition-all touch-manipulation",
        "flex flex-col",
        densityModel.cardPadding,
        densityModel.cardGap,
        densityModel.cardMinHeight,
        densityModel.cardRadius,
        urgencyClassName(ticket.urgencyTier),
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
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className={densityModel.orderNumberClass}>{`#${ticket.orderNumber}`}</p>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                ticket.status === "pending" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                ticket.status === "preparing" && "bg-blue-500/15 text-blue-700 dark:text-blue-400",
                ticket.status === "ready" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              )}
            >
              {formatKitchenStatusLabel(ticket.status, isAr)}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={densityModel.tableLabelClass}>
              {formatKitchenOrderType(orderType, isAr)}
            </span>
            {orderType === "table" ? (
              <span className={densityModel.tableLabelClass}>
                {isAr ? `· ${tableValue}` : `· ${ticket.tableNumber}`}
              </span>
            ) : null}
          </div>
        </div>
        <div
          className={cn("flex shrink-0 items-center gap-1", densityModel.timingClass)}
          aria-label={isAr ? "الوقت المنقضي" : "Elapsed time"}
        >
          <Clock className={densityModel.timingIconClass} aria-hidden />
          <span className="tabular-nums">
            {formatKitchenElapsed(ticket.columnElapsedMinutes, isAr)}
          </span>
        </div>
      </header>

      <ul className={densityModel.ticketListGap} aria-label={isAr ? "عناصر الطلب" : "Order items"}>
        {ticket.lineItems.length > 0 ? (
          ticket.lineItems.map((line) => (
            <li key={line.lineItemId} className={densityModel.lineItemClass}>
              {formatQuantityLine(line, isAr)}
            </li>
          ))
        ) : (
          <li className={densityModel.lineItemClass}>{ticket.linesSummary}</li>
        )}
      </ul>

      {ticket.orderNotes ? (
        <p className={cn(densityModel.notesPadding, densityModel.notesClass, "line-clamp-2")}>
          {ticket.orderNotes}
        </p>
      ) : null}

      {showWarning ? (
        <p
          className={cn(
            "flex items-start gap-1.5 rounded-md px-2 py-1",
            densityModel.warningClass,
            sla.status === "critical"
              ? "bg-destructive/10 text-destructive"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{delay.message}</span>
        </p>
      ) : null}

      {action && onAction ? (
        <Button
          type="button"
          size="sm"
          variant={action.variant === "destructive" ? "destructive" : "default"}
          className="min-h-11 w-full touch-manipulation"
          disabled={actionPending}
          onClick={() => onAction(action.id)}
          aria-label={actionLabel ?? undefined}
        >
          {actionPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : actionLabel}
        </Button>
      ) : null}
    </article>
  );
}
