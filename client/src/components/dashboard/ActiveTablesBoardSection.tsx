import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { VerificationRequiredPanel } from "@/components/auth/VerificationRequiredPanel";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  opsActiveTablesBoardQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/lib/trpc";
import { RestaurantDashSection } from "./RestaurantDashSection";
import {
  RestaurantSectionEmpty,
  RestaurantSectionError,
} from "./RestaurantSectionStates";
import { restaurantDash, restaurantSemantic } from "./restaurantDashStyles";

type ActiveTableRow = RouterOutputs["ops"]["getActiveTablesBoard"]["tables"][number];
type BoardStatus = ActiveTableRow["status"];

const STATUS_STYLES: Record<
  BoardStatus,
  { card: string; badge: string }
> = {
  available: {
    card: restaurantSemantic.rowNeutral,
    badge: restaurantSemantic.badgeAvailable,
  },
  occupied: {
    card: restaurantSemantic.rowSuccess,
    badge: restaurantSemantic.badgeOccupied,
  },
};

function statusLabel(status: BoardStatus, isAr: boolean): string {
  const labels: Record<BoardStatus, { ar: string; en: string }> = {
    available: { ar: "متاحة", en: "Available" },
    occupied: { ar: "مشغولة", en: "Occupied" },
  };
  return isAr ? labels[status].ar : labels[status].en;
}

function formatDuration(minutes: number, isAr: boolean): string {
  if (minutes <= 0) return isAr ? "—" : "—";
  return isAr ? `${minutes} د` : `${minutes}m`;
}

function TableBoardCardSkeleton() {
  return (
    <div className={cn("animate-pulse rounded-lg border p-4 sm:p-5", restaurantDash.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-28 rounded bg-muted/40" />
        <div className="h-6 w-20 rounded-full bg-muted/30" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-12 rounded bg-muted/30" />
            <div className="h-6 w-8 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActiveTableBoardCard({
  table,
  isAr,
  onOpenSession,
}: {
  table: ActiveTableRow;
  isAr: boolean;
  onOpenSession: (sessionId: number) => void;
}) {
  const styles = STATUS_STYLES[table.status];

  return (
    <article className={cn("flex flex-col rounded-lg border p-4 transition-colors sm:p-5", styles.card)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{table.tableName}</h3>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            styles.badge
          )}
        >
          {statusLabel(table.status, isAr)}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{isAr ? "المدة" : "Duration"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {formatDuration(table.durationMinutes, isAr)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "الطلبات" : "Orders"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {table.totalOrders}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{isAr ? "قيد التنفيذ" : "Pending"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {table.pendingOrders}
          </dd>
        </div>
      </dl>

      {table.sessionId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5 w-full border-border/60"
          onClick={() => onOpenSession(Number.parseInt(table.sessionId!, 10))}
        >
          {isAr ? "فتح الجلسة" : "Open Session"}
        </Button>
      ) : null}
    </article>
  );
}

export function ActiveTablesBoardSection({
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
  const sectionTitle = isAr ? "لوحة الطاولات" : "Active Tables Board";
  const sectionSub = isAr
    ? "حالة كل طاولة والجلسة النشطة عليها"
    : "Live status for each table and its active session";
  const ariaLabel = sectionTitle;

  useDevQueryRuntimeLog("ops.getActiveTablesBoard", {
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

  if (isEmailNotVerifiedError(error)) {
    return (
      <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
        <VerificationRequiredPanel variant="orders" compact />
      </RestaurantDashSection>
    );
  }

  return (
    <RestaurantDashSection title={sectionTitle} description={sectionSub} ariaLabel={ariaLabel}>
      {isLoading ? (
        <div className={restaurantDash.kpiGridWide}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TableBoardCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <RestaurantSectionError
          message={
            isAr
              ? "تعذر تحميل لوحة الطاولات. حاول مرة أخرى."
              : "Could not load the tables board. Please try again."
          }
          retryLabel={isAr ? "إعادة المحاولة" : "Retry"}
          isFetching={isFetching}
          onRetry={() => void refetch()}
        />
      ) : !board?.tables.length ? (
        <RestaurantSectionEmpty
          message={isAr ? "لا توجد طاولات نشطة لعرضها" : "No active tables to display"}
        />
      ) : (
        <div className={restaurantDash.kpiGridWide}>
          {board.tables.map((table) => (
            <ActiveTableBoardCard
              key={table.tableId}
              table={table}
              isAr={isAr}
              onOpenSession={onOpenSession}
            />
          ))}
        </div>
      )}
    </RestaurantDashSection>
  );
}
