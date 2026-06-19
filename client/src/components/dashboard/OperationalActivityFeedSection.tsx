import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  CheckCircle,
  Clock3,
  CreditCard,
  DoorOpen,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash, restaurantActivityIconClass } from "./restaurantDashStyles";

/** Home dashboard compact preview — full feed uses API default (25). */
const HOME_ACTIVITY_FEED_LIMIT = 5;
const FULL_ACTIVITY_FEED_LIMIT = 25;

type ActivityFeedEvent = RouterOutputs["ops"]["getActivityFeed"]["events"][number];
type ActivityFeedEventType = ActivityFeedEvent["eventType"];

const EVENT_VISUALS: Record<
  ActivityFeedEventType,
  { icon: ComponentType<{ className?: string }>; variant: "success" | "info" | "neutral" | "accent" | "muted" }
> = {
  session_opened: {
    icon: DoorOpen,
    variant: "success",
  },
  order_created: {
    icon: Receipt,
    variant: "info",
  },
  order_status_changed: {
    icon: RefreshCw,
    variant: "neutral",
  },
  session_paid: {
    icon: CreditCard,
    variant: "success",
  },
  session_complimentary: {
    icon: Clock3,
    variant: "accent",
  },
  session_closed: {
    icon: CheckCircle,
    variant: "muted",
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
    <div className={cn("flex gap-2.5 px-3 py-2.5", !isLast && "border-b border-slate-700/40")}>
      <div className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-slate-800/80" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-36 animate-pulse rounded bg-slate-800/80" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-800/60" />
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
        !isLast && "border-b border-slate-700/40"
      )}
    >
      <div className="flex min-w-0 flex-1 gap-2.5">
        <div className={restaurantActivityIconClass(visuals.variant)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <span dir="ltr" className="text-xs tabular-nums text-slate-500">
              {timeLabel}
            </span>
          </div>
          {event.subtitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-400">{event.subtitle}</p>
          ) : null}
          {event.tableName ? (
            <p className="mt-0.5 truncate text-xs font-medium text-slate-300">{event.tableName}</p>
          ) : null}
        </div>
      </div>

      {event.sessionId ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={restaurantDash.actionGhostSuccess}
          onClick={() => onOpenSession(Number.parseInt(event.sessionId!, 10))}
        >
          {isAr ? "فتح الجلسة" : "Open Session"}
        </Button>
      ) : null}
    </article>
  );
}

