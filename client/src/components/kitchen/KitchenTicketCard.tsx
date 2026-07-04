import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KitchenTicketCardModel } from "@/lib/kitchen/viewModels";
import { urgencyClassName } from "@/lib/kitchen/viewModels";
import { Loader2 } from "lucide-react";

export function KitchenTicketCard({
  ticket,
  language,
  disabled,
  onStartPreparing,
  onMarkReady,
  onMarkServed,
}: {
  ticket: KitchenTicketCardModel;
  language: string;
  disabled?: boolean;
  onStartPreparing?: () => void;
  onMarkReady?: () => void;
  onMarkServed?: () => void;
}) {
  const isAr = language === "ar";

  const action =
    ticket.canStartPreparing ? (
      <Button size="sm" className="w-full" disabled={disabled} onClick={onStartPreparing}>
        {isAr ? "بدء التحضير" : "Start Preparing"}
      </Button>
    ) : ticket.canMarkReady ? (
      <Button size="sm" className="w-full" disabled={disabled} onClick={onMarkReady}>
        {isAr ? "جاهز" : "Mark Ready"}
      </Button>
    ) : ticket.canMarkServed ? (
      <Button size="sm" variant="secondary" className="w-full" disabled={disabled} onClick={onMarkServed}>
        {isAr ? "تم التقديم" : "Mark Served"}
      </Button>
    ) : null;

  return (
    <article
      className={cn(
        "rounded-lg border p-3 shadow-sm transition-colors",
        urgencyClassName(ticket.urgencyTier)
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{ticket.orderNumber}</p>
          <p className="text-sm text-muted-foreground">
            {isAr ? `طاولة ${ticket.tableNumber}` : `Table ${ticket.tableNumber}`}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{isAr ? `${ticket.elapsedMinutes} د` : `${ticket.elapsedMinutes}m`}</p>
          <p>{isAr ? `${ticket.lineCount} عنصر` : `${ticket.lineCount} items`}</p>
        </div>
      </div>

      {ticket.customerName ? (
        <p className="mb-1 text-sm">{ticket.customerName}</p>
      ) : null}

      <p className="mb-2 line-clamp-3 text-sm text-muted-foreground">{ticket.linesSummary}</p>

      {ticket.orderNotes ? (
        <p className="mb-2 rounded bg-muted/50 px-2 py-1 text-xs">{ticket.orderNotes}</p>
      ) : null}

      {action}
    </article>
  );
}

export function KitchenColumnSkeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
