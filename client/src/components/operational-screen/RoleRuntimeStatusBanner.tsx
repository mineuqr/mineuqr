import { cn } from "@/lib/utils";
import { useRoleRuntimeHealth } from "@/lib/operational-screen/roles/useRoleRuntime";

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  initializing: { en: "Initializing", ar: "جاري التهيئة" },
  authenticating: { en: "Authenticating", ar: "جاري المصادقة" },
  bootstrapping: { en: "Bootstrapping", ar: "جاري الإقلاع" },
  ready: { en: "Ready", ar: "جاهز" },
  operational: { en: "Operational", ar: "تشغيلي" },
  blocked: { en: "Blocked", ar: "محجوب" },
  disconnected: { en: "Disconnected", ar: "غير متصل" },
  reconnecting: { en: "Reconnecting", ar: "إعادة الاتصال" },
  disposed: { en: "Disposed", ar: "مُنهى" },
};

/** Minimal runtime status exposure — no UX redesign. */
export function RoleRuntimeStatusBanner({ className }: { className?: string }) {
  const health = useRoleRuntimeHealth();
  if (!health) return null;

  const label = STATUS_LABELS[health.runtimeState] ?? { en: health.runtimeState, ar: health.runtimeState };

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
        className
      )}
      data-runtime-state={health.runtimeState}
      data-role-operational={health.operational ? "true" : "false"}
    >
      <span className="rounded border border-border/40 px-2 py-0.5">
        {label.en}
      </span>
      {health.blockedReason ? (
        <span className="text-muted-foreground/80">{health.blockedReason.en}</span>
      ) : null}
    </div>
  );
}
