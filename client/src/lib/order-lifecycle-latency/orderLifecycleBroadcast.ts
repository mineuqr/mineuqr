/**
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1
 * Same-origin observer fan-out (Mode A) without introducing WebSocket infra.
 * Polling remains the cross-device fallback.
 *
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Publisher tags messages with publisherId; subscribers ignore self to avoid
 * same-tab invalidate storms on top of the mutation's own invalidate.
 */
export type OrderLifecycleBroadcastMessage = {
  type: "order_status_changed";
  restaurantId: number;
  orderId: number;
  status: string;
  at: number;
  /** Opaque tab/instance id — omit treated as foreign. */
  publisherId?: string;
};

/** Same-origin Session owner refresh after QR/table order.create. */
export type SessionOrderCreatedBroadcastMessage = {
  type: "session_order_created";
  restaurantId: number;
  sessionId: number;
  orderId: number;
  at: number;
  publisherId?: string;
};

const CHANNEL = "mineuqr:order-lifecycle";

let localPublisherId: string | null = null;

function getLocalPublisherId(): string {
  if (localPublisherId) return localPublisherId;
  try {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    localPublisherId = cryptoObj?.randomUUID?.() ?? `tab_${Date.now()}_${Math.random()}`;
  } catch {
    localPublisherId = `tab_${Date.now()}_${Math.random()}`;
  }
  return localPublisherId;
}

export function publishOrderLifecycleUpdate(
  message: Omit<OrderLifecycleBroadcastMessage, "publisherId"> & {
    publisherId?: string;
  }
): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({
      ...message,
      publisherId: message.publisherId ?? getLocalPublisherId(),
    } satisfies OrderLifecycleBroadcastMessage);
    channel.close();
  } catch {
    /* private mode / unsupported */
  }
}

export function subscribeOrderLifecycleUpdates(
  restaurantId: number,
  onMessage: (message: OrderLifecycleBroadcastMessage) => void,
  options?: { ignoreSelf?: boolean }
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const ignoreSelf = options?.ignoreSelf !== false;
  const selfId = getLocalPublisherId();
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<OrderLifecycleBroadcastMessage>) => {
      const data = event.data;
      if (!data || data.type !== "order_status_changed") return;
      if (data.restaurantId !== restaurantId) return;
      if (ignoreSelf && data.publisherId && data.publisherId === selfId) return;
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

export function publishSessionOrderCreated(
  message: Omit<SessionOrderCreatedBroadcastMessage, "type" | "at" | "publisherId"> & {
    publisherId?: string;
    at?: number;
  }
): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({
      type: "session_order_created",
      restaurantId: message.restaurantId,
      sessionId: message.sessionId,
      orderId: message.orderId,
      at: message.at ?? Date.now(),
      publisherId: message.publisherId ?? getLocalPublisherId(),
    } satisfies SessionOrderCreatedBroadcastMessage);
    channel.close();
  } catch {
    /* private mode / unsupported */
  }
}

export function subscribeSessionOrderCreated(
  restaurantId: number,
  onMessage: (message: SessionOrderCreatedBroadcastMessage) => void
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (
      event: MessageEvent<SessionOrderCreatedBroadcastMessage>
    ) => {
      const data = event.data;
      if (!data || data.type !== "session_order_created") return;
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
