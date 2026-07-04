import { cn } from "@/lib/utils";
import type { KitchenTicketCardModel } from "@/lib/kitchen/viewModels";
import { urgencyClassName } from "@/lib/kitchen/viewModels";
import {
  formatKitchenElapsed,
  formatQuantityLine,
  toArabicDigits,
} from "@/lib/kitchen/kitchenPresentation";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { explainDelay } from "@/lib/operational-workspace/delayIntelligence";
import { AlertTriangle, Clock } from "lucide-react";

/**
 * Kitchen execution card — presentation only.
 * Larger typography, Arabic-first items, no-wrap identifiers, glanceable timing.
 * No lifecycle actions (execution workspace).
 */
export function KitchenExecutionCard({
  ticket,
  sla,
  language,
  fading,
  className,
}: {
  ticket: KitchenTicketCardModel;
  sla: SlaSnapshot;
  language: string;
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
        "w-full rounded-2xl border p-6 shadow-sm transition-all touch-manipulation",
        "min-h-[260px] flex flex-col gap-5",
        urgencyClassName(ticket.urgencyTier),
        fading && "opacity-60",
        className
      )}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Identifier + table */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="whitespace-nowrap font-mono text-2xl font-bold tracking-tight">
            {`#${ticket.orderNumber}`}
          </p>
          <p className="mt-1 text-lg font-medium text-muted-foreground">
            {isAr ? `طاولة ${tableValue}` : `Table ${ticket.tableNumber}`}
          </p>
        </div>
        {ticket.customerName ? (
          <p className="max-w-[45%] truncate text-lg font-medium text-muted-foreground">
            {ticket.customerName}
          </p>
        ) : null}
      </header>

      {/* Items — largest emphasis */}
      <ul className="flex-1 space-y-3">
        {ticket.lineItems.length > 0 ? (
          ticket.lineItems.map((line) => (
            <li
              key={line.lineItemId}
              className="text-2xl font-bold leading-snug tracking-tight"
            >
              {formatQuantityLine(line, isAr)}
            </li>
          ))
        ) : (
          <li className="text-2xl font-bold leading-snug tracking-tight">
            {ticket.linesSummary}
          </li>
        )}
      </ul>

      {/* Notes */}
      {ticket.orderNotes ? (
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-lg font-medium leading-relaxed">
          {ticket.orderNotes}
        </p>
      ) : null}

      {/* Timing */}
      <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
        <Clock className="h-5 w-5 shrink-0" aria-hidden />
        <span className="tabular-nums">
          {formatKitchenElapsed(ticket.columnElapsedMinutes, isAr)}
        </span>
      </div>

      {/* Warning message */}
      {showWarning ? (
        <p
          className={cn(
            "flex items-start gap-2 rounded-xl px-4 py-3 text-base font-semibold",
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
