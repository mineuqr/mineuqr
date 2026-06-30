export type ReconnectPolicyConfig = {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
};

const DEFAULT_CONFIG: ReconnectPolicyConfig = {
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  maxAttempts: 12,
};

/**
 * Exponential backoff for RLC reconnect attempts (client-side policy definition).
 */
export class ConnectorReconnectPolicy {
  constructor(private readonly config: ReconnectPolicyConfig = DEFAULT_CONFIG) {}

  nextDelayMs(attempt: number): number {
    const exponent = Math.max(0, attempt - 1);
    const delay = this.config.baseDelayMs * 2 ** exponent;
    return Math.min(delay, this.config.maxDelayMs);
  }

  shouldRetry(attempt: number): boolean {
    return attempt <= this.config.maxAttempts;
  }

  get maxAttempts(): number {
    return this.config.maxAttempts;
  }
}
