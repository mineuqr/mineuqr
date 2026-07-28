import { Button } from "@/components/ui/button";
import {
  SemanticBadge,
  mapTableSessionStatusToBadgeTone,
  resolveBadgeBaseTone,
} from "@/design-system/semantic-badge";
import { semanticToneRowClass } from "@/design-system/semantic-card";
import type { OperationalTableRow } from "@/lib/sessionWorkspaceOps";
import { tableStatusDisplayLabel } from "@/lib/sessionWorkspaceOps";
import { cn } from "@/lib/utils";
import { SessionRowQuickActions } from "./SessionRowQuickActions";
import { restaurantDash, restaurantHoverGlow } from "./restaurantDashStyles";

function formatDuration(minutes: number, isAr: boolean): string {
  if (minutes <= 0) return isAr ? "—" : "—";
  return isAr ? `${minutes} د` : `${minutes}m`;
}

export function OperationalBoardCard({
  table,
  isAr,
  onOpenSession,
  variant = "home",
  restaurantId,
}: {
  table: OperationalTableRow;
  isAr: boolean;
  onOpenSession: (sessionId: number) => void;
  variant?: "home" | "workspace";
  restaurantId?: number;
}) {
  const badgeTone = mapTableSessionStatusToBadgeTone(table.sessionStatus);
  const cardClass = semanticToneRowClass(resolveBadgeBaseTone(badgeTone));
  const hasSession = table.sessionId != null && table.sessionStatus !== "available";
  const sessionId = hasSession ? Number.parseInt(table.sessionId!, 10) : null;

  const openSession = () => {
    if (sessionId == null) return;
    onOpenSession(sessionId);
  };

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border p-4 sm:p-5",
        restaurantHoverGlow,
        cardClass,
        hasSession && "cursor-pointer"
      )}
      role={hasSession ? "button" : undefined}
      tabIndex={hasSession ? 0 : undefined}
      onClick={hasSession ? openSession : undefined}
      onKeyDown={
        hasSession
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openSession();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-white">{table.tableName}</h3>
        <SemanticBadge tone={badgeTone} density="soft" size="sm">
          {tableStatusDisplayLabel(table.sessionStatus, isAr)}
        </SemanticBadge>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-slate-400">{isAr ? "المدة" : "Duration"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {formatDuration(table.durationMinutes, isAr)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">{isAr ? "الطلبات" : "Orders"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {table.totalOrders}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">{isAr ? "قيد التنفيذ" : "Pending"}</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-100">
            {table.pendingOrders}
          </dd>
        </div>
      </dl>

      {hasSession && sessionId != null ? (
        variant === "workspace" && restaurantId != null && table.sessionStatus === "open" ? (
          <div className="mt-5" onClick={(event) => event.stopPropagation()}>
            <SessionRowQuickActions
              restaurantId={restaurantId}
              sessionId={sessionId}
              sessionStatus="open"
              isAr={isAr}
              onOpenSession={onOpenSession}
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("mt-5 w-full", restaurantDash.toolbarBtn)}
            onClick={(event) => {
              event.stopPropagation();
              openSession();
            }}
          >
            {isAr ? "فتح الجلسة" : "Open Session"}
          </Button>
        )
      ) : null}
    </article>
  );
}

export function OperationalBoardCardSkeleton() {
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
