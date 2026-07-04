import { Button } from "@/components/ui/button";
import { DelayExplanation } from "@/components/operational-workspace/DelayExplanation";
import { SlaIndicator } from "@/components/operational-workspace/SlaIndicator";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import { explainDelay } from "@/lib/operational-workspace/delayIntelligence";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";
import { cn } from "@/lib/utils";

export function OperationalCard({
  orderNumber,
  tableLabel,
  linesSummary,
  orderNotes,
  customerName,
  totalAmount,
  currencySymbol,
  status,
  sla,
  language,
  actions,
  onAction,
  onOpenDetails,
  actionPending,
  executionOnly,
  className,
  fading,
}: {
  orderNumber: string;
  tableLabel: string;
  linesSummary: string;
  orderNotes?: string | null;
  customerName?: string | null;
  totalAmount?: string;
  currencySymbol?: string;
  status: string;
  sla: SlaSnapshot;
  language: string;
  actions?: OperationalAction[];
  onAction?: (actionId: OperationalAction["id"]) => void;
  onOpenDetails?: () => void;
  actionPending?: boolean;
  executionOnly?: boolean;
  className?: string;
  fading?: boolean;
}) {
  const isAr = language === "ar";
  const delay = explainDelay({ status, sla, isAr });

  return (
    <article
      className={cn(
        "rounded-2xl border p-5 shadow-sm transition-all touch-manipulation min-h-[140px]",
        sla.urgencyTier === "critical" && "border-destructive/50 bg-destructive/5",
        sla.urgencyTier === "elevated" && "border-amber-500/40 bg-amber-500/5",
        sla.urgencyTier === "normal" && "border-border bg-card",
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
            <p className="font-mono text-xl font-bold tracking-tight">{orderNumber}</p>
            <p className="text-base text-muted-foreground">{tableLabel}</p>
          </div>
          <SlaIndicator sla={sla} isAr={isAr} />
        </div>

        {customerName ? <p className="mb-1 text-base font-medium">{customerName}</p> : null}
        <p className="mb-2 line-clamp-3 text-base leading-relaxed">{linesSummary}</p>
        {orderNotes ? (
          <p className="mb-2 rounded-lg bg-muted/60 px-3 py-2 text-sm font-medium">{orderNotes}</p>
        ) : null}
        {totalAmount ? (
          <p className="text-lg font-semibold">
            {totalAmount} {currencySymbol ?? ""}
          </p>
        ) : null}
      </button>

      <div className="mt-3 space-y-2">
        <DelayExplanation reason={delay.reason} message={delay.message} />
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
