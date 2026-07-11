import { Button } from "@/components/ui/button";
import { DelayExplanation } from "@/components/operational-workspace/DelayExplanation";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import {
  pickLocalizedLabel,
  type OrderPresentationModel,
} from "@/lib/order-presentation";
import { cn } from "@/lib/utils";

function PresentationSlaIndicator({
  presentation,
  isAr,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
}) {
  const { timing } = presentation;
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
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          +{pickLocalizedLabel(timing.lateLabel, isAr)} {isAr ? "تأخير" : "late"}
        </span>
      ) : null}
    </div>
  );
}

export function OperationalCard({
  presentation,
  language,
  currencySymbol,
  actions,
  onAction,
  onOpenDetails,
  actionPending,
  executionOnly,
  className,
  fading,
}: {
  presentation: OrderPresentationModel;
  language: string;
  currencySymbol?: string;
  actions?: OperationalAction[];
  onAction?: (actionId: OperationalAction["id"]) => void;
  onOpenDetails?: () => void;
  actionPending?: boolean;
  executionOnly?: boolean;
  className?: string;
  fading?: boolean;
}) {
  const isAr = language === "ar";

  return (
    <article
      className={cn(
        "rounded-2xl border p-5 shadow-sm transition-all touch-manipulation min-h-[140px]",
        presentation.emphasis.cardBorderClass,
        fading && "opacity-60",
        className
      )}
    >
      <button
        type="button"
        className="w-full text-start"
        onClick={onOpenDetails}
        disabled={!onOpenDetails}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xl font-bold tracking-tight">
              {presentation.identity.displayReference}
            </p>
            <p className="text-base text-muted-foreground">
              {pickLocalizedLabel(presentation.fulfillment.label, isAr)}
            </p>
          </div>
          <PresentationSlaIndicator presentation={presentation} isAr={isAr} />
        </div>

        {presentation.customer.name ? (
          <p className="mb-1 text-base font-medium">{presentation.customer.name}</p>
        ) : null}
        <p className="mb-2 line-clamp-3 text-base leading-relaxed">
          {pickLocalizedLabel(presentation.items.summary, isAr)}
        </p>
        {presentation.notes ? (
          <p className="mb-2 rounded-lg bg-muted/60 px-3 py-2 text-sm font-medium">
            {presentation.notes}
          </p>
        ) : null}
        {presentation.totalAmount ? (
          <p className="text-lg font-semibold">
            {presentation.totalAmount} {currencySymbol ?? ""}
          </p>
        ) : null}
      </button>

      <div className="mt-3 space-y-2">
        <DelayExplanation
          reason={presentation.delay.reason}
          message={pickLocalizedLabel(presentation.delay.message, isAr)}
        />
        {!executionOnly && actions && actions.length > 0 && onAction ? (
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
                onClick={() => onAction(action.id)}
              >
                {isAr ? action.labelAr : action.labelEn}
              </Button>
            ))}
          </div>
        ) : executionOnly ? (
          <p className="text-xs text-muted-foreground">
            {isAr ? "إدارة الطلب من مساحة الطلبات" : "Manage order from Orders Workspace"}
          </p>
        ) : null}
      </div>
    </article>
  );
}
