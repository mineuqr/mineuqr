/** TRACKING-EXPIRY-1 — server-authoritative customer tracking window after READY. */

export const TRACKING_EXPIRY_AFTER_READY_MS = 12 * 60 * 1000;

/** Parse orders table naive datetime (`YYYY-MM-DD HH:mm:ss`). */
export function parseOrderTimestamp(value: string): number {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return new Date(normalized).getTime();
}

export function isTrackingExpired(
  readyAt: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!readyAt) return false;
  const readyMs = parseOrderTimestamp(readyAt);
  if (Number.isNaN(readyMs)) return false;
  return nowMs > readyMs + TRACKING_EXPIRY_AFTER_READY_MS;
}
