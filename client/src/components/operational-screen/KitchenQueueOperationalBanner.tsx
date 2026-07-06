import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kitchenStaleDataMessage } from "@/lib/operational-screen/kitchen/kitchenQueueFailure";
import { cn } from "@/lib/utils";

export function KitchenQueueErrorPanel({
  message,
  retryLabel,
  onRetry,
  isRetrying,
  language,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  isRetrying: boolean;
  language: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-16 text-center"
      role="alert"
    >
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <p className="max-w-md text-sm text-destructive/90">{message}</p>
      <Button type="button" variant="outline" size="sm" disabled={isRetrying} onClick={onRetry}>
        {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {retryLabel}
      </Button>
    </div>
  );
}

export function KitchenStaleDataBanner({
  language,
  className,
}: {
  language: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200",
        className
      )}
      role="status"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {kitchenStaleDataMessage(language)}
    </div>
  );
}
