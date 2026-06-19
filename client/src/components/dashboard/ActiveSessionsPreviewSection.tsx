import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActiveTablesBoardQueryOptions,
  orderListQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import {
  buildOperationalSessionRows,
  buildSessionOrderTotals,
  buildSessionTableNumbers,
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

function SessionPreviewCardSkeleton() {
  return (
    <div className={cn("animate-pulse rounded-xl border p-4 sm:p-5", restaurantDash.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-28 rounded bg-slate-800/70" />
        <div className="h-6 w-16 rounded-full bg-slate-800/50" />
      </div>
      <div className="mt-4 h-4 w-24 rounded bg-slate-800/50" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-12 rounded bg-slate-800/40" />
            <div className="h-6 w-16 rounded bg-slate-800/60" />
          </div>
        ))}
      </div>
      <div className="mt-5 h-9 w-full rounded-lg bg-slate-800/50" />
    </div>
  );
}

function ActiveSessionPreviewCard({
  session,
  amount,
  currencySymbol,
  isAr,
  onOpenSession,
}: {
  session: OperationalSessionRow;
  amount: number | undefined;
  currencySymbol: string;
  isAr: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  const sessionId = Number.parseInt(session.sessionId!, 10);
  const amountLabel =
    amount != null && amount > 0
      ? `${amount.toFixed(2)} ${currencySymbol}`
      : isAr
        ? "—"
        : "—";

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border p-4 sm:p-5",
        restaurantHoverGlow,
        restaurantSemantic.rowSuccess
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-white">
          {isAr ? `جلسة #${sessionId}` : `Session #${sessionId}`}
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            restaurantSemantic.badgeOccupied
          )}
        >
          {sessionStatusDisplayLabel(session.sessionStatus, isAr)}
        </span>
      </div>

      <p className="mt-2 truncate text-sm text-slate-300">
        {isAr ? "الطاولة: " : "Table: "}
        <span className="font-medium text-slate-100">{session.tableName}</span>
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-400">{isAr ? "الطلبات" : "Orders"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {session.totalOrders}
            {session.pendingOrders > 0 ? (
              <span className="text-xs font-normal text-orange-300">
                {isAr ? ` (${session.pendingOrders} معلّق)` : ` (${session.pendingOrders} pending)`}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">{isAr ? "المبلغ" : "Amount"}</dt>
          <dd dir="ltr" className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {amountLabel}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("mt-5 w-full", restaurantDash.toolbarBtn)}
        onClick={() => onOpenSession(sessionId)}
      >
        {isAr ? "فتح الجلسة" : "Open Session"}
      </Button>
    </article>
  );
}

export function ActiveSessionsPreviewSection({
  restaurantId,
  language,
  queriesEnabled,
  currencySymbol,
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
  const sym = currencySymbol || "ر.س";
  const sectionTitle = isAr ? "الجلسات النشطة" : "Active Sessions";
  const sectionSub = isAr
    ? "نظرة سريعة على الجلسات التشغيلية"
    : "Compact preview of live dining sessions";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActiveTablesBoard (home preview)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("order.list (home preview)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const {
    data: board,
    isLoading: boardLoading,
    isError: boardError,
    error: boardQueryError,
    refetch: refetchBoard,
    isFetching: boardFetching,
  } = trpc.ops.getActiveTablesBoard.useQuery(
    { restaurantId },
    opsActiveTablesBoardQueryOptions(queriesEnabled)
  );

  const {
    data: orders,
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersQueryError,
    refetch: refetchOrders,
    isFetching: ordersFetching,
  } = trpc.order.list.useQuery({ restaurantId }, orderListQueryOptions(queriesEnabled));

  const operationalSessions = useMemo(() => {
    const tableNumbersBySession = buildSessionTableNumbers(orders ?? []);
    return buildOperationalSessionRows(board?.tables ?? [], tableNumbersBySession);
  }, [board?.tables, orders]);

  const visibleSessions = useMemo(
    () => operationalSessions.slice(0, previewLimit),
    [operationalSessions, previewLimit]
  );

  const sessionOrderTotals = useMemo(() => {
    const sessionIds = operationalSessions
      .map((session) => Number.parseInt(session.sessionId!, 10))
      .filter((id) => Number.isFinite(id));
    return buildSessionOrderTotals(orders ?? [], sessionIds);
  }, [operationalSessions, orders]);

  const hasMoreSessions = operationalSessions.length > previewLimit;
  const verificationError = isEmailNotVerifiedError(boardQueryError)
    ? boardQueryError
    : isEmailNotVerifiedError(ordersQueryError)
      ? ordersQueryError
      : null;

  if (verificationError) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const isLoading = boardLoading || ordersLoading;
  const isFetching = boardFetching || ordersFetching;
  const loadFailed = boardError && !board;

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {isLoading ? (
        <div className={restaurantDash.kpiGridWide}>
          {Array.from({ length: Math.min(previewLimit, 3) }, (_, index) => (
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
          onRetry={() => {
            void refetchBoard();
            void refetchOrders();
          }}
        />
      ) : operationalSessions.length === 0 ? (
        <RestaurantSectionEmpty message={homeActiveSessionsEmptyMessage(isAr)} />
      ) : (
        <>
          {ordersError ? (
            <p className="mb-3 rounded-lg border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
              {isAr
                ? "تعذر تحميل مبالغ الطلبات. تم عرض الجلسات بدون المبالغ."
                : "Order amounts unavailable. Showing sessions without amounts."}
            </p>
          ) : null}
          <div className={restaurantDash.kpiGridWide}>
            {visibleSessions.map((session) => {
              const sessionId = Number.parseInt(session.sessionId!, 10);
              return (
                <ActiveSessionPreviewCard
                  key={`${session.tableId}-${sessionId}`}
                  session={session}
                  amount={ordersError ? undefined : sessionOrderTotals.get(sessionId)}
                  currencySymbol={sym}
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
                {isAr ? "عرض جميع الجلسات" : "View All Sessions"}
                <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </RestaurantDashSection>
  );
}
