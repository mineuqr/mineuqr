/**
 * ORDER-LINKED-SESSION-1 — table ordering session consumption (client-only, localStorage).
 */

export type OrderingSessionRecord = {
  orderingSessionConsumed: true;
  trackingToken: string;
  orderNumber?: string;
  consumedAt: string;
};

const PREFIX = "mineuqr:ordering-session:";

export function orderingSessionStorageKey(slug: string, tableNumber: number): string {
  return `${PREFIX}${slug}:${tableNumber}`;
}

export function loadOrderingSession(
  slug: string,
  tableNumber: number
): OrderingSessionRecord | null {
  if (!slug || tableNumber <= 0 || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(orderingSessionStorageKey(slug, tableNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrderingSessionRecord>;
    if (!parsed.orderingSessionConsumed || !parsed.trackingToken) return null;
    return {
      orderingSessionConsumed: true,
      trackingToken: parsed.trackingToken,
      orderNumber: parsed.orderNumber,
      consumedAt: parsed.consumedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function isOrderingSessionConsumed(slug: string, tableNumber: number): boolean {
  return loadOrderingSession(slug, tableNumber) !== null;
}

export function markOrderingSessionConsumed(
  slug: string,
  tableNumber: number,
  options: { trackingToken: string; orderNumber?: string }
): void {
  if (!slug || tableNumber <= 0 || !options.trackingToken) return;
  const record: OrderingSessionRecord = {
    orderingSessionConsumed: true,
    trackingToken: options.trackingToken,
    orderNumber: options.orderNumber,
    consumedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(orderingSessionStorageKey(slug, tableNumber), JSON.stringify(record));
  } catch {
    /* private mode / quota */
  }
}

/** For tests. */
export function resetOrderingSessionsForTests(): void {
  if (typeof localStorage === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
