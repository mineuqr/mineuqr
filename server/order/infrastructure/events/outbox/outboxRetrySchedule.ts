/**
 * Shared Outbox retry delay. Used by the relay and failed→pending requeue.
 * Do not introduce a second scheduler.
 */
export const OUTBOX_BASE_RETRY_MS = 5_000;

export function computeRetryDelayMs(attempt: number): number {
  const exponent = Math.min(Math.max(0, attempt - 1), 12);
  return OUTBOX_BASE_RETRY_MS * 2 ** exponent;
}

export function formatOutboxRetryAt(atMs: number): string {
  return new Date(atMs).toISOString().slice(0, 19).replace("T", " ");
}

export function nextOutboxRequeueRetryAt(
  publishAttempts: number,
  nowMs = Date.now()
): string {
  return formatOutboxRetryAt(
    nowMs + computeRetryDelayMs(Math.max(publishAttempts, 1))
  );
}
