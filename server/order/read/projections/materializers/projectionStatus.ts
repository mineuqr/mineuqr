export const ACTIVE_ORDER_STATUSES = ["pending", "preparing", "ready"] as const;

export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];

export function isActiveOrderStatus(status: string): status is ActiveOrderStatus {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function statusBucket(status: string): ActiveOrderStatus | null {
  return isActiveOrderStatus(status) ? status : null;
}

export function dayKeyFromTimestamp(ts: string): string {
  return ts.slice(0, 10);
}
