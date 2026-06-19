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
import { Timer } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash, restaurantSemantic } from "./restaurantDashStyles";

type ActionCenterData = RouterOutputs["ops"]["getActionCenter"];
type LongRunningItem = ActionCenterData["longRunningSessions"][number];

function formatMinutes(minutes: number, isAr: boolean): string {
  if (minutes <= 0) return isAr ? "—" : "—";
  return isAr ? `${minutes} د` : `${minutes}m`;
}

function ActionCenterItemSkeleton() {
  return (
    <div
      className={cn(
        "animate-pulse flex items-center justify-between gap-3 rounded-lg border px-3 py-3 sm:px-4",
        restaurantDash.itemRow
      )}
    >
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
        "flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4",
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
        className="w-full shrink-0 sm:w-auto"
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
        <p
          className={cn(
            "rounded-lg border px-3 py-3 text-sm text-slate-400 sm:px-4",
            restaurantDash.panelInset
          )}
        >
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
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const isFullyEmpty =
    !isLoading &&
    !isError &&
    actionCenter != null &&
    actionCenter.longRunningSessions.length === 0;

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <ActionCenterItemSkeleton />
          <ActionCenterItemSkeleton />
        </div>
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل مركز الإجراءات. حاول مرة أخرى."
              : "Could not load the action center. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : isFullyEmpty ? (
        <RestaurantSectionEmpty
          message={
            isAr ? "لا توجد جلسات تحتاج انتباه حالياً" : "No sessions need attention right now"
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
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
                accentClass={restaurantSemantic.rowWarning}
              />
            )}
          />
        </div>
      )}
    </RestaurantDashSection>
  );
}
