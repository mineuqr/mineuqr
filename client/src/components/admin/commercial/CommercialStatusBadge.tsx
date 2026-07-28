/**
 * EXEC-7B + SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Commercial status badge — presentation only; status determination is external.
 */
import {
  SemanticBadge,
  mapCommercialStatusToBadgeTone,
} from "@/design-system/semantic-badge";

export type CommercialStatusBadgeState =
  | "trial"
  | "active"
  | "grace"
  | "suspended"
  | "expired"
  | "inactive";

type CommercialStatusBadgeProps = {
  status: CommercialStatusBadgeState;
  label: string;
  className?: string;
  size?: "sm" | "md";
};

export function CommercialStatusBadge({
  status,
  label,
  className,
  size = "sm",
}: CommercialStatusBadgeProps) {
  const density =
    status === "inactive" ? ("outline" as const) : ("filled" as const);

  return (
    <SemanticBadge
      tone={mapCommercialStatusToBadgeTone(status)}
      density={density}
      size={size}
      interactive={false}
      className={className}
    >
      {label}
    </SemanticBadge>
  );
}
