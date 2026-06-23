/**
 * THERMAL-PRINTING-13H.5 — in-process dispatch idempotency (Print Host runtime).
 *
 * Tracks jobs for which a successful agent notification was already sent so
 * duplicate dispatch requests return `already_processed` without re-notifying.
 */
const notifiedJobIds = new Set<number>();

export function hasDispatchNotificationBeenSent(jobId: number): boolean {
  return notifiedJobIds.has(jobId);
}

export function recordDispatchNotificationSent(jobId: number): void {
  notifiedJobIds.add(jobId);
}

export function clearDispatchBridgeState(): void {
  notifiedJobIds.clear();
}
