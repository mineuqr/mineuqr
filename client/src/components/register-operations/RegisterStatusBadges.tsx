/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 + SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Operational status badges — backend duty / catalog / shift presence only.
 */
import {
  DotBadge,
  SemanticBadge,
  mapRegisterAvailabilityToBadgeTone,
  mapRegisterDutyToBadgeTone,
  mapRegisterShiftToBadgeTone,
} from "@/design-system/semantic-badge";
import type {
  AvailabilityBadgeTone,
  DutyBadgeTone,
  ShiftBadgeTone,
} from "@/lib/register-operations-presentation";

export function DutyBadge({
  tone,
  label,
  className,
}: {
  tone: DutyBadgeTone;
  label: string;
  className?: string;
}) {
  return (
    <DotBadge
      tone={mapRegisterDutyToBadgeTone(tone)}
      label={label}
      className={className}
    />
  );
}

export function AvailabilityBadge({
  tone,
  label,
  className,
}: {
  tone: AvailabilityBadgeTone;
  label: string;
  className?: string;
}) {
  return (
    <SemanticBadge
      tone={mapRegisterAvailabilityToBadgeTone(tone)}
      density="soft"
      className={className}
    >
      {label}
    </SemanticBadge>
  );
}

export function ShiftBadge({
  tone,
  label,
  className,
}: {
  tone: ShiftBadgeTone;
  label: string;
  className?: string;
}) {
  return (
    <SemanticBadge
      tone={mapRegisterShiftToBadgeTone(tone)}
      density="soft"
      className={className}
    >
      {label}
    </SemanticBadge>
  );
}
