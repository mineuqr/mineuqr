import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Platform loading state — DASHBOARD-ERROR-STATE-ARCHITECTURE-1.
 * Shared UI infrastructure; must not reference Dashboard.
 */
export function AppLoadingState({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-24", className)}
      role="status"
      aria-live="polite"
      data-app-state="loading"
    >
      <Spinner className="size-8 text-primary" />
      {label ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
