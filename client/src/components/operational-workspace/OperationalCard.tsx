/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1
 * Thin facade — Orders Workspace consumes canonical OperationalOrderCard.
 * Preserves prior prop API for call sites.
 */
import { OperationalOrderCard } from "@/design-system/operational-order-card";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import type { OrderPresentationModel } from "@/lib/order-presentation";

export type OperationalCardProps = {
  presentation: OrderPresentationModel;
  language: string;
  currencySymbol?: string;
  onAction?: (orderId: number, actionId: OperationalActionId) => void;
  onOpenDetails?: (orderId: number) => void;
  actionPending?: boolean;
  executionOnly?: boolean;
  className?: string;
  fading?: boolean;
};

export function OperationalCard({
  presentation,
  language,
  currencySymbol,
  onAction,
  onOpenDetails,
  actionPending,
  executionOnly,
  className,
  fading,
}: OperationalCardProps) {
  return (
    <OperationalOrderCard
      presentation={presentation}
      language={language}
      currencySymbol={currencySymbol}
      density="comfortable"
      domain="orders"
      showFinancial
      showCustomer
      showSlaTimeline
      showExecutionFooter={false}
      actionMode="multi"
      onAction={onAction}
      onOpenDetails={onOpenDetails}
      actionPending={actionPending}
      executionOnly={executionOnly}
      fading={fading}
      className={className}
    />
  );
}