function ActivityFeedTimeline({
  events,
  isAr,
  onOpenSession,
}: {
  events: ActivityFeedEvent[];
  isAr: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  return (
    <div className={restaurantDash.listPanel}>
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
  );
}

export function OperationalActivityFeedSection({
  restaurantId,
  language,
  queriesEnabled,
  onOpenSession,
  sectionTitle: sectionTitleOverride,
  sectionDescription: sectionDescriptionOverride,
  feedLimit,
  enableExpandSheet = true,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  onOpenSession: (sessionId: number) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  feedLimit?: number;
  /** Home uses compact preview + sheet; Sessions workspace shows full inline feed. */
  enableExpandSheet?: boolean;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isAr = language === "ar";
  const previewLimit = enableExpandSheet
    ? (feedLimit ?? HOME_ACTIVITY_FEED_LIMIT)
    : (feedLimit ?? FULL_ACTIVITY_FEED_LIMIT);
  const sectionTitle =
    sectionTitleOverride ?? (isAr ? "النشاط الأخير" : "Recent Activity");
  const sectionSub =
    sectionDescriptionOverride ??
    (isAr ? "آخر أحداث الجلسات والطلبات" : "Latest session and order events");
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActivityFeed", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: previewFeed,
    isLoading: previewLoading,
    isError: previewError,
    error: previewQueryError,
    refetch: refetchPreview,
    isFetching: previewFetching,
  } = trpc.ops.getActivityFeed.useQuery(
    { restaurantId, limit: previewLimit },
    opsActivityFeedQueryOptions(queriesEnabled)
  );

  const {
    data: fullFeed,
    isLoading: fullLoading,
    isError: fullError,
    refetch: refetchFull,
    isFetching: fullFetching,
  } = trpc.ops.getActivityFeed.useQuery(
    { restaurantId, limit: FULL_ACTIVITY_FEED_LIMIT },
    {
      ...opsActivityFeedQueryOptions(queriesEnabled && enableExpandSheet && sheetOpen),
      enabled: queriesEnabled && enableExpandSheet && sheetOpen,
    }
  );

  if (isEmailNotVerifiedError(previewQueryError)) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const previewEvents = previewFeed?.events ?? [];
  const fullEvents = fullFeed?.events ?? [];
  const canViewAll =
    enableExpandSheet && previewEvents.length >= HOME_ACTIVITY_FEED_LIMIT;

  return (
    <>
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        {previewLoading ? (
          <div className={restaurantDash.listPanel}>
            {[0, 1, 2, 3, 4].map((index) => (
              <ActivityFeedItemSkeleton key={index} isLast={index === 4} />
            ))}
          </div>
        ) : previewError ? (
          <RestaurantSectionError
            message={
              isAr
                ? "تعذر تحميل سجل النشاط. حاول مرة أخرى."
                : "Could not load the activity feed. Please try again."
            }
            retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
            isFetching={previewFetching}
            onRetry={() => void refetchPreview()}
          />
        ) : previewEvents.length === 0 ? (
          <RestaurantSectionEmpty
            message={isAr ? "لا يوجد نشاط تشغيلي حديث" : "No recent operational activity"}
          />
        ) : (
          <>
            <ActivityFeedTimeline
              events={previewEvents}
              isAr={isAr}
              onOpenSession={onOpenSession}
            />

            {canViewAll ? (
              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={restaurantDash.linkBtn}
                  onClick={() => setSheetOpen(true)}
                >
                  {isAr ? "عرض كل النشاط" : "View All Activity"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </RestaurantDashSection>

      {enableExpandSheet ? (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side={isAr ? "left" : "right"}
          className="flex w-full flex-col border-slate-700/50 bg-slate-950 sm:max-w-md"
        >
          <SheetHeader className="border-b border-slate-700/40 pb-4 text-start">
            <SheetTitle className="text-white">
              {isAr ? "سجل النشاط" : "Activity Log"}
            </SheetTitle>
            <SheetDescription>
              {isAr
                ? "آخر أحداث الجلسات والطلبات في المطعم"
                : "Recent session and order events for your restaurant"}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto py-4">
            {fullLoading ? (
              <div className={restaurantDash.listPanel}>
                {Array.from({ length: 8 }, (_, index) => (
                  <ActivityFeedItemSkeleton key={index} isLast={index === 7} />
                ))}
              </div>
            ) : fullError ? (
              <RestaurantSectionError
                message={
                  isAr
                    ? "تعذر تحميل سجل النشاط. حاول مرة أخرى."
                    : "Could not load the activity feed. Please try again."
                }
                retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
                isFetching={fullFetching}
                onRetry={() => void refetchFull()}
              />
            ) : fullEvents.length === 0 ? (
              <RestaurantSectionEmpty
                message={isAr ? "لا يوجد نشاط تشغيلي حديث" : "No recent operational activity"}
              />
            ) : (
              <ActivityFeedTimeline
                events={fullEvents}
                isAr={isAr}
                onOpenSession={(sessionId) => {
                  setSheetOpen(false);
                  onOpenSession(sessionId);
                }}
              />
            )}
          </div>

          {fullFetching && !fullLoading ? (
            <div className="flex items-center justify-center gap-2 border-t border-slate-700/40 py-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isAr ? "جاري التحديث…" : "Refreshing…"}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
      ) : null}
    </>
  );
}
