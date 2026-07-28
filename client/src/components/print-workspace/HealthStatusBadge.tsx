/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Print workspace health badge — consumes SemanticBadge + healthTone mapper.
 */
import {
  SemanticBadge,
  mapHealthToneToBadgeTone,
} from "@/design-system/semantic-badge";
import {
  formatHealthLabel,
  healthTone,
  type WorkspaceHealthState,
} from "@/lib/print-workspace/viewModels";

export function HealthStatusBadge({
  state,
  language,
  className,
}: {
  state: WorkspaceHealthState;
  language: string;
  className?: string;
}) {
  return (
    <SemanticBadge
      tone={mapHealthToneToBadgeTone(healthTone(state))}
      density="soft"
      className={className}
    >
      {formatHealthLabel(state, language)}
    </SemanticBadge>
  );
}
