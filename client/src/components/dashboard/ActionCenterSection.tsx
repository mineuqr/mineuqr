import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActionCenterQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock3, CreditCard, Loader2, Timer } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type ActionCenterData = RouterOutputs["ops"]["getActionCenter"];
type BillRequestItem = ActionCenterData["billRequests"][number];
type PaymentPendingItem = ActionCenterData["paymentPending"][number];
type LongRunningItem = ActionCenterData["longRunningSessions"][number];

function formatMinutes(minutes: number, isAr: boolean): string {
  if (minutes <= 0) return isAr ? "—" : "—";
  return isAr ? `${minutes} د` : `${minutes}m`;
}

function ActionCenterItemSkeleton() {
  return (
    <div className="animate-pulse flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-[#161b22]/80 px-4 py-3.5">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted/40" />
        <div className="h-3 w-16 rounded bg-muted/30" />
      </div>
      <div className="h-9 w-24 rounded-lg bg-muted/30" />
    </div>
  );
}

function ActionCenterItemRow({
  tableName,
  minutes,
  minutesLabel,
  isAr,
  sessionId,
  onOpenSession,
  accentClass,
}: {
  tableName: string;
  minutes: number;
  minutesLabel: string;
  isAr: boolean;
  sessionId: string;
  onOpenSession: (sessionId: number) => void;
  accentClass: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
        accentClass
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{tableName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {minutesLabel}:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatMinutes(minutes, isAr)}
          </span>
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full shrink-0 border-border/60 sm:w-auto"
        onClick={() => onOpenSession(Number.parseInt(sessionId, 10))}
      >
        {isAr ? "فتح الجلسة" : "Open Session"}
      </Button>
    </div>
  );
}

function ActionCenterGroup<T extends { sessionId: string; tableName: string }>({
  title,
  icon: Icon,
  items,
  isAr,
  emptyText,
  renderItem,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: T[];
  isAr: boolean;
  emptyText: string;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span className="text-sm tabular-nums text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border/30 bg-[#12161f]/40 px-4 py-3 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">{items.map((item) => renderItem(item))}</div>
      )}
    </div>
  );
}

export function ActionCenterSection({
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
  const sectionTitle = isAr ? "مركز الإجراءات" : "Action Center";
  const sectionSub = isAr
    ? "الجلسات التي تحتاج انتباه الفريق الآن"
    : "Sessions that need staff attention right now";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActionCenter", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: actionCenter,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = trpc.ops.getActionCenter.useQuery(
    { restaurantId },
    opsActionCenterQueryOptions(queriesEnabled)
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

  const isFullyEmpty =
    !isLoading &&
    !isError &&
    actionCenter != null &&
    actionCenter.billRequests.length === 0 &&
    actionCenter.paymentPending.length === 0 &&
    actionCenter.longRunningSessions.length === 0;

  return (
    <section className="flex flex-col gap-6 sm:gap-8" aria-label={ariaLabel}>
      <div className="space-y-2.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {sectionTitle}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{sectionSub}</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-6">
          {[0, 1, 2].map((group) => (
            <div key={group} className="flex flex-col gap-3">
              <div className="h-5 w-40 animate-pulse rounded bg-muted/40" />
              <ActionCenterItemSkeleton />
              <ActionCenterItemSkeleton />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-[#161b22]/90 px-6 py-10 text-center sm:px-8">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <p className="max-w-md text-base text-muted-foreground">
            {isAr
              ? "تعذر تحميل مركز الإجراءات. حاول مرة أخرى."
              : "Could not load the action center. Please try again."}
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
      ) : isFullyEmpty ? (
        <div className="rounded-2xl border border-border/40 bg-[#161b22]/50 px-6 py-12 text-center">
          <p className="text-base text-muted-foreground">
            {isAr ? "لا توجد جلسات تحتاج انتباه حالياً" : "No sessions need attention right now"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <ActionCenterGroup<BillRequestItem>
            title={isAr ? "طلبات الفاتورة" : "Bill Requests"}
            icon={CreditCard}
            items={actionCenter?.billRequests ?? []}
            isAr={isAr}
            emptyText={isAr ? "لا توجد طلبات فاتورة" : "No bill requests"}
            renderItem={(item) => (
              <ActionCenterItemRow
                key={item.sessionId}
                tableName={item.tableName}
                minutes={item.waitMinutes}
                minutesLabel={isAr ? "انتظار" : "Waiting"}
                isAr={isAr}
                sessionId={item.sessionId}
                onOpenSession={onOpenSession}
                accentClass="border-amber-500/30 bg-amber-500/5"
              />
            )}
          />

          <ActionCenterGroup<PaymentPendingItem>
            title={isAr ? "بانتظار الدفع" : "Payment Pending"}
            icon={Clock3}
            items={actionCenter?.paymentPending ?? []}
            isAr={isAr}
            emptyText={isAr ? "لا توجد جلسات بانتظار الدفع" : "No payment-pending sessions"}
            renderItem={(item) => (
              <ActionCenterItemRow
                key={item.sessionId}
                tableName={item.tableName}
                minutes={item.waitMinutes}
                minutesLabel={isAr ? "انتظار" : "Waiting"}
                isAr={isAr}
                sessionId={item.sessionId}
                onOpenSession={onOpenSession}
                accentClass="border-violet-500/30 bg-violet-500/5"
              />
            )}
          />

          <ActionCenterGroup<LongRunningItem>
            title={isAr ? "جلسات طويلة" : "Long Running Sessions"}
            icon={Timer}
            items={actionCenter?.longRunningSessions ?? []}
            isAr={isAr}
            emptyText={isAr ? "لا توجد جلسات طويلة" : "No long-running sessions"}
            renderItem={(item) => (
              <ActionCenterItemRow
                key={item.sessionId}
                tableName={item.tableName}
                minutes={item.durationMinutes}
                minutesLabel={isAr ? "المدة" : "Duration"}
                isAr={isAr}
                sessionId={item.sessionId}
                onOpenSession={onOpenSession}
                accentClass="border-orange-500/30 bg-orange-500/5"
              />
            )}
          />
        </div>
      )}
    </section>
  );
}
