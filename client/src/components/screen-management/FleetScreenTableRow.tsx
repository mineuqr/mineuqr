import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { FleetOperatorStatusPill } from "@/components/screen-management/FleetOperatorStatusPill";
import { FleetScreenActions } from "@/components/screen-management/FleetScreenActions";
import type { FleetScreenManageAction } from "@/components/screen-management/FleetScreenManageMenu";
import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import {
  formatLastSeen,
  resolveOperatorFleetStatus,
  screenNeedsAttention,
} from "@/lib/screen-management/operatorFleetPresentation";

const TABLE_GRID =
  "grid grid-cols-[minmax(9rem,1.4fr)_minmax(6.5rem,0.85fr)_minmax(6rem,0.75fr)_minmax(5.5rem,0.7fr)_minmax(14rem,auto)] items-center gap-3 border-b px-3 py-2.5 text-sm";

/**
 * SCREEN-MANAGEMENT-UX-1B/1E — dense fleet table row with shared card actions.
 */
export function FleetScreenTableRow({
  screen,
  language,
  categorySummary,
  onSettings,
  onManage,
}: {
  screen: FleetScreenReadModel;
  language: string;
  categorySummary?: string | null;
  onSettings: (screenId: string) => void;
  onManage: (screenId: string, action: FleetScreenManageAction) => void;
}) {
  const isAr = language === "ar";
  const statusKind = resolveOperatorFleetStatus(screen);
  const needsAttention = screenNeedsAttention(screen);
  const isDisabled = screen.canonicalState.maintenanceState === "maintenance";

  return (
    <div
      className={cn(
        TABLE_GRID,
        "hover:bg-muted/40 focus-within:bg-muted/40",
        needsAttention && "bg-amber-500/5"
      )}
      data-screen-id={screen.screenId}
      data-needs-attention={needsAttention ? "true" : "false"}
      role="row"
    >
      <div className="min-w-0" role="cell">
        <div className="flex min-w-0 items-start gap-1.5">
          {needsAttention ? (
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-label={isAr ? "يحتاج انتباه" : "Needs attention"}
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-medium leading-tight">{screen.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {screenTypeLabel(screen.role, language)}
            </p>
          </div>
        </div>
      </div>

      <div role="cell">
        <FleetOperatorStatusPill kind={statusKind} language={language} />
      </div>

      <div
        className="truncate text-xs text-muted-foreground"
        role="cell"
        title={formatLastSeen(screen.lastHeartbeat, language)}
      >
        {formatLastSeen(screen.lastHeartbeat, language)}
      </div>

      <div className="truncate text-xs text-muted-foreground" role="cell">
        {categorySummary ?? "—"}
      </div>

      <div role="cell">
        <FleetScreenActions
          screenId={screen.screenId}
          language={language}
          needsAttention={needsAttention}
          disabled={isDisabled}
          density="table"
          onSettings={onSettings}
          onManage={onManage}
        />
      </div>
    </div>
  );
}

export function FleetScreenTableHeader({ language }: { language: string }) {
  const isAr = language === "ar";
  return (
    <div
      className={cn(
        TABLE_GRID,
        "border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      )}
      role="row"
    >
      <div role="columnheader">{isAr ? "الشاشة" : "Screen"}</div>
      <div role="columnheader">{isAr ? "الحالة" : "Status"}</div>
      <div role="columnheader">{isAr ? "آخر اتصال" : "Last seen"}</div>
      <div role="columnheader">{isAr ? "الأصناف" : "Items"}</div>
      <div role="columnheader" className="text-end">
        {isAr ? "إجراءات" : "Actions"}
      </div>
    </div>
  );
}
