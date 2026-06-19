import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActiveTablesBoardQueryOptions,
  orderListQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash, restaurantSemantic } from "./restaurantDashStyles";

type ActiveTableRow = RouterOutputs["ops"]["getActiveTablesBoard"]["tables"][number];
type OrderRow = RouterOutputs["order"]["list"][number];

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
  onOpenSession,
  isLast,
}: {
  table: ActiveTableRow;
  amount: number | undefined;
  currencySymbol: string;
  isAr: boolean;
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
            restaurantSemantic.badgeOccupied
          )}
        >
          {isAr ? "مفتوحة" : "Open"}
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

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="sm:text-end">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">
            {isAr ? "المبلغ" : "Amount"}
          </p>
          <p dir="ltr" className="text-sm tabular-nums font-medium text-slate-100">
            {amountLabel}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("shrink-0", restaurantDash.toolbarBtn)}
          onClick={() => onOpenSession(sessionId)}
        >
          {isAr ? "فتح الجلسة" : "Open Session"}
        </Button>
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
  const sectionTitle = isAr ? "الجلسات النشطة" : "Active Sessions";
  const sectionSub = isAr
    ? "الجلسات المفتوحة التي تحتاج متابعة الآن"
    : "Open sessions that need attention right now";
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

  const activeSessions = useMemo(() => {
    return (board?.tables ?? []).filter(
      (table) => table.status === "occupied" && table.sessionId
    );
  }, [board?.tables]);

  const sessionOrderTotals = useMemo(() => {
    const sessionIds = activeSessions
      .map((table) => Number.parseInt(table.sessionId!, 10))
      .filter((id) => Number.isFinite(id));
    return buildSessionOrderTotals(orders ?? [], sessionIds);
  }, [activeSessions, orders]);

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
      ) : activeSessions.length === 0 ? (
        <RestaurantSectionEmpty
          message={isAr ? "لا توجد جلسات نشطة" : "No active sessions"}
        />
      ) : (
        <>
          {ordersError ? (
            <p className="mb-3 rounded-lg border border-orange-500/25 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
              {isAr
                ? "تعذر تحميل مبالغ الطلبات. تم عرض الجلسات بدون المبالغ."
                : "Order amounts unavailable. Showing sessions without amounts."}
            </p>
          ) : null}
          <div className={restaurantDash.listPanel}>
            <div className="hidden border-b border-cyan-500/15 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto_auto] sm:gap-4">
              <span>{isAr ? "الجلسة" : "Session"}</span>
              <span>{isAr ? "الطاولة" : "Table"}</span>
              <span>{isAr ? "الحالة" : "Status"}</span>
              <span>{isAr ? "المدة" : "Started"}</span>
              <span>{isAr ? "الطلبات" : "Orders"}</span>
              <span className="text-end">{isAr ? "المبلغ / إجراء" : "Amount / Actions"}</span>
            </div>
            {activeSessions.map((table, index) => {
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
                  onOpenSession={onOpenSession}
                  isLast={index === activeSessions.length - 1}
                />
              );
            })}
          </div>
        </>
      )}
    </RestaurantDashSection>
  );
}
