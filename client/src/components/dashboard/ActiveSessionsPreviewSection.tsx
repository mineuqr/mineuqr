import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  OperationalBoardCard,
  OperationalBoardCardSkeleton,
} from "@/components/dashboard/OperationalBoardCard";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActiveTablesBoardQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { buildOperationalTableRows } from "@/lib/sessionWorkspaceOps";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash } from "./restaurantDashStyles";

/**
 * Home operational board preview — capped table grid with session-aware state.
 */
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
  const sectionTitle = isAr ? "لوحة التشغيل" : "Operational Board";
  const sectionSub = isAr
    ? "نظرة سريعة على الطاولات والجلسات النشطة"
    : "Quick view of tables and live sessions";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActiveTablesBoard (home board)", {
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

  const operationalTables = useMemo(
    () => buildOperationalTableRows(board?.tables ?? [], new Map()),
    [board?.tables]
  );

  const visibleTables = operationalTables.slice(0, previewLimit);
  const hasMoreTables = operationalTables.length > previewLimit;
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
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : operationalTables.length === 0 ? (
        <RestaurantSectionEmpty
          message={
            isAr ? "لا توجد طاولات نشطة لعرضها" : "No active tables to display"
          }
        />
      ) : (
        <>
          <div className={restaurantDash.kpiGridWide}>
            {visibleTables.map((table) => (
              <OperationalBoardCard
                key={table.tableId}
                table={table}
                isAr={isAr}
                onOpenSession={onOpenSession}
                variant="home"
              />
            ))}
          </div>

          {hasMoreTables && onViewAllSessions ? (
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
