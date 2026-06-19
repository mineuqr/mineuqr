import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActiveTablesBoardQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import {
  buildOperationalSessionRows,
  homeActiveSessionsEmptyMessage,
  sessionStatusDisplayLabel,
  type OperationalSessionRow,
} from "@/lib/sessionWorkspaceOps";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash, restaurantHoverGlow, restaurantSemantic } from "./restaurantDashStyles";

function formatDuration(minutes: number, isAr: boolean): string {
  if (minutes <= 0) return isAr ? "—" : "—";
  return isAr ? `${minutes} د` : `${minutes}m`;
}

function SessionPreviewCardSkeleton() {
  return (
    <div className={cn("animate-pulse rounded-xl border p-4 sm:p-5", restaurantDash.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-28 rounded bg-slate-800/70" />
        <div className="h-6 w-16 rounded-full bg-slate-800/50" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-12 rounded bg-slate-800/40" />
            <div className="h-6 w-8 rounded bg-slate-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveSessionPreviewCard({
  session,
  isAr,
  onOpenSession,
}: {
  session: OperationalSessionRow;
  isAr: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  const sessionId = Number.parseInt(session.sessionId!, 10);

  const openSession = () => onOpenSession(sessionId);

  return (
    <article
      role="button"
      tabIndex={0}
      className={cn(
        "flex cursor-pointer flex-col rounded-xl border p-4 sm:p-5",
        restaurantHoverGlow,
        restaurantSemantic.rowSuccess
      )}
      onClick={openSession}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSession();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-white">{session.tableName}</h3>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            restaurantSemantic.badgeOccupied
          )}
        >
          {sessionStatusDisplayLabel(session.sessionStatus, isAr)}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-slate-400">{isAr ? "المدة" : "Duration"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {formatDuration(session.durationMinutes, isAr)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">{isAr ? "الطلبات" : "Orders"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {session.totalOrders}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">{isAr ? "قيد التنفيذ" : "Pending"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {session.pendingOrders}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function ActiveSessionsPreviewSection({
  restaurantId,
  language,
  queriesEnabled,
  onOpenSession,
  onViewAllSessions,
  previewLimit = 6,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
  onOpenSession: (sessionId: number) => void;
  onViewAllSessions?: () => void;
  previewLimit?: number;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const isAr = language === "ar";
  const sectionTitle = isAr ? "الجلسات النشطة" : "Active Sessions";
  const sectionSub = isAr
    ? "نظرة سريعة على الجلسات النشطة"
    : "Quick view of live dining sessions";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActiveTablesBoard (home preview)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: board,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = trpc.ops.getActiveTablesBoard.useQuery(
    { restaurantId },
    opsActiveTablesBoardQueryOptions(queriesEnabled)
  );

  const operationalSessions = useMemo(
    () => buildOperationalSessionRows(board?.tables ?? [], new Map()),
    [board?.tables]
  );

  const visibleSessions = useMemo(
    () => operationalSessions.slice(0, previewLimit),
    [operationalSessions, previewLimit]
  );

  const hasMoreSessions = operationalSessions.length > previewLimit;
  const verificationError = isEmailNotVerifiedError(error) ? error : null;

  if (verificationError) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const loadFailed = isError && !board;

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {isLoading ? (
        <div className={restaurantDash.kpiGridWide}>
          {Array.from({ length: Math.min(previewLimit, 6) }, (_, index) => (
            <SessionPreviewCardSkeleton key={index} />
          ))}
        </div>
      ) : loadFailed ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل معاينة الجلسات. حاول مرة أخرى."
              : "Could not load the sessions preview. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : operationalSessions.length === 0 ? (
        <RestaurantSectionEmpty message={homeActiveSessionsEmptyMessage(isAr)} />
      ) : (
        <>
          <div className={restaurantDash.kpiGridWide}>
            {visibleSessions.map((session) => {
              const sessionId = Number.parseInt(session.sessionId!, 10);
              return (
                <ActiveSessionPreviewCard
                  key={`${session.tableId}-${sessionId}`}
                  session={session}
                  isAr={isAr}
                  onOpenSession={onOpenSession}
                />
              );
            })}
          </div>

          {hasMoreSessions && onViewAllSessions ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={restaurantDash.linkBtn}
                onClick={onViewAllSessions}
              >
                {isAr ? "عرض المزيد" : "View More"}
                <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </RestaurantDashSection>
  );
}
