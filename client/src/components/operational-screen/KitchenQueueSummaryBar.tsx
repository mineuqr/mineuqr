import { cn } from "@/lib/utils";

type QueueCounts = {
  pending: number;
  preparing: number;
  ready: number;
};

export function KitchenQueueSummaryBar({
  counts,
  total,
  language,
  className,
}: {
  counts: QueueCounts;
  total: number;
  language: string;
  className?: string;
}) {
  const isAr = language === "ar";

  const items = [
    {
      id: "new",
      label: isAr ? "جديد" : "New",
      value: counts.pending,
      tone: counts.pending > 0 ? "text-sky-300" : "text-muted-foreground",
    },
    {
      id: "prep",
      label: isAr ? "تحضير" : "Preparing",
      value: counts.preparing,
      tone: "text-orange-300",
    },
    {
      id: "ready",
      label: isAr ? "جاهز" : "Ready",
      value: counts.ready,
      tone: counts.ready > 0 ? "text-emerald-300" : "text-muted-foreground",
    },
    {
      id: "total",
      label: isAr ? "الطابور" : "Queue",
      value: total,
      tone: "text-foreground",
    },
  ] as const;

  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-2 rounded-xl border border-border/30 bg-[#12161f]/80 px-3 py-2",
        className
      )}
      aria-label={isAr ? "ملخص الطابور" : "Queue summary"}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="flex min-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-lg px-2 py-1.5"
        >
          <span className={cn("font-mono text-2xl font-black tabular-nums leading-none", item.tone)}>
            {item.value}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
