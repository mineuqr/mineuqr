import { memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import {
  formatOperationalItemOverflow,
  formatOperationalQuantity,
  OPERATIONAL_ITEM_ROW_DIVIDER_CLASS,
  OPERATIONAL_META_SEPARATOR_CLASS,
} from "@/lib/operational-screen/operationalCardTypography";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import {
  pickLocalizedLabel,
  recordOrderPerfEvent,
  type OrderPresentationModel,
} from "@/lib/order-presentation";
import { AlertTriangle, Check, Loader2, StickyNote } from "lucide-react";
import type { KeyboardEvent } from "react";

function OperationalItemTable({
  presentation,
  isAr,
  densityModel,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
  densityModel: PresentationDensityModel;
}) {
  const lineItems = presentation.items.lines;
  const linesSummary = pickLocalizedLabel(presentation.items.summary, isAr);

  if (lineItems.length === 0) {
    return <p className={cn(densityModel.lineItemClass, "list-none")}>{linesSummary}</p>;
  }

  const maxVisible = densityModel.maxVisibleLineItems;
  const visible = lineItems.slice(0, maxVisible);
  const overflow = lineItems.length - visible.length;

  return (
    <>
      <ul className="space-y-0" aria-label={isAr ? "عناصر الطلب" : "Order items"}>
        {visible.map((line, index) => {
          const qty = formatOperationalQuantity(Number(line.quantityLabel));
          const name = isAr ? line.nameAr : line.nameEn;
          const isLast = index === visible.length - 1;
          return (
            <li
              key={line.lineItemId}
              className={cn(
                "flex min-w-0 items-start gap-[10px] py-1 first:pt-0",
                !isLast && OPERATIONAL_ITEM_ROW_DIVIDER_CLASS
              )}
            >
              <span
                className={cn(
                  densityModel.quantityColumnClass,
                  densityModel.quantityClass,
                  densityModel.lineItemClass,
                  "pt-0"
                )}
              >
                {qty}
              </span>
              <div className="min-w-0 flex-1">
                <span className={cn(densityModel.lineItemClass, "block truncate")}>{name}</span>
                {line.itemNotes ? (
                  <p
                    className={cn(
                      densityModel.notesClass,
                      "mt-0.5 break-words whitespace-pre-wrap"
                    )}
                  >
                    {line.itemNotes}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {overflow > 0 ? (
        <p className="pt-1 text-xs font-semibold tabular-nums text-muted-foreground">
          {formatOperationalItemOverflow(overflow, isAr)}
        </p>
      ) : null}
    </>
  );
}

function OperationalExecutionFooter({
  presentation,
  isAr,
}: {
  presentation: OrderPresentationModel;
  isAr: boolean;
}) {
  const elapsed = pickLocalizedLabel(presentation.timing.elapsedCompactLabel, isAr);
  const statusLabel = pickLocalizedLabel(presentation.statusLabel, isAr);

  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-x-6"
      aria-label={isAr ? `${elapsed}، ${statusLabel}` : `${elapsed}, ${statusLabel}`}
    >
      <p
        className={cn(
          presentation.timing.elapsedClassName,
          "text-start whitespace-nowrap"
        )}
        aria-label={isAr ? "الوقت المنقضي" : "Elapsed time"}
      >
        {elapsed}
      </p>
      <span className={cn(OPERATIONAL_META_SEPARATOR_CLASS, "self-center")} aria-hidden>
        │
      </span>
      <p className={cn(presentation.emphasis.statusLabelClass, "text-end text-sm font-bold leading-none whitespace-nowrap")}>
        {statusLabel}
      </p>
    </div>
  );
}

export type KitchenExecutionCardProps = {
  presentation: OrderPresentationModel;
  language: string;
  densityModel: PresentationDensityModel;
  fading?: boolean;
  className?: string;
  action?: OperationalAction | null;
  onAction?: (orderId: number, actionId: OperationalAction["id"]) => void;
  actionPending?: boolean;
  actionSucceeded?: boolean;
  onOpenDetails?: (orderId: number) => void;
  selected?: boolean;
};

/**
 * Kitchen execution card — operational ticket surface (header / body / footer).
 * Renders OrderPresentationModel only; presentation formatting lives in the mapper.
 */
function KitchenExecutionCardImpl({
  presentation,
  language,
  densityModel,
  fading,
  className,
  action,
  onAction,
  actionPending,
  actionSucceeded,
  onOpenDetails,
  selected,
}: KitchenExecutionCardProps) {
  recordOrderPerfEvent("card:rendered");
  const isAr = language === "ar";
  const actionLabel = action ? (isAr ? action.labelAr : action.labelEn) : null;
  const hasAction = Boolean(action && onAction);
  const isInteractive = Boolean(onOpenDetails);
  const statusLabel = pickLocalizedLabel(presentation.statusLabel, isAr);
  const delayMessage = pickLocalizedLabel(presentation.delay.message, isAr);
  const fulfillmentLabel = pickLocalizedLabel(presentation.fulfillment.label, isAr);

  function handleTicketKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpenDetails) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetails(presentation.orderId);
    }
  }

  return (
    <article
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden bg-card",
        "rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_14px_rgba(0,0,0,0.06)]",
        "ring-1 ring-border/40 transition-[box-shadow,ring-color] duration-150 touch-manipulation",
        densityModel.cardRadius,
        densityModel.cardPadding,
        densityModel.cardMinHeight,
        presentation.emphasis.cardBorderClass,
        selected && "ring-2 ring-primary/55 shadow-[0_6px_22px_rgba(0,0,0,0.1)]",
        fading && "opacity-60",
        className
      )}
      dir={isAr ? "rtl" : "ltr"}
      aria-label={
        isAr
          ? `طلب ${presentation.identity.displayReference}، ${statusLabel}`
          : `Order ${presentation.identity.displayReference}, ${statusLabel}`
      }
    >
      <div
        className={cn("absolute inset-x-0 top-0 h-0.5", presentation.emphasis.statusAccentClass)}
        aria-hidden
      />

      <div
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={
          isInteractive
            ? isAr
              ? `عرض تفاصيل الطلب ${presentation.identity.displayReference}`
              : `View order ${presentation.identity.displayReference} details`
            : undefined
        }
        onClick={onOpenDetails ? () => onOpenDetails(presentation.orderId) : undefined}
        onKeyDown={handleTicketKeyDown}
        className={cn(
          "flex min-h-0 flex-1 flex-col outline-none",
          isInteractive &&
            "cursor-pointer rounded-lg transition-colors duration-150 hover:bg-muted/20 active:bg-muted/35",
          isInteractive &&
            "focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
        )}
      >
        <header className="mb-1.5 shrink-0 border-b border-border/15 pb-1.5">
          <p className={cn(densityModel.orderNumberClass, "whitespace-nowrap tabular-nums")}>
            {presentation.identity.displayReference}
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col pt-1.5">
          <OperationalItemTable
            presentation={presentation}
            isAr={isAr}
            densityModel={densityModel}
          />

          <p className={cn(densityModel.tableLabelClass, "mt-1")}>{fulfillmentLabel}</p>

          {presentation.notes ? (
            <p className={cn("mt-1.5 flex items-start gap-1.5", densityModel.notesClass)}>
              <StickyNote
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
                aria-hidden
              />
              <span className="line-clamp-3 break-words whitespace-pre-wrap">{presentation.notes}</span>
            </p>
          ) : null}

          {presentation.delay.showWarning ? (
            <p
              className={cn(
                "mt-1.5 flex items-start gap-1.5 rounded px-1.5 py-1",
                densityModel.warningClass,
                presentation.delay.warningTone === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
              )}
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>{delayMessage}</span>
            </p>
          ) : null}
        </div>
      </div>

      <footer className="mt-1 shrink-0 space-y-2 border-t border-border/15 pt-2">
        <OperationalExecutionFooter presentation={presentation} isAr={isAr} />

        {hasAction ? (
          <Button
            type="button"
            size="lg"
            variant={action!.variant === "destructive" ? "destructive" : "default"}
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
              onAction!(presentation.orderId, action!.id);
            }}
            aria-label={actionLabel ?? undefined}
          >
            {actionPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : actionSucceeded ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-5 w-5" aria-hidden />
                {actionLabel}
              </span>
            ) : (
              actionLabel
            )}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}

/**
 * ORDER-INTERACTION-PERFORMANCE-1 — memoized so a ticket re-renders only when
 * its presentation, density, runtime action, or pending state change.
 */
export const KitchenExecutionCard = memo(KitchenExecutionCardImpl);
