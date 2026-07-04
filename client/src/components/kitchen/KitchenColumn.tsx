import { KitchenTicketCard } from "@/components/kitchen/KitchenTicketCard";
import type { KitchenColumnId } from "@/lib/kitchen/viewModels";
import type { KitchenTicketCardModel } from "@/lib/kitchen/viewModels";

const COLUMN_LABELS: Record<KitchenColumnId, { en: string; ar: string }> = {
  pending: { en: "New", ar: "جديد" },
  preparing: { en: "Preparing", ar: "قيد التحضير" },
  ready: { en: "Ready", ar: "جاهز" },
};

export function KitchenColumn({
  columnId,
  tickets,
  count,
  language,
  actionPendingOrderId,
  onAdvance,
}: {
  columnId: KitchenColumnId;
  tickets: KitchenTicketCardModel[];
  count: number;
  language: string;
  actionPendingOrderId: number | null;
  onAdvance: (
    orderId: number,
    action: "start-preparing" | "mark-ready" | "mark-served"
  ) => void;
}) {
  const isAr = language === "ar";
  const label = isAr ? COLUMN_LABELS[columnId].ar : COLUMN_LABELS[columnId].en;

  return (
    <section className="flex min-h-[420px] flex-1 flex-col rounded-xl border bg-muted/20">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">{label}</h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-sm text-muted-foreground">
          {count}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {tickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isAr ? "لا توجد تذاكر" : "No tickets"}
          </p>
        ) : (
          tickets.map((ticket) => (
            <KitchenTicketCard
              key={ticket.orderId}
              ticket={ticket}
              language={language}
              disabled={actionPendingOrderId === ticket.orderId}
              onStartPreparing={
                ticket.canStartPreparing
                  ? () => onAdvance(ticket.orderId, "start-preparing")
                  : undefined
              }
              onMarkReady={
                ticket.canMarkReady ? () => onAdvance(ticket.orderId, "mark-ready") : undefined
              }
              onMarkServed={
                ticket.canMarkServed ? () => onAdvance(ticket.orderId, "mark-served") : undefined
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
