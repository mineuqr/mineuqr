/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1
 * Canonical Operational Order Card — presentation infrastructure only.
 *
 * Canonical hierarchy:
 *   Header → Status row → Items → Order notes → Financial → Actions
 */
import { memo, type KeyboardEvent } from "react";
import {
  SEMANTIC_MOTION_PREMIUM,
  SEMANTIC_SURFACE_PREMIUM,
  semanticDomainReportingSurfaceClass,
  type SemanticDomain,
} from "@/design-system/semantic-card";
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import type {
  OrderPresentationAction,
  OrderPresentationModel,
} from "@/lib/order-presentation";
import { pickLocalizedLabel, recordOrderPerfEvent } from "@/lib/order-presentation";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import { cn } from "@/lib/utils";
import {
  resolveOperationalOrderDensity,
  type OperationalOrderDensity,
} from "../tokens/density";
import { OperationalOrderActions } from "./OperationalOrderActions";
import { OperationalOrderDelay } from "./OperationalOrderDelay";
import { OperationalOrderFooter } from "./OperationalOrderFooter";
import { OperationalOrderHeader } from "./OperationalOrderHeader";
import { OperationalOrderItems } from "./OperationalOrderItems";
import { OperationalOrderNotes } from "./OperationalOrderNotes";
import { OperationalOrderPriority } from "./OperationalOrderPriority";
import { OperationalOrderStatus } from "./OperationalOrderStatus";
import { OperationalOrderTimeline } from "./OperationalOrderTimeline";

export type OperationalOrderCardProps = {
  presentation: OrderPresentationModel;
  language: string;
  density?: OperationalOrderDensity;
  /** Kitchen runtime density class overrides (optional). */
  densityModel?: PresentationDensityModel;
  domain?: Extract<SemanticDomain, "orders" | "kitchen" | "analytics">;
  currencySymbol?: string;
  showFinancial?: boolean;
  showCustomer?: boolean;
  /** Kitchen-style footer meta (elapsed │ status text). Default true for kitchen density. */
  showExecutionFooter?: boolean;
  /** Full SLA timeline in status row (Orders). */
  showSlaTimeline?: boolean;
  actionMode?: "multi" | "single" | "none";
  singleAction?: OrderPresentationAction | null;
  onAction?: (orderId: number, actionId: OperationalActionId) => void;
  onOpenDetails?: (orderId: number) => void;
  actionPending?: boolean;
  actionSucceeded?: boolean;
  /** Hide actions; still show structured items (Orders drawer). */
  executionOnly?: boolean;
  selected?: boolean;
  fading?: boolean;
  className?: string;
  /** Optional line prices (Waiter / Dashboard). */
  linePrices?: ReadonlyMap<number, string>;
};

function OperationalOrderCardImpl({
  presentation,
  language,
  density = "comfortable",
  densityModel,
  domain = "orders",
  currencySymbol,
  showFinancial = false,
  showCustomer = false,
  showExecutionFooter,
  showSlaTimeline,
  actionMode = "multi",
  singleAction = null,
  onAction,
  onOpenDetails,
  actionPending,
  actionSucceeded,
  executionOnly,
  selected,
  fading,
  className,
  linePrices,
}: OperationalOrderCardProps) {
  recordOrderPerfEvent("card:rendered");
  const isAr = language === "ar";
  const tokens = resolveOperationalOrderDensity(density, densityModel);
  const statusLabel = pickLocalizedLabel(presentation.statusLabel, isAr);
  const resolvedActionMode = executionOnly || fading ? "none" : actionMode;
  const useExecutionFooter =
    showExecutionFooter ?? (density === "kitchen" || density === "large-display");
  const useSlaTimeline =
    showSlaTimeline ?? (density === "comfortable" || density === "compact");
  const isInteractive = Boolean(onOpenDetails);

  function handleTicketKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpenDetails) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetails(presentation.orderId);
    }
  }

  return (
    <article
      data-slot="operational-order-card"
      data-domain={domain}
      data-density={density}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden",
        SEMANTIC_SURFACE_PREMIUM,
        "rounded-xl",
        semanticDomainReportingSurfaceClass(domain),
        SEMANTIC_MOTION_PREMIUM,
        tokens.cardRadius,
        tokens.cardPadding,
        tokens.cardMinHeight,
        presentation.emphasis.cardBorderClass,
        selected && "border-cyan-400/50 shadow-sm shadow-cyan-500/15",
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
        {/* 1. HEADER */}
        <OperationalOrderHeader
          presentation={presentation}
          isAr={isAr}
          orderNumberClass={tokens.orderNumberClass}
          tableLabelClass={tokens.tableLabelClass}
          showCustomer={showCustomer}
        />

        {/* 2. STATUS / PRIORITY / TIME */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <OperationalOrderStatus presentation={presentation} isAr={isAr} />
          <OperationalOrderPriority presentation={presentation} isAr={isAr} />
          {useSlaTimeline ? (
            <div className="ms-auto">
              <OperationalOrderTimeline presentation={presentation} isAr={isAr} />
            </div>
          ) : null}
        </div>

        {/* 3. ITEMS (scrollable) */}
        <div className="flex min-h-0 flex-1 flex-col pt-1">
          <OperationalOrderItems
            presentation={presentation}
            isAr={isAr}
            lineItemClass={tokens.lineItemClass}
            quantityClass={tokens.quantityClass}
            quantityColumnClass={tokens.quantityColumnClass}
            notesClass={tokens.notesClass}
            itemsScrollClass={tokens.itemsScrollClass}
            linePrices={linePrices}
          />

          {/* 4. ORDER NOTES */}
          <OperationalOrderNotes
            notes={presentation.notes}
            notesClass={tokens.notesClass}
            variant="order"
          />

          <OperationalOrderDelay
            presentation={presentation}
            isAr={isAr}
            warningClass={tokens.warningClass}
          />

          {/* 5. FINANCIAL */}
          {showFinancial && presentation.totalAmount ? (
            <p className="mt-2 text-lg font-semibold tabular-nums">
              {presentation.totalAmount}
              {currencySymbol ? ` ${currencySymbol}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {/* 6. FOOTER / ACTIONS — persistent */}
      <footer className="mt-1 shrink-0 space-y-2 border-t border-border/15 pt-2">
        {useExecutionFooter ? (
          <OperationalOrderFooter presentation={presentation} isAr={isAr} />
        ) : null}
        <OperationalOrderActions
          presentation={presentation}
          isAr={isAr}
          mode={resolvedActionMode}
          singleAction={singleAction}
          onAction={onAction}
          actionPending={actionPending}
          actionSucceeded={actionSucceeded}
        />
        {executionOnly ? (
          <p className="text-xs text-muted-foreground">
            {isAr ? "إدارة الطلب من مساحة الطلبات" : "Manage order from Orders Workspace"}
          </p>
        ) : null}
      </footer>
    </article>
  );
}

export const OperationalOrderCard = memo(OperationalOrderCardImpl);
