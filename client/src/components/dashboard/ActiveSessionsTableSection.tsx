import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import { SessionOperationsToolbar } from "@/components/dashboard/SessionOperationsToolbar";
import { SessionRowQuickActions } from "@/components/dashboard/SessionRowQuickActions";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActiveTablesBoardQueryOptions,
  orderListQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import {
  buildOperationalSessionRows,
  buildSessionTableNumbers,
  computeSessionStatusMetrics,
  matchesSessionSearch,
  matchesStatusFilter,
  resolveSessionListEmptyMessage,
  sessionStatusDisplayLabel,
  type OperationalSessionRow,
  type SessionStatusFilter,
} from "@/lib/sessionWorkspaceOps";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash, restaurantSemantic } from "./restaurantDashStyles";

type OrderRow = RouterOutputs["order"]["list"][number];

const SESSION_STATUS_BADGE: Record<
  OperationalSessionRow["sessionStatus"],
  string
> = {
  open: restaurantSemantic.badgeOccupied,
  paid: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  complimentary: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

function formatDuration(minutes: number, isAr: boolean): string {
  if (minutes <= 0) return isAr ? "—" : "—";
  return isAr ? `${minutes} د` : `${minutes}m`;
}

function parseOrderAmount(totalAmount: string | number | null | undefined): number {
  return Number.parseFloat(String(totalAmount ?? "0")) || 0;
}

function buildSessionOrderTotals(
  orders: OrderRow[],
  activeSessionIds: number[]
): Map<number, number> {
  const allowed = new Set(activeSessionIds);
  const map = new Map<number, number>();
  for (const order of orders) {
    const sessionId = order.sessionId;
    if (sessionId == null || !allowed.has(sessionId)) continue;
    map.set(sessionId, (map.get(sessionId) ?? 0) + parseOrderAmount(order.totalAmount));
  }
  return map;
}

function ActiveSessionRowSkeleton({ isLast }: { isLast: boolean }) {
  return (
    <div
      className={cn(
        "grid animate-pulse gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] sm:items-center sm:px-5 sm:py-3.5",
        !isLast && "border-b border-cyan-500/15"
      )}
    >
      <div className="h-4 w-24 rounded bg-slate-800/70" />
      <div className="h-4 w-20 rounded bg-slate-800/60" />
      <div className="hidden h-6 w-16 rounded-full bg-slate-800/50 sm:block" />
      <div className="hidden h-4 w-12 rounded bg-slate-800/50 sm:block" />
      <div className="hidden h-4 w-14 rounded bg-slate-800/50 sm:block" />
      <div className="hidden h-4 w-16 rounded bg-slate-800/50 sm:block" />
    </div>
  );
}

function ActiveSessionTableRow({
  table,
  amount,
  currencySymbol,
  isAr,
  restaurantId,
  onOpenSession,
  isLast,
}: {
  table: OperationalSessionRow;
  amount: number | undefined;
  currencySymbol: string;
  isAr: boolean;
  restaurantId: number;
  onOpenSession: (sessionId: number) => void;
  isLast: boolean;
}) {
  const sessionId = Number.parseInt(table.sessionId!, 10);
  const amountLabel =
    amount != null && amount > 0
      ? `${amount.toFixed(2)} ${currencySymbol}`
      : isAr
        ? "—"
        : "—";

  return (
    <article
      className={cn(
        "grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] sm:items-center sm:gap-4 sm:px-5 sm:py-3.5",
        !isLast && "border-b border-cyan-500/15"
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">
          {isAr ? "الجلسة" : "Session"}
        </p>
        <p className="truncate text-sm font-semibold text-white">
          {isAr ? `جلسة #${sessionId}` : `Session #${sessionId}`}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">
          {isAr ? "الطاولة" : "Table"}
        </p>
        <p className="truncate text-sm text-slate-200">{table.tableName}</p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">
          {isAr ? "الحالة" : "Status"}
        </p>
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
            SESSION_STATUS_BADGE[table.sessionStatus]
          )}
        >
          {sessionStatusDisplayLabel(table.sessionStatus, isAr)}
        </span>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">
          {isAr ? "المدة" : "Started"}
        </p>
        <p dir="ltr" className="text-sm tabular-nums text-slate-200">
          {formatDuration(table.durationMinutes, isAr)}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">
          {isAr ? "الطلبات" : "Orders"}
        </p>
        <p dir="ltr" className="text-sm tabular-nums text-slate-200">
          {table.totalOrders}
          {table.pendingOrders > 0 ? (
            <span className="text-xs text-orange-300">
              {isAr ? ` (${table.pendingOrders} معلّق)` : ` (${table.pendingOrders} pending)`}
            </span>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div className="sm:text-end">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">
            {isAr ? "المبلغ" : "Amount"}
          </p>
          <p dir="ltr" className="text-sm tabular-nums font-medium text-slate-100">
            {amountLabel}
          </p>
        </div>
        <SessionRowQuickActions
          restaurantId={restaurantId}
          sessionId={sessionId}
          sessionStatus={table.sessionStatus}
          isAr={isAr}
          onOpenSession={onOpenSession}
        />
      </div>
    </article>
  );
}

export function ActiveSessionsTableSection({
  restaurantId,
  language,
  queriesEnabled,
  currencySymbol,
  onOpenSession,
}: {
  restaurantId: number;
  language: string;
  queriesEnabled: boolean;
  currencySymbol?: string;
  onOpenSession: (sessionId: number) => void;
}) {
  const { isAuthenticated, authPending } = useAuth();
  const isAr = language === "ar";
  const sym = currencySymbol || "ر.س";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>("all");
  const sectionTitle = isAr ? "الجلسات النشطة" : "Active Sessions";
  const sectionSub = isAr
    ? "ابحث عن الجلسات وصفّها وافتحها بسرعة"
    : "Search, filter, and open sessions quickly";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActiveTablesBoard (sessions)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("order.list (sessions workspace)", {
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

  const statusMetrics = useMemo(
    () => computeSessionStatusMetrics(operationalSessions),
    [operationalSessions]
  );

  const visibleSessions = useMemo(() => {
    return operationalSessions.filter(
      (row) =>
        matchesStatusFilter(row, statusFilter) && matchesSessionSearch(row, searchQuery)
    );
  }, [operationalSessions, searchQuery, statusFilter]);

  const sessionOrderTotals = useMemo(() => {
    const sessionIds = operationalSessions
      .map((table) => Number.parseInt(table.sessionId!, 10))
      .filter((id) => Number.isFinite(id));
    return buildSessionOrderTotals(orders ?? [], sessionIds);
  }, [operationalSessions, orders]);

  const emptyMessage = resolveSessionListEmptyMessage(isAr, {
    hasAnySessions: operationalSessions.length > 0,
    searchQuery,
    statusFilter,
    filteredCount: visibleSessions.length,
  });

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
        <div className={restaurantDash.listPanel}>
          {[0, 1, 2, 3].map((index) => (
            <ActiveSessionRowSkeleton key={index} isLast={index === 3} />
          ))}
        </div>
      ) : loadFailed ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل الجلسات النشطة. حاول مرة أخرى."
              : "Could not load active sessions. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => {
            void refetchBoard();
            void refetchOrders();
          }}
        />
      ) : (
        <>
          <SessionOperationsToolbar
            isAr={isAr}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            metrics={statusMetrics}
          />

          {ordersError ? (
            <p className="mt-3 rounded-lg border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
              {isAr
                ? "تعذر تحميل مبالغ الطلبات. تم عرض الجلسات بدون المبالغ."
                : "Order amounts unavailable. Showing sessions without amounts."}
            </p>
          ) : null}

          {emptyMessage ? (
            <div className="mt-3">
              <RestaurantSectionEmpty message={emptyMessage} />
            </div>
          ) : (
            <div className={cn("mt-3", restaurantDash.listPanel)}>
              <div className="hidden border-b border-cyan-500/15 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] sm:gap-4">
                <span>{isAr ? "الجلسة" : "Session"}</span>
                <span>{isAr ? "الطاولة" : "Table"}</span>
                <span>{isAr ? "الحالة" : "Status"}</span>
                <span>{isAr ? "المدة" : "Started"}</span>
                <span>{isAr ? "الطلبات" : "Orders"}</span>
                <span className="text-end">{isAr ? "المبلغ / إجراء" : "Amount / Actions"}</span>
              </div>
              {visibleSessions.map((table, index) => {
                const sessionId = Number.parseInt(table.sessionId!, 10);
                return (
                  <ActiveSessionTableRow
                    key={`${table.tableId}-${sessionId}`}
                    table={table}
                    amount={
                      ordersError ? undefined : sessionOrderTotals.get(sessionId)
                    }
                    currencySymbol={sym}
                    isAr={isAr}
                    restaurantId={restaurantId}
                    onOpenSession={onOpenSession}
                    isLast={index === visibleSessions.length - 1}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </RestaurantDashSection>
  );
}
