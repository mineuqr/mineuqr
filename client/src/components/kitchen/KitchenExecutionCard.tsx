import { cn } from "@/lib/utils";
import type { KitchenTicketCardModel } from "@/lib/kitchen/viewModels";
import { urgencyClassName } from "@/lib/kitchen/viewModels";
import {
  formatKitchenElapsed,
  formatQuantityLine,
  toArabicDigits,
} from "@/lib/kitchen/kitchenPresentation";
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { explainDelay } from "@/lib/operational-workspace/delayIntelligence";
import { AlertTriangle, Clock } from "lucide-react";

/**
 * Kitchen execution card — presentation only.
 * Spacing and typography come from resolved PresentationDensityModel (runtime).
 */
export function KitchenExecutionCard({
  ticket,
  sla,
  language,
  densityModel,
  fading,
  className,
}: {
  ticket: KitchenTicketCardModel;
  sla: SlaSnapshot;
  language: string;
  densityModel: PresentationDensityModel;
  fading?: boolean;
  className?: string;
}) {
  const isAr = language === "ar";
  const delay = explainDelay({ status: ticket.status, sla, isAr });
  const showWarning =
    sla.status === "late" || sla.status === "critical" || sla.status === "at-risk";
  const tableValue = isAr ? toArabicDigits(ticket.tableNumber) : String(ticket.tableNumber);

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
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={densityModel.orderNumberClass}>{`#${ticket.orderNumber}`}</p>
          <p className={densityModel.tableLabelClass}>
            {isAr ? `طاولة ${tableValue}` : `Table ${ticket.tableNumber}`}
          </p>
        </div>
        {ticket.customerName ? (
          <p className={densityModel.customerNameClass}>{ticket.customerName}</p>
        ) : null}
      </header>

      <ul className={cn("flex-1", densityModel.ticketListGap)}>
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
        <p className={cn(densityModel.notesPadding, densityModel.notesClass)}>
          {ticket.orderNotes}
        </p>
      ) : null}

      <div className={cn("flex items-center gap-2", densityModel.timingClass)}>
        <Clock className={densityModel.timingIconClass} aria-hidden />
        <span className="tabular-nums">
          {formatKitchenElapsed(ticket.columnElapsedMinutes, isAr)}
        </span>
      </div>

      {showWarning ? (
        <p
          className={cn(
            "flex items-start gap-2 rounded-xl px-4 py-3",
            densityModel.warningClass,
            sla.status === "critical"
              ? "bg-destructive/10 text-destructive"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>{delay.message}</span>
        </p>
      ) : null}
    </article>
  );
}
