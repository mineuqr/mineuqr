import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import {
  getScreenEntryUrl,
  getScreenLoginUrl,
} from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import { cn } from "@/lib/utils";
import {
  formatLastSeen,
  operatorFleetStatusLabel,
  operatorFleetStatusPillClass,
  resolveOperatorFleetStatus,
  screenNeedsAttention,
} from "@/lib/screen-management/operatorFleetPresentation";
import {
  FleetScreenManageMenu,
  type FleetScreenManageAction,
} from "@/components/screen-management/FleetScreenManageMenu";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings2 } from "lucide-react";

/**
 * SCREEN-MANAGEMENT-UX-1B — dense fleet table row.
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
  const screenEntryUrl = getScreenEntryUrl();
  const screenSetupUrl = getScreenLoginUrl();

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(9rem,1.5fr)_minmax(6.5rem,0.85fr)_minmax(6rem,0.75fr)_minmax(5.5rem,0.7fr)_auto] items-center gap-3 border-b px-3 py-2.5 text-sm",
        "hover:bg-muted/40 focus-within:bg-muted/40",
        needsAttention && "bg-amber-500/5"
      )}
      data-screen-id={screen.screenId}
      data-needs-attention={needsAttention ? "true" : "false"}
      role="row"
    >
      <div className="min-w-0" role="cell">
        <p className="truncate font-medium leading-tight">{screen.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {screenTypeLabel(screen.role, language)}
        </p>
      </div>

      <div role="cell">
        <span
          className={cn(
            "inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium",
            operatorFleetStatusPillClass(statusKind)
          )}
        >
          {operatorFleetStatusLabel(statusKind, language)}
        </span>
      </div>

      <div className="truncate text-xs text-muted-foreground" role="cell" title={formatLastSeen(screen.lastHeartbeat, language)}>
        {formatLastSeen(screen.lastHeartbeat, language)}
      </div>

      <div className="truncate text-xs text-muted-foreground" role="cell">
        {categorySummary ?? "—"}
      </div>

      <div className="flex items-center justify-end gap-1" role="cell">
        {needsAttention ? (
          <Button size="sm" variant="default" className="h-8 px-2.5" disabled={isDisabled} asChild>
            <a href={screenSetupUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              {isAr ? "إعداد" : "Set up"}
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="default" className="h-8 px-2.5" disabled={isDisabled} asChild>
            <a href={screenEntryUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              {isAr ? "فتح" : "Open"}
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onSettings(screen.screenId)}
          aria-label={isAr ? "الإعدادات" : "Settings"}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <FleetScreenManageMenu
          screenId={screen.screenId}
          language={language}
          disabled={isDisabled}
          onManage={onManage}
          compact
        />
      </div>
    </div>
  );
}

export function FleetScreenTableHeader({ language }: { language: string }) {
  const isAr = language === "ar";
  return (
    <div
      className="grid grid-cols-[minmax(9rem,1.5fr)_minmax(6.5rem,0.85fr)_minmax(6rem,0.75fr)_minmax(5.5rem,0.7fr)_auto] items-center gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
