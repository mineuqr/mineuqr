import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { formatRiyadhDateTime } from "@/lib/datetime";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActivityFeedQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  DoorOpen,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { useState, type ComponentType } from "react";

/** Home dashboard compact preview — full feed uses API default (25). */
const HOME_ACTIVITY_FEED_LIMIT = 5;
const FULL_ACTIVITY_FEED_LIMIT = 25;

type ActivityFeedEvent = RouterOutputs["ops"]["getActivityFeed"]["events"][number];
type ActivityFeedEventType = ActivityFeedEvent["eventType"];

const EVENT_VISUALS: Record<
  ActivityFeedEventType,
  { icon: ComponentType<{ className?: string }>; iconClass: string; dotClass: string }
> = {
  session_opened: {
    icon: DoorOpen,
    iconClass: "text-emerald-400",
    dotClass: "bg-emerald-500/20 border-emerald-500/35",
  },
  order_created: {
    icon: Receipt,
    iconClass: "text-primary",
    dotClass: "bg-primary/15 border-primary/35",
  },
  order_status_changed: {
    icon: RefreshCw,
    iconClass: "text-sky-400",
    dotClass: "bg-sky-500/15 border-sky-500/35",
  },
  session_paid: {
    icon: CreditCard,
    iconClass: "text-emerald-400",
    dotClass: "bg-emerald-500/15 border-emerald-500/35",
  },
  session_complimentary: {
    icon: Clock3,
    iconClass: "text-violet-400",
    dotClass: "bg-violet-500/15 border-violet-500/35",
  },
  session_closed: {
    icon: CheckCircle,
    iconClass: "text-muted-foreground",
    dotClass: "bg-muted/20 border-border/50",
  },
};

function parseEventTimestampMs(value: string): number {
  const normalized = value.replace(" ", "T") + (value.includes("T") ? "" : "Z");
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function formatRelativeEventTime(occurredAt: string, isAr: boolean, nowMs = Date.now()): string {
  const eventMs = parseEventTimestampMs(occurredAt);
  if (!Number.isFinite(eventMs)) return occurredAt;

  const diffSec = Math.max(0, Math.floor((nowMs - eventMs) / 1000));
  if (diffSec < 60) return isAr ? "الآن" : "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return isAr
      ? `منذ ${diffMin} د`
      : `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return isAr
      ? `منذ ${diffHr} س`
      : `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  }

  return formatRiyadhDateTime(
    new Date(eventMs).toISOString(),
    isAr ? "ar-SA" : "en-US",
    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
  );
}

function localizedEventTitle(eventType: ActivityFeedEventType, isAr: boolean): string {
  const titles: Record<ActivityFeedEventType, { en: string; ar: string }> = {
    session_opened: { en: "Session opened", ar: "فتحت جلسة" },
    order_created: { en: "Order created", ar: "طلب جديد" },
    order_status_changed: { en: "Order status updated", ar: "تحديث حالة الطلب" },
    session_paid: { en: "Session paid", ar: "تسجيل الدفع" },
    session_complimentary: { en: "Session complimentary", ar: "جلسة ضيافة" },
    session_closed: { en: "Session closed", ar: "أُغلقت الجلسة" },
  };
  return isAr ? titles[eventType].ar : titles[eventType].en;
}

function ActivityFeedItemSkeleton({ isLast }: { isLast: boolean }) {
  return (
    <div className={cn("flex gap-2.5 px-3 py-2.5", !isLast && "border-b border-border/30")}>
      <div className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-muted/40" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-36 animate-pulse rounded bg-muted/40" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted/30" />
      </div>
    </div>
  );
}

