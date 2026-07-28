/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — action chrome only (no workflow ownership).
 */
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import type {
  OrderPresentationAction,
  OrderPresentationModel,
} from "@/lib/order-presentation";
import { pickLocalizedLabel } from "@/lib/order-presentation";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import { cn } from "@/lib/utils";

export function OperationalOrderActions({
  presentation,
  isAr,
  mode,
  singleAction,
  onAction,
  actionPending,
  actionSucceeded,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
  mode: "multi" | "single" | "none";
  singleAction?: OrderPresentationAction | null;
  onAction?: (orderId: number, actionId: OperationalActionId) => void;
  actionPending?: boolean;
  actionSucceeded?: boolean;
}) {
  if (mode === "none" || !onAction) return null;

  if (mode === "single") {
    const action = singleAction;
    if (!action) return null;
    const label = pickLocalizedLabel(action.label, isAr);
    return (
      <Button
        type="button"
        size="lg"
        variant={action.variant === "destructive" ? "destructive" : "default"}
        className={cn(
          "h-11 w-full rounded-lg border-0 text-sm font-bold text-white shadow-sm",
          "transition-[box-shadow,transform,background-color] duration-150",
          "active:scale-[0.98]",
          "focus-visible:ring-2 focus-visible:ring-offset-2",
          presentation.emphasis.actionButtonClass
        )}
        disabled={actionPending}
        aria-busy={actionPending ? true : undefined}
        onClick={(event) => {
          event.stopPropagation();
          onAction(presentation.orderId, action.id);
        }}
        aria-label={label}
      >
        {actionPending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : actionSucceeded ? (
          <span className="inline-flex items-center gap-2">
            <Check className="h-5 w-5" aria-hidden />
            {label}
          </span>
        ) : (
          label
        )}
      </Button>
    );
  }

  const actions = presentation.availableActions;
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
      {actions.map((action) => (
        <Button
          key={action.id}
          size="lg"
          variant={
            action.variant === "destructive"
              ? "destructive"
              : action.variant === "secondary"
                ? "secondary"
                : "default"
          }
          className="min-h-11 flex-1 touch-manipulation"
          disabled={actionPending}
          onClick={() => onAction(presentation.orderId, action.id)}
        >
          {pickLocalizedLabel(action.label, isAr)}
        </Button>
      ))}
    </div>
  );
}
