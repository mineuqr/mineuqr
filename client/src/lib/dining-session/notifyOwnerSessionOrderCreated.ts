import { publishSessionOrderCreated } from "@/lib/order-lifecycle-latency/orderLifecycleBroadcast";

export function isOwnerSessionRefreshTarget(input: {
  restaurantId: number;
  openSessionId: number;
  messageRestaurantId: number;
  messageSessionId: number;
}): boolean {
  return (
    input.restaurantId === input.messageRestaurantId &&
    input.openSessionId === input.messageSessionId &&
    input.openSessionId > 0
  );
}

/**
 * SESSION-ORDER-REALTIME-REFRESH-1 — fire-and-forget same-origin hint.
 * Must never throw: Order persistence already succeeded.
 */
export function notifyOwnerSessionOrderCreated(input: {
  restaurantId: number;
  sessionId?: number | null;
  orderId?: number | null;
}): void {
  try {
    if (
      !Number.isInteger(input.restaurantId) ||
      input.restaurantId <= 0 ||
      input.sessionId == null ||
      !Number.isInteger(input.sessionId) ||
      input.sessionId <= 0
    ) {
      return;
    }
    publishSessionOrderCreated({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      orderId:
        input.orderId != null && Number.isInteger(input.orderId) && input.orderId > 0
          ? input.orderId
          : 0,
    });
  } catch {
    /* refresh must not fail Order creation */
  }
}
