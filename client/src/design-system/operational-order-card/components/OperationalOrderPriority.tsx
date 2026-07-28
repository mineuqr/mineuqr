/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — priority / overdue via SemanticBadge.
 */
import { SemanticBadge } from "@/design-system/semantic-badge";
import type { OrderPresentationModel } from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";

export function OperationalOrderPriority({
  presentation,
  isAr,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
}) {
  const overdueBadge = presentation.badges.find((b) => b.id === "sla-overdue");
  const urgent =
    presentation.timing.urgencyTier === "critical" ||
    presentation.timing.urgencyTier === "elevated";

  if (!overdueBadge && !urgent) return null;

  const tone =
    presentation.timing.urgencyTier === "critical" || overdueBadge?.tone === "danger"
      ? "danger"
      : "warning";

  const label = overdueBadge
    ? pickLocalizedLabel(overdueBadge.label, isAr)
    : isAr
      ? "أولوية"
      : "Priority";

  return (
    <SemanticBadge tone={tone} density="soft" size="sm">
      {label}
    </SemanticBadge>
  );
}
