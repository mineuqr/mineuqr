import { cn } from "@/lib/utils";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  initializing: { en: "Initializing", ar: "جاري التهيئة" },
  ready: { en: "Ready", ar: "جاهز" },
  operational: { en: "Operational", ar: "تشغيلي" },
  blocked: { en: "Blocked", ar: "محجوب" },
  degraded: { en: "Degraded", ar: "متدهور" },
  maintenance: { en: "Maintenance", ar: "صيانة" },
  disconnected: { en: "Disconnected", ar: "غير متصل" },
  disposed: { en: "Disposed", ar: "مُنهى" },
};

/** Minimal runtime status exposure — consumes canonical screen state only. */
export function RoleRuntimeStatusBanner({ className }: { className?: string }) {
  const context = useRuntimeContext();
  const state = context.screenState;
  const label =
    STATUS_LABELS[state.operationalState] ?? {
      en: state.operationalState,
      ar: state.operationalState,
    };

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
        className
      )}
      data-operational-state={state.operationalState}
      data-connectivity-state={state.connectivityState}
      data-screen-state-version={state.version}
    >
      <span className="rounded border border-border/40 px-2 py-0.5">{label.en}</span>
      {state.blockedReason ? (
        <span className="text-muted-foreground/80">{state.blockedReason.en}</span>
      ) : null}
    </div>
  );
}
