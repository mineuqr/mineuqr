import { formatOrderStatusLabel, type OrderLifecycleStatus } from "@/lib/orderStatusDisplay";

export type TimelineEntry = {
  eventId: string;
  fromStatus: string | null;
  toStatus: string;
  occurredAt: string;
};

export function OperationalTimeline({
  events,
  language,
}: {
  events: TimelineEntry[];
  language: string;
}) {
  const isAr = language === "ar";
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {isAr ? "لا يوجد سجل" : "No timeline events"}
      </p>
    );
  }

  return (
    <ol className="space-y-3 border-s-2 border-border/60 ps-4">
      {events.map((event) => (
        <li key={event.eventId} className="relative">
          <span className="absolute -start-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm font-medium">
            {formatOrderStatusLabel(event.toStatus as OrderLifecycleStatus, isAr ? "ar" : "en")}
          </p>
          <p className="text-xs text-muted-foreground">{event.occurredAt}</p>
        </li>
      ))}
    </ol>
  );
}
