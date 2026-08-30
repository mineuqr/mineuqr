/**
 * RECOVERY-RESILIENCE-AND-DURABILITY-HARDENING-1 Phase 2
 * Deterministic Outbox poison. Do not classify generic publisher Errors as poison.
 * lastError prefix persists the typed classification without a schema change.
 */
export const OUTBOX_POISON_LAST_ERROR_PREFIX = "POISON:" as const;

export class OutboxPoisonError extends Error {
  readonly code = "OUTBOX_POISON" as const;

  constructor(message: string) {
    super(message);
    this.name = "OutboxPoisonError";
  }
}

export function isOutboxPoisonError(err: unknown): err is OutboxPoisonError {
  return err instanceof OutboxPoisonError;
}

export function formatOutboxPoisonLastError(message: string): string {
  const body = message.slice(0, 4000 - OUTBOX_POISON_LAST_ERROR_PREFIX.length);
  return `${OUTBOX_POISON_LAST_ERROR_PREFIX}${body}`;
}

export function isOutboxPoisonLastError(lastError: string | null): boolean {
  return lastError != null && lastError.startsWith(OUTBOX_POISON_LAST_ERROR_PREFIX);
}
