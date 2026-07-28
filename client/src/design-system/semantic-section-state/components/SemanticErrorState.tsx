/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — error + retry presentation.
 * Features own retry handlers; platform only renders the slot.
 */
import { Button } from "@/components/ui/button";
import { semanticPanel } from "@/design-system/semantic-card/tokens/panel";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { SemanticRetrySlot, SemanticStateIllustration } from "./SemanticStateSlots";

export type SemanticErrorVariant = "section" | "page";

export function SemanticErrorState({
  title,
  message,
  description,
  details,
  retryLabel,
  onRetry,
  isFetching = false,
  isRetrying,
  className,
  variant = "section",
}: {
  title?: string;
  message?: string;
  description?: string;
  details?: string;
  retryLabel?: string;
  onRetry?: () => void;
  isFetching?: boolean;
  /** Alias for page-density busy flag. */
  isRetrying?: boolean;
  className?: string;
  variant?: SemanticErrorVariant;
}) {
  const busy = isRetrying ?? isFetching;
  const body = message ?? description ?? "";

  if (variant === "page") {
    return (
      <div
        data-slot="semantic-error-state"
        data-variant="page"
        data-app-state="error"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center sm:py-16",
          className
        )}
        role="alert"
      >
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
        {title ? (
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        ) : null}
        {body ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{body}</p>
        ) : null}
        {details ? (
          <p className="mx-auto max-w-md text-xs text-muted-foreground/80">{details}</p>
        ) : null}
        {onRetry && retryLabel ? (
          <SemanticRetrySlot>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={busy}
              onClick={onRetry}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {retryLabel}
            </Button>
          </SemanticRetrySlot>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-slot="semantic-error-state"
      data-variant="section"
      className={cn(semanticPanel.error, "rounded-2xl", className)}
      role="alert"
    >
      <SemanticStateIllustration icon={AlertTriangle} tone="warning" />
      {title ? (
        <p className="text-sm font-semibold text-slate-200">{title}</p>
      ) : null}
      {body ? (
        <p className="max-w-md text-sm leading-relaxed text-slate-300">{body}</p>
      ) : null}
      {details ? (
        <p className="max-w-md text-xs text-slate-500">{details}</p>
      ) : null}
      {onRetry && retryLabel ? (
        <SemanticRetrySlot>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 px-4"
            disabled={busy}
            onClick={onRetry}
          >
            {busy ? (
              <Loader2
                className="h-4 w-4 motion-safe:animate-spin"
                aria-hidden
              />
            ) : null}
            {retryLabel}
          </Button>
        </SemanticRetrySlot>
      ) : null}
    </div>
  );
}
