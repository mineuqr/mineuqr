import { formatTimelineEventDescription } from "@/lib/diningSessionTimelineCopy";
import type { WorkspaceTimelineEvent } from "@/lib/diningSessionWorkspaceView";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { restaurantDash } from "./restaurantDashStyles";

type Lang = "ar" | "en";

export type { WorkspaceTimelineEvent };

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
    <section
      className={cn(restaurantDash.panelInset, "p-4")}
      aria-label={sessionSummaryLabel("timeline", language)}
    >
      <h3 className="mb-3 text-sm font-semibold text-white">
        {sessionSummaryLabel("timeline", language)}
      </h3>

      {events.length === 0 ? (
        <p className="py-2 text-center text-sm text-slate-400">
          {language === "ar" ? "لا توجد أحداث بعد" : "No events yet"}
        </p>
      ) : (
        <ol className="relative space-y-5 border-s border-cyan-500/20 ps-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                className="absolute -start-[1.3125rem] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400/80 ring-4 ring-slate-900"
                aria-hidden
              />
              <time
                dateTime={event.createdAt}
                className="mb-1 block text-xs font-medium tabular-nums text-slate-500"
              >
                {formatTime(event.createdAt)}
              </time>
              <p className="text-sm text-slate-200">
                {formatTimelineEventDescription(event, language, currencySymbol)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
