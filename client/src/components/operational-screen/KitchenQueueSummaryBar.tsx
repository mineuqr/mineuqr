import { cn } from "@/lib/utils";

type QueueCounts = {
  pending: number;
  preparing: number;
  ready: number;
};

export function KitchenQueueSummaryBar({
  counts,
  delayed,
  language,
  className,
}: {
  counts: QueueCounts;
  delayed: number;
  language: string;
  className?: string;
}) {
  const isAr = language === "ar";

  const items = [
    {
      id: "new",
      label: isAr ? "جديد" : "New",
      value: counts.pending,
      tone: counts.pending > 0 ? "text-sky-300" : "text-muted-foreground/70",
    },
    {
      id: "prep",
      label: isAr ? "تحضير" : "Preparing",
      value: counts.preparing,
      tone: counts.preparing > 0 ? "text-orange-300" : "text-muted-foreground/70",
    },
    {
      id: "ready",
      label: isAr ? "جاهز" : "Ready",
      value: counts.ready,
      tone: counts.ready > 0 ? "text-emerald-300" : "text-muted-foreground/70",
    },
    {
      id: "delayed",
      label: isAr ? "متأخر" : "Delayed",
      value: delayed,
      tone: delayed > 0 ? "text-red-400" : "text-muted-foreground/70",
    },
  ] as const;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1.5 rounded-xl border border-border/25 bg-[#12161f]/70 p-1.5 sm:grid-cols-4 sm:gap-2 sm:p-2",
        className
      )}
      aria-label={isAr ? "ملخص الطابور" : "Queue summary"}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col items-center justify-center rounded-lg px-2 py-1.5 sm:py-2"
        >
          <span className={cn("font-mono text-2xl font-black tabular-nums leading-none sm:text-3xl", item.tone)}>
            {item.value}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function KitchenQueueSummaryBarSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/25 bg-[#12161f]/70 p-1.5 sm:grid-cols-4 sm:gap-2 sm:p-2"
      aria-hidden
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex flex-col items-center gap-2 px-2 py-2">
          <div className="h-8 w-10 animate-pulse rounded bg-border/20 sm:h-9" />
          <div className="h-2.5 w-12 animate-pulse rounded bg-border/15" />
        </div>
      ))}
    </div>
  );
}
