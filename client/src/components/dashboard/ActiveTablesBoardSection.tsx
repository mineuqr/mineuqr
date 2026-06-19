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
import { AlertTriangle, Loader2 } from "lucide-react";
import type { RouterOutputs } from "@/lib/trpc";

type ActiveTableRow = RouterOutputs["ops"]["getActiveTablesBoard"]["tables"][number];
type BoardStatus = ActiveTableRow["status"];

const STATUS_STYLES: Record<
  BoardStatus,
  { card: string; badge: string }
> = {
  available: {
    card: "border-border/50 bg-[#12161f]/60",
    badge: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  },
  occupied: {
    card: "border-primary/35 bg-primary/5",
    badge: "bg-primary/20 text-primary border-primary/35",
  },
  bill_requested: {
    card: "border-amber-500/35 bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/35",
  },
  payment_pending: {
    card: "border-violet-500/35 bg-violet-500/5",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/35",
  },
};

function statusLabel(status: BoardStatus, isAr: boolean): string {
  const labels: Record<BoardStatus, { ar: string; en: string }> = {
    available: { ar: "متاحة", en: "Available" },
    occupied: { ar: "مشغولة", en: "Occupied" },
    bill_requested: { ar: "طلب فاتورة", en: "Bill requested" },
    payment_pending: { ar: "بانتظار الدفع", en: "Payment pending" },
  };
  return isAr ? labels[status].ar : labels[status].en;
}

function formatDuration(minutes: number, isAr: boolean): string {
  if (minutes <= 0) return isAr ? "—" : "—";
  return isAr ? `${minutes} د` : `${minutes}m`;
}

function TableBoardCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/40 bg-[#161b22] p-5 sm:p-6">
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
    <article
      className={cn(
        "flex flex-col rounded-2xl border p-5 shadow-sm transition-colors sm:p-6",
        styles.card
      )}
    >
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

  return (
    <section className="flex flex-col gap-6 sm:gap-8" aria-label={ariaLabel}>
      <div className="space-y-2.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {sectionTitle}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{sectionSub}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <TableBoardCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-[#161b22]/90 px-6 py-10 text-center sm:px-8">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <p className="max-w-md text-base text-muted-foreground">
            {isAr
              ? "تعذر تحميل لوحة الطاولات. حاول مرة أخرى."
              : "Could not load the tables board. Please try again."}
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
      ) : !board?.tables.length ? (
        <div className="rounded-2xl border border-border/40 bg-[#161b22]/50 px-6 py-12 text-center">
          <p className="text-base text-muted-foreground">
            {isAr ? "لا توجد طاولات نشطة لعرضها" : "No active tables to display"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
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
    </section>
  );
}
