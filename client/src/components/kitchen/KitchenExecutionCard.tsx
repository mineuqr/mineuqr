/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1
 * Thin facade — Kitchen / Expo consume canonical OperationalOrderCard.
 * Preserves prior prop API for KitchenScreenPanel.
 */
import { OperationalOrderCard } from "@/design-system/operational-order-card";
import type { PresentationDensityModel } from "@/lib/operational-screen/density/runtimeDisplayDensityContract";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import type { OrderPresentationModel } from "@/lib/order-presentation";

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

export function KitchenExecutionCard({
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
  const singleAction = action
    ? {
        id: action.id,
        label: { en: action.labelEn, ar: action.labelAr },
        variant: action.variant,
      }
    : null;

  return (
    <OperationalOrderCard
      presentation={presentation}
      language={language}
      density="kitchen"
      densityModel={densityModel}
      domain="kitchen"
      showFinancial={false}
      showCustomer={false}
      showSlaTimeline={false}
      showExecutionFooter
      actionMode={action && onAction ? "single" : "none"}
      singleAction={singleAction}
      onAction={onAction}
      onOpenDetails={onOpenDetails}
      actionPending={actionPending}
      actionSucceeded={actionSucceeded}
      selected={selected}
      fading={fading}
      className={className}
    />
  );
}
