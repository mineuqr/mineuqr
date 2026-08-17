/**
 * ORDERS-POS-KITCHEN-LIFECYCLE-1
 * Cashier/POS uses the existing Order lifecycle. Confirm Sale is inbound
 * acceptance; remaining operational completion is served (تم التقديم).
 */
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import type { OrderStatus } from "../domain/value-objects/OrderStatus";

export function isCashierPosOrderingChannel(
  channel: string | null | undefined
): boolean {
  return channel === ORDERING_CHANNEL_CASHIER_POS;
}

/** Existing Accept Order transition — pending → preparing. */
export const CASHIER_POS_INBOUND_STATUS: OrderStatus = "preparing";

const SERVE_WALK: Record<
  Exclude<OrderStatus, "served" | "cancelled">,
  OrderStatus
> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

export function nextCashierPosServeStep(
  status: OrderStatus
): OrderStatus | null {
  if (status === "served" || status === "cancelled") return null;
  return SERVE_WALK[status];
}
