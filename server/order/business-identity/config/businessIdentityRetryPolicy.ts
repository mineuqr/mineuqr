/**
 * Centralized retry configuration for Business Identity infrastructure.
 * ORDER-BUSINESS-IDENTITY-HARDENING-1
 */
export const BUSINESS_IDENTITY_RETRY_POLICY = {
  maxAttempts: 5,
  initialDelayMs: 25,
  maxDelayMs: 500,
  backoffMultiplier: 2,
} as const;

export function computeBusinessIdentityRetryDelayMs(attempt: number): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier } = BUSINESS_IDENTITY_RETRY_POLICY;
  const delay = initialDelayMs * backoffMultiplier ** Math.max(0, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
