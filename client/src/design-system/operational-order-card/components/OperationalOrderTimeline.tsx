/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — elapsed / target / late timeline row.
 */
import { SemanticBadge } from "@/design-system/semantic-badge";
import type { OrderPresentationModel } from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";
import { cn } from "@/lib/utils";

export function OperationalOrderTimeline({
  presentation,
  isAr,
  compact = false,
  timingClass,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
  compact?: boolean;
  timingClass?: string;
}) {
  const { timing } = presentation;

  if (compact) {
    return (
      <p
        className={cn(
          timing?.elapsedClassName ?? timingClass,
          "whitespace-nowrap tabular-nums"
        )}
        aria-label={isAr ? "الوقت المنقضي" : "Elapsed time"}
      >
        {pickLocalizedLabel(timing.elapsedCompactLabel, isAr)}
      </p>
    );
  }

  const tone =
    timing.indicatorTone === "danger"
      ? "text-destructive"
      : timing.indicatorTone === "warning"
        ? timing.slaStatus === "late"
          ? "text-amber-600"
          : "text-amber-500"
        : "text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-sm", tone)}>
      <span className="text-base font-semibold tabular-nums">
        {pickLocalizedLabel(timing.elapsedLabel, isAr)}
      </span>
      <span className="text-xs text-muted-foreground">
        / {pickLocalizedLabel(timing.targetLabel, isAr)} {isAr ? "هدف" : "target"}
      </span>
      {timing.lateLabel ? (
        <SemanticBadge tone="danger" density="soft" size="sm">
          +{pickLocalizedLabel(timing.lateLabel, isAr)} {isAr ? "تأخير" : "late"}
        </SemanticBadge>
      ) : null}
    </div>
  );
}
