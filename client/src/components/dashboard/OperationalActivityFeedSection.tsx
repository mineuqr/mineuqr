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
  Clock3,
  CreditCard,
  DoorOpen,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";
import type { ComponentType } from "react";

type ActivityFeedEvent = RouterOutputs["ops"]["getActivityFeed"]["events"][number];
type ActivityFeedEventType = ActivityFeedEvent["eventType"];

const EVENT_VISUALS: Record<
  ActivityFeedEventType,
  { icon: ComponentType<{ className?: string }>; card: string; iconClass: string }
> = {
  session_opened: {
    icon: DoorOpen,
    card: "border-emerald-500/30 bg-emerald-500/5",
    iconClass: "text-emerald-400",
  },
  order_created: {
    icon: Receipt,
    card: "border-primary/30 bg-primary/5",
    iconClass: "text-primary",
  },
  order_status_changed: {
    icon: RefreshCw,
    card: "border-sky-500/30 bg-sky-500/5",
    iconClass: "text-sky-400",
  },
  bill_requested: {
    icon: CreditCard,
    card: "border-amber-500/30 bg-amber-500/5",
    iconClass: "text-amber-400",
  },
  payment_pending: {
    icon: Clock3,
    card: "border-violet-500/30 bg-violet-500/5",
    iconClass: "text-violet-400",
  },
  session_closed: {
    icon: CheckCircle,
    card: "border-border/50 bg-[#12161f]/60",
    iconClass: "text-muted-foreground",
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
    bill_requested: { en: "Bill requested", ar: "طلب فاتورة" },
    payment_pending: { en: "Payment pending", ar: "بانتظار الدفع" },
    session_closed: { en: "Session closed", ar: "أُغلقت الجلسة" },
  };
  return isAr ? titles[eventType].ar : titles[eventType].en;
}

function ActivityFeedItemSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border/40 bg-[#161b22]/80 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted/40" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="h-4 w-40 rounded bg-muted/40" />
          <div className="h-3 w-28 rounded bg-muted/30" />
          <div className="h-3 w-20 rounded bg-muted/30" />
        </div>
      </div>
      <div className="mt-4 h-9 w-full rounded-lg bg-muted/30 sm:ml-[3.25rem] sm:w-32" />
    </div>
  );
}

function ActivityFeedItemRow({
  event,
  isAr,
  onOpenSession,
}: {
  event: ActivityFeedEvent;
  isAr: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  const visuals = EVENT_VISUALS[event.eventType];
  const Icon = visuals.icon;
  const title = localizedEventTitle(event.eventType, isAr);

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border px-4 py-4 sm:px-5 sm:py-5",
        visuals.card
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-[#0b0e14]/40",
            visuals.iconClass
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {event.subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{event.subtitle}</p>
          ) : null}
          {event.tableName ? (
            <p className="mt-1 text-sm font-medium text-foreground">{event.tableName}</p>
          ) : null}
          <p className="mt-2 text-sm tabular-nums text-muted-foreground">
            {formatRelativeEventTime(event.occurredAt, isAr)}
          </p>
        </div>
      </div>

      {event.sessionId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-border/60 sm:ml-[3.25rem] sm:w-auto sm:self-start"
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
  const isAr = language === "ar";
  const sectionTitle = isAr ? "سجل النشاط التشغيلي" : "Operational Activity Feed";
  const sectionSub = isAr
    ? "آخر أحداث الجلسات والطلبات في مطعمك"
    : "Recent session and order events across your restaurant";
  const ariaLabel = sectionTitle;

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
    { restaurantId },
    opsActivityFeedQueryOptions(queriesEnabled)
  );

  if (isEmailNotVerifiedError(error)) {
    return (
      <section className="flex flex-col gap-6 sm:gap-8" aria-label={ariaLabel}>
        <div className="space-y-2.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {sectionTitle}
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{sectionSub}</p>
        </div>
        <VerificationRequiredPanel variant="orders" compact />
      </section>
    );
  }

  const events = feed?.events ?? [];

  return (
    <section className="flex flex-col gap-6 sm:gap-8" aria-label={ariaLabel}>
      <div className="space-y-2.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {sectionTitle}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{sectionSub}</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <ActivityFeedItemSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-[#161b22]/90 px-6 py-10 text-center sm:px-8">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <p className="max-w-md text-base text-muted-foreground">
            {isAr
              ? "تعذر تحميل سجل النشاط. حاول مرة أخرى."
              : "Could not load the activity feed. Please try again."}
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-border/60"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isAr ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-[#161b22]/50 px-6 py-12 text-center">
          <p className="text-base text-muted-foreground">
            {isAr ? "لا يوجد نشاط تشغيلي حديث" : "No recent operational activity"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event, index) => (
            <ActivityFeedItemRow
              key={`${event.eventType}-${event.occurredAt}-${event.sessionId ?? "none"}-${index}`}
              event={event}
              isAr={isAr}
              onOpenSession={onOpenSession}
            />
          ))}
        </div>
      )}
    </section>
  );
}
