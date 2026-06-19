import { formatTimelineEventDescription } from "@/lib/diningSessionTimelineCopy";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";

type Lang = "ar" | "en";

export type WorkspaceTimelineEvent = {
  id: number;
  eventType: string;
  createdAt: string;
  orderNumber?: string | null;
  totalAmount?: string | null;
};

type DiningSessionTimelineListProps = {
  events: WorkspaceTimelineEvent[];
  language: Lang;
  currencySymbol: string;
};

export function DiningSessionTimelineList({
  events,
  language,
  currencySymbol,
}: DiningSessionTimelineListProps) {
  const formatTime = (value: string) =>
    formatRiyadhDateTime(value, language === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        {sessionSummaryLabel("timeline", language)}
      </h3>

      {events.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {language === "ar" ? "لا توجد أحداث بعد" : "No events yet"}
        </p>
      ) : (
        <ol className="relative space-y-6 border-s border-border/50 ps-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                className="absolute -start-[1.3125rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/80 ring-4 ring-background"
                aria-hidden
              />
              <time
                dateTime={event.createdAt}
                className="mb-1 block text-xs font-medium tabular-nums text-muted-foreground"
              >
                {formatTime(event.createdAt)}
              </time>
              <p className="text-sm text-foreground">
                {formatTimelineEventDescription(event, language, currencySymbol)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
