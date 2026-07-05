import { Clock, MonitorCheck } from "lucide-react";
import { useResolvedRuntimeRole } from "@/lib/operational-screen/roles/useRoleRuntime";
import { useRoleRuntimeHealth } from "@/lib/operational-screen/roles/useRoleRuntime";

/**
 * Blocked role presentation — NOT an error state.
 * Role exists, lifecycle executed, capability intentionally unavailable.
 */
export function BlockedRolePresentation() {
  const { definition, context } = useResolvedRuntimeRole();
  const health = useRoleRuntimeHealth();

  if (!definition || !context) return null;

  const language = context.presentation.language;
  const isAr = language === "ar";
  const meta = definition.metadata;
  const blockedReason = meta.blockedReason;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <MonitorCheck className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{context.identity.displayName}</h2>
      <p className="text-muted-foreground">
        {isAr ? meta.displayName.ar : meta.displayName.en}
      </p>

      <div className="max-w-md space-y-2 rounded-lg border border-border/40 bg-muted/10 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">
          {isAr ? "الدور متاح — وقت التشغيل مهيأ" : "Role available — runtime initialized"}
        </p>
        <p className="text-muted-foreground">
          {blockedReason
            ? isAr
              ? blockedReason.ar
              : blockedReason.en
            : isAr
              ? "في انتظار تفعيل القدرة في برنامج لاحق."
              : "Waiting for future capability activation."}
        </p>
        {health?.runtimeState === "blocked" ? (
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {isAr ? "الحالة: محجوب (متعمد)" : "Status: blocked (intentional)"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
