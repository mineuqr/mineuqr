/**
 * RECOVERY-DISCOVERY-STARVATION-HARDENING-1
 * Active Outbox relay prefers lower publishAttempts so exhausted / poison
 * rows cannot occupy the bounded pending window ahead of newer work.
 * SQL orderBy must match this comparator.
 */
export function comparePendingOutboxForRelay(a: {
  publishAttempts: number;
  occurredAt: string;
  sequenceNumber: number;
}, b: {
  publishAttempts: number;
  occurredAt: string;
  sequenceNumber: number;
}): number {
  if (a.publishAttempts !== b.publishAttempts) {
    return a.publishAttempts - b.publishAttempts;
  }
  if (a.occurredAt !== b.occurredAt) {
    return a.occurredAt < b.occurredAt ? -1 : 1;
  }
  return a.sequenceNumber - b.sequenceNumber;
}
