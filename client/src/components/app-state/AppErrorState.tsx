import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Platform error state — backend / network failures.
 * Callers must supply already-sanitized user-facing copy.
 */
export function AppErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  isRetrying = false,
  className,
}: {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center sm:py-16",
        className
      )}
      role="alert"
      data-app-state="error"
    >
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry && retryLabel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={isRetrying}
          onClick={onRetry}
        >
          {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
