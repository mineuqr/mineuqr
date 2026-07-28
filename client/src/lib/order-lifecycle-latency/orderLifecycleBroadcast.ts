/**
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1
 * Same-origin observer fan-out (Mode A) without introducing WebSocket infra.
 * Polling remains the cross-device fallback.
 */
export type OrderLifecycleBroadcastMessage = {
  type: "order_status_changed";
  restaurantId: number;
  orderId: number;
  status: string;
  at: number;
};

const CHANNEL = "mineuqr:order-lifecycle";

export function publishOrderLifecycleUpdate(
  message: OrderLifecycleBroadcastMessage
): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* private mode / unsupported */
  }
}

export function subscribeOrderLifecycleUpdates(
  restaurantId: number,
  onMessage: (message: OrderLifecycleBroadcastMessage) => void
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<OrderLifecycleBroadcastMessage>) => {
      const data = event.data;
      if (!data || data.type !== "order_status_changed") return;
      if (data.restaurantId !== restaurantId) return;
      onMessage(data);
    };
    return () => {
      try {
        channel.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}
