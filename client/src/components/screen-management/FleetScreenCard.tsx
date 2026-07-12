import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import {
  presenceLabel,
  screenTypeLabel,
} from "@/lib/operational-screen/screenLabels";
import { cn } from "@/lib/utils";
import { KeyRound, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPERATIONAL_LABELS: Record<string, { en: string; ar: string }> = {
  operational: { en: "Operational", ar: "تشغيلي" },
  blocked: { en: "Blocked", ar: "محجوب" },
  degraded: { en: "Degraded", ar: "متدهور" },
  maintenance: { en: "Maintenance", ar: "صيانة" },
  disconnected: { en: "Disconnected", ar: "غير متصل" },
  initializing: { en: "Initializing", ar: "جاري التهيئة" },
  ready: { en: "Ready", ar: "جاهز" },
  disposed: { en: "Disposed", ar: "مُنهى" },
};

/**
 * Fleet card — lifecycle actions via ScreenCredentialLifecycleSheet.
 */
export function FleetScreenCard({
  screen,
  language,
  onSettings,
  onLifecycle,
}: {
  screen: FleetScreenReadModel;
  language: string;
  onSettings: (screenId: string) => void;
  onLifecycle: (screenId: string) => void;
}) {
  const isAr = language === "ar";
  const { canonicalState, healthSummary } = screen;
  const opLabel =
    OPERATIONAL_LABELS[canonicalState.operationalState] ?? {
      en: canonicalState.operationalState,
      ar: canonicalState.operationalState,
    };

  const isDisabled = canonicalState.maintenanceState === "maintenance";

  return (
    <article
      className={cn(
        "flex w-full flex-col rounded-2xl border p-5 shadow-sm min-h-[200px]",
        healthSummary.presence === "online" && "border-emerald-500/40 bg-emerald-500/5",
        isDisabled && "opacity-70"
      )}
      data-screen-id={screen.screenId}
      data-operational-state={canonicalState.operationalState}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{screen.displayName}</p>
          <p className="text-sm text-muted-foreground">{screenTypeLabel(screen.role, language)}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
            healthSummary.presence === "online" && "bg-emerald-500/15 text-emerald-700",
            healthSummary.presence === "offline" && "bg-amber-500/15 text-amber-800",
            healthSummary.presence === "never_seen" && "bg-muted text-muted-foreground"
          )}
        >
          {presenceLabel(healthSummary.presence, language)}
        </span>
      </div>

      <dl className="mb-4 flex-1 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{isAr ? "الحالة" : "State"}</dt>
          <dd>{isAr ? opLabel.ar : opLabel.en}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{isAr ? "آخر نبض" : "Last heartbeat"}</dt>
          <dd>
            {screen.lastHeartbeat
              ? new Date(screen.lastHeartbeat).toLocaleString(isAr ? "ar-SA" : "en-US")
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="default"
          className="min-h-10 flex-1"
          onClick={() => onSettings(screen.screenId)}
        >
          <Settings2 className="mr-1 h-4 w-4" />
          {isAr ? "الإعدادات" : "Settings"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-10 flex-1"
          disabled={isDisabled}
          onClick={() => onLifecycle(screen.screenId)}
        >
          <KeyRound className="mr-1 h-4 w-4" />
          {isAr ? "الاعتماد" : "Credential"}
        </Button>
      </div>
    </div>
  );
}
