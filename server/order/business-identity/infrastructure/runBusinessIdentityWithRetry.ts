import {
  BUSINESS_IDENTITY_RETRY_POLICY,
  computeBusinessIdentityRetryDelayMs,
  sleepMs,
} from "../config/businessIdentityRetryPolicy";
import {
  classifyBusinessIdentityInfrastructureError,
  isRetryableBusinessIdentityInfrastructureError,
} from "./mysqlInfrastructureErrors";
import type { BusinessIdentityMetrics } from "../observability/BusinessIdentityMetrics";
import {
  logBusinessIdentityAssignmentRetry,
  logBusinessIdentityDeadlock,
  logBusinessIdentityFailed,
  logBusinessIdentityUniqueConstraintRetry,
  type BusinessIdentityLogContext,
} from "../observability/businessIdentityObservability";

export async function runBusinessIdentityWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  ctx: BusinessIdentityLogContext,
  metrics: BusinessIdentityMetrics
): Promise<T> {
  const { maxAttempts } = BUSINESS_IDENTITY_RETRY_POLICY;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const kind = classifyBusinessIdentityInfrastructureError(error);
      const retryable =
        isRetryableBusinessIdentityInfrastructureError(error) && attempt < maxAttempts;

      if (!retryable) {
        metrics.recordFailure();
        logBusinessIdentityFailed({
          ...ctx,
          attempt,
          errorKind: kind,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      metrics.recordRetry();
      if (kind === "deadlock") {
        metrics.recordDeadlock();
        logBusinessIdentityDeadlock({
          ...ctx,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
      } else if (kind === "unique_violation") {
        metrics.recordUniqueConstraintRetry();
        logBusinessIdentityUniqueConstraintRetry({
          ...ctx,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      logBusinessIdentityAssignmentRetry({
        ...ctx,
        attempt,
        errorKind: kind,
        error: error instanceof Error ? error.message : String(error),
      });

      await sleepMs(computeBusinessIdentityRetryDelayMs(attempt));
    }
  }

  metrics.recordFailure();
  logBusinessIdentityFailed({
    ...ctx,
    attempt: maxAttempts,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError;
}
