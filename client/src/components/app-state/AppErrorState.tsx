/**
 * Platform error state — backend / network failures.
 * Callers must supply already-sanitized user-facing copy.
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — facade over SemanticErrorState (page).
 */
import { SemanticErrorState } from "@/design-system/semantic-section-state";

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
    <SemanticErrorState
      variant="page"
      title={title}
      description={description}
      retryLabel={retryLabel}
      onRetry={onRetry}
      isRetrying={isRetrying}
      className={className}
    />
  );
}
