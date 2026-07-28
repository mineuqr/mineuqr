import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { FleetOperatorStatusPill } from "@/components/screen-management/FleetOperatorStatusPill";
import { FleetScreenActions } from "@/components/screen-management/FleetScreenActions";
import { type FleetScreenManageAction } from "@/components/screen-management/FleetScreenManageMenu";
import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import {
  SEMANTIC_MOTION_PREMIUM,
  SEMANTIC_SURFACE_PREMIUM,
  SEMANTIC_TONE,
  semanticDomainReportingSurfaceClass,
} from "@/design-system/semantic-card";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import {
  formatLastSeen,
  resolveOperatorFleetStatus,
  screenNeedsAttention,
} from "@/lib/screen-management/operatorFleetPresentation";

export type { FleetScreenManageAction };

/**
 * Fleet card — operator-first presentation (SCREEN-MANAGEMENT-UX-1A/1B/1E).
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1 — semantic panel + tone status.
 */
export function FleetScreenCard({
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
  const needsAttention = screenNeedsAttention(screen);
  const statusKind = resolveOperatorFleetStatus(screen);
  const isDisabled = screen.canonicalState.maintenanceState === "maintenance";

  const statusShell =
    statusKind === "online"
      ? SEMANTIC_TONE.row.success
      : statusKind === "needs_attention" || statusKind === "never_seen"
        ? SEMANTIC_TONE.row.warning
        : undefined;

  return (
    <article
      className={cn(
        SEMANTIC_SURFACE_PREMIUM,
        "rounded-xl",
        semanticDomainReportingSurfaceClass("analytics"),
        SEMANTIC_MOTION_PREMIUM,
        "flex w-full flex-col p-4 min-h-[188px]",
        statusShell,
        isDisabled && "opacity-70"
      )}
      data-domain="analytics"
      data-screen-id={screen.screenId}
      data-needs-attention={needsAttention ? "true" : "false"}
      data-operator-status={statusKind}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight">{screen.displayName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{screenTypeLabel(screen.role, language)}</p>
        </div>
        <FleetOperatorStatusPill kind={statusKind} language={language} />
      </div>

      {needsAttention ? (
        <div className="mb-2 flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {isAr ? "يحتاج انتباه — أكمل الإعداد على الجهاز" : "Needs attention — finish setup on the device"}
          </span>
        </div>
      ) : null}

      <dl className="mb-3 flex-1 space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-xs text-muted-foreground">{isAr ? "آخر اتصال" : "Last seen"}</dt>
          <dd className="text-xs">{formatLastSeen(screen.lastHeartbeat, language)}</dd>
        </div>
        {categorySummary ? (
          <div className="flex justify-between gap-2">
            <dt className="text-xs text-muted-foreground">{isAr ? "الأصناف" : "Items"}</dt>
            <dd className="text-end text-xs">{categorySummary}</dd>
          </div>
        ) : null}
      </dl>

      <FleetScreenActions
        screenId={screen.screenId}
        language={language}
        needsAttention={needsAttention}
        disabled={isDisabled}
        density="card"
        onSettings={onSettings}
        onManage={onManage}
      />
    </article>
  );
}
