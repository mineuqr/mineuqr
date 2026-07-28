/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — status via SemanticBadge only.
 */
import {
  SemanticBadge,
  mapOrderStatusToBadgeTone,
} from "@/design-system/semantic-badge";
import type { OrderPresentationModel } from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";

export function OperationalOrderStatus({
  presentation,
  status,
  statusLabel,
  isAr,
  size = "sm",
}: {
  presentation?: Pick<OrderPresentationModel, "status" | "statusLabel">;
  /** Compact surfaces (Print list) without full presentation model. */
  status?: string;
  statusLabel?: string;
  isAr: boolean;
  size?: "sm" | "md";
}) {
  const resolvedStatus = presentation?.status ?? status ?? "";
  const label = presentation
    ? pickLocalizedLabel(presentation.statusLabel, isAr)
    : statusLabel ?? resolvedStatus;

  return (
    <SemanticBadge
      tone={mapOrderStatusToBadgeTone(resolvedStatus)}
      density="soft"
      size={size}
    >
      {label}
    </SemanticBadge>
  );
}
