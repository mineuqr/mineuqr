/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — footer meta (elapsed │ status emphasis).
 */
import type { OrderPresentationModel } from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";
import { OPERATIONAL_META_SEPARATOR_CLASS } from "@/lib/operational-screen/operationalCardTypography";
import { cn } from "@/lib/utils";
import { OperationalOrderTimeline } from "./OperationalOrderTimeline";

export function OperationalOrderFooter({
  presentation,
  isAr,
  showStatusText = true,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
  showStatusText?: boolean;
}) {
  const statusLabel = pickLocalizedLabel(presentation.statusLabel, isAr);

  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-x-6"
      aria-label={
        isAr
          ? `${pickLocalizedLabel(presentation.timing.elapsedCompactLabel, true)}، ${statusLabel}`
          : `${pickLocalizedLabel(presentation.timing.elapsedCompactLabel, false)}, ${statusLabel}`
      }
      data-slot="operational-order-footer"
    >
      <OperationalOrderTimeline presentation={presentation} isAr={isAr} compact />
      <span className={cn(OPERATIONAL_META_SEPARATOR_CLASS, "self-center")} aria-hidden>
        │
      </span>
      {showStatusText ? (
        <p
          className={cn(
            presentation.emphasis.statusLabelClass,
            "text-end text-sm font-bold leading-none whitespace-nowrap"
          )}
        >
          {statusLabel}
        </p>
      ) : (
        <span />
      )}
    </div>
  );
}
