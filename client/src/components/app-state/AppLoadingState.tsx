/**
 * Platform loading state — DASHBOARD-ERROR-STATE-ARCHITECTURE-1.
 * Shared UI infrastructure; must not reference Dashboard.
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — facade over SemanticLoadingState (page).
 */
import { SemanticLoadingState } from "@/design-system/semantic-section-state";

export function AppLoadingState({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <SemanticLoadingState
      variant="page"
      label={label}
      className={className}
    />
  );
}
