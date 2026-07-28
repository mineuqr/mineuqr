/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — delay indicator (presentation only).
 */
import { AlertTriangle } from "lucide-react";
import type { OrderPresentationModel } from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";
import { cn } from "@/lib/utils";

export function OperationalOrderDelay({
  presentation,
  isAr,
  warningClass,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
  warningClass: string;
}) {
  if (!presentation.delay.showWarning) return null;
  const message = pickLocalizedLabel(presentation.delay.message, isAr);

  return (
    <p
      className={cn(
        "mt-1.5 flex items-start gap-1.5 rounded px-1.5 py-1",
        warningClass,
        presentation.delay.warningTone === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
      )}
      role="status"
      data-slot="operational-order-delay"
    >
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