function ActivityFeedTimelineRow({
  event,
  isAr,
  isLast,
  onOpenSession,
}: {
  event: ActivityFeedEvent;
  isAr: boolean;
  isLast: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  const visuals = EVENT_VISUALS[event.eventType];
  const Icon = visuals.icon;
  const title = localizedEventTitle(event.eventType, isAr);
  const timeLabel = formatRelativeEventTime(event.occurredAt, isAr);

  return (
    <article
      className={cn(
        "flex gap-2.5 px-3 py-2.5 sm:items-start sm:justify-between sm:gap-3",
        !isLast && "border-b border-border/30"
      )}
    >
      <div className="flex min-w-0 flex-1 gap-2.5">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
            visuals.dotClass,
            visuals.iconClass
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <span className="text-xs tabular-nums text-muted-foreground">{timeLabel}</span>
          </div>
          {event.subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.subtitle}</p>
          ) : null}
          {event.tableName ? (
            <p className="mt-0.5 truncate text-xs font-medium text-foreground/90">
              {event.tableName}
            </p>
          ) : null}
        </div>
      </div>

      {event.sessionId ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-primary hover:text-primary"
          onClick={() => onOpenSession(Number.parseInt(event.sessionId!, 10))}
        >
          {isAr ? "فتح الجلسة" : "Open Session"}
        </Button>
      ) : null}
    </article>
  );
}

export function OperationalActivityFeedSection({
  restaurantId,
  language,
  queriesEnabled,
  onOpenSession,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const [showFullFeed, setShowFullFeed] = useState(false);
  const isAr = language === "ar";
  const sectionTitle = isAr ? "النشاط الأخير" : "Recent Activity";
  const sectionSub = isAr
    ? "آخر أحداث الجلسات والطلبات"
    : "Latest session and order events";
  const ariaLabel = sectionTitle;
  const feedLimit = showFullFeed ? FULL_ACTIVITY_FEED_LIMIT : HOME_ACTIVITY_FEED_LIMIT;

  useDevQueryRuntimeLog("ops.getActivityFeed", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: feed,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = trpc.ops.getActivityFeed.useQuery(
    { restaurantId, limit: feedLimit },
    opsActivityFeedQueryOptions(queriesEnabled)
  );

  if (isEmailNotVerifiedError(error)) {
    return (
      <section className="flex flex-col gap-4" aria-label={ariaLabel}>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {sectionTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{sectionSub}</p>
        </div>
        <VerificationRequiredPanel variant="orders" compact />
      </section>
    );
  }

  const events = feed?.events ?? [];
  const canExpand = !showFullFeed && events.length >= HOME_ACTIVITY_FEED_LIMIT;

  return (
    <section className="flex flex-col gap-4" aria-label={ariaLabel}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {sectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{sectionSub}</p>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-lg border border-border/40 bg-[#161b22]/60">
          {[0, 1, 2, 3, 4].map((index) => (
            <ActivityFeedItemSkeleton key={index} isLast={index === 4} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border/40 bg-[#161b22]/90 px-4 py-8 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
          <p className="max-w-md text-sm text-muted-foreground">
            {isAr
              ? "تعذر تحميل سجل النشاط. حاول مرة أخرى."
              : "Could not load the activity feed. Please try again."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border/60"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isAr ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-border/40 bg-[#161b22]/50 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isAr ? "لا يوجد نشاط تشغيلي حديث" : "No recent operational activity"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border/40 bg-[#161b22]/60">
            {events.map((event, index) => (
              <ActivityFeedTimelineRow
                key={`${event.eventType}-${event.occurredAt}-${event.sessionId ?? "none"}-${index}`}
                event={event}
                isAr={isAr}
                isLast={index === events.length - 1}
                onOpenSession={onOpenSession}
              />
            ))}
          </div>

          {canExpand ? (
            <div className="flex justify-center border-t border-border/20 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-sm text-primary hover:text-primary"
                disabled={isFetching}
                onClick={() => setShowFullFeed(true)}
              >
                {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {isAr ? "عرض كل النشاط" : "View All Activity"}
                <ChevronDown className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          ) : null}

          {showFullFeed ? (
            <div className="flex justify-center border-t border-border/20 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-sm text-muted-foreground"
                onClick={() => setShowFullFeed(false)}
              >
                {isAr ? "عرض أقل" : "Show less"}
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
