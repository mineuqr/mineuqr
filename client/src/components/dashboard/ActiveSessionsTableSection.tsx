import { useAuth } from "@/_core/hooks/useAuth";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  OperationalBoardCard,
  OperationalBoardCardSkeleton,
} from "@/components/dashboard/OperationalBoardCard";
import { SessionOperationsToolbar } from "@/components/dashboard/SessionOperationsToolbar";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActiveTablesBoardQueryOptions,
  orderListQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import {
  buildOperationalTableRows,
  buildSessionTableNumbers,
  computeTableStatusMetrics,
  matchesTableSearch,
  matchesTableStatusFilter,
  resolveBoardFilterEmptyMessage,
  type SessionStatusFilter,
} from "@/lib/sessionWorkspaceOps";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";

export function ActiveSessionsTableSection({
  restaurantId,
  language,
  queriesEnabled,
  currencySymbol: _currencySymbol,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>("all");
  const sectionTitle = isAr ? "لوحة التشغيل" : "Operational Board";
  const sectionSub = isAr
    ? "جميع الطاولات مع حالة الجلسة التشغيلية"
    : "All tables with live session state";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActiveTablesBoard (sessions board)", {
    enabled: queriesEnabled,
    authPending,
    isAuthenticated,
    pollMs: queriesEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });
  useDevQueryRuntimeLog("order.list (sessions board search)", {
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

  const { data: orders } = trpc.order.list.useQuery(
    { restaurantId },
    orderListQueryOptions(queriesEnabled)
  );

  const operationalTables = useMemo(() => {
    const tableNumbersBySession = buildSessionTableNumbers(orders ?? []);
    return buildOperationalTableRows(board?.tables ?? [], tableNumbersBySession);
  }, [board?.tables, orders]);

  const statusMetrics = useMemo(
    () => computeTableStatusMetrics(operationalTables),
    [operationalTables]
  );

  const visibleTables = useMemo(() => {
    return operationalTables.filter(
      (row) =>
        matchesTableStatusFilter(row, statusFilter) && matchesTableSearch(row, searchQuery)
    );
  }, [operationalTables, searchQuery, statusFilter]);

  const filterEmptyMessage = resolveBoardFilterEmptyMessage(isAr, {
    hasAnyTables: operationalTables.length > 0,
    searchQuery,
    statusFilter,
    filteredCount: visibleTables.length,
  });

  const verificationError = isEmailNotVerifiedError(boardQueryError)
    ? boardQueryError
    : null;

  if (verificationError) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  const loadFailed = boardError && !board;

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {boardLoading ? (
        <div className={restaurantDash.kpiGridWide}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <OperationalBoardCardSkeleton key={index} />
          ))}
        </div>
      ) : loadFailed ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل لوحة التشغيل. حاول مرة أخرى."
              : "Could not load the operational board. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={boardFetching}
          onRetry={() => void refetchBoard()}
        />
      ) : operationalTables.length === 0 ? (
        <RestaurantSectionEmpty
          message={
            isAr ? "لا توجد طاولات نشطة لعرضها" : "No active tables to display"
          }
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

          {filterEmptyMessage ? (
            <div className="mt-3">
              <RestaurantSectionEmpty message={filterEmptyMessage} />
            </div>
          ) : (
            <div className={cn("mt-3", restaurantDash.kpiGridWide)}>
              {visibleTables.map((table) => (
                <OperationalBoardCard
                  key={table.tableId}
                  table={table}
                  isAr={isAr}
                  onOpenSession={onOpenSession}
                  variant="workspace"
                  restaurantId={restaurantId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </RestaurantDashSection>
  );
}
