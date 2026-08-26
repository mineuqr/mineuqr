/**
 * ORDERS-SERVE-ACTION-UX-AND-STATE-FIX-1
 * Confirmed terminal cashier_pos serve must not reappear as an actionable card.
 */
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { getOrderStatusWriteConfirmation } from "@shared/read-freshness";

export function retainCashierPosOperationalGraceItem(order: {
  orderId: number;
  orderingChannel?: string | null;
  status?: string;
}): boolean {
  if (order.orderingChannel !== ORDERING_CHANNEL_CASHIER_POS) return true;
  const confirmed = getOrderStatusWriteConfirmation(order.orderId);
  const status = confirmed?.status ?? order.status;
  return status !== "served" && status !== "cancelled";
}
