/**
 * SCREEN-MANAGEMENT-UX-1B + SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Single fleet status pill — SemanticBadge only.
 */
import {
  SemanticBadge,
  mapFleetStatusToBadgeTone,
} from "@/design-system/semantic-badge";
import type { OperatorFleetStatusKind } from "@/lib/screen-management/operatorFleetPresentation";
import { operatorFleetStatusLabel } from "@/lib/screen-management/operatorFleetPresentation";

export function FleetOperatorStatusPill({
  kind,
  language,
  className,
}: {
  kind: OperatorFleetStatusKind;
  language: string;
  className?: string;
}) {
  return (
    <SemanticBadge
      tone={mapFleetStatusToBadgeTone(kind)}
      density="soft"
      className={className}
      data-operator-status={kind}
    >
      {operatorFleetStatusLabel(kind, language)}
    </SemanticBadge>
  );
}
