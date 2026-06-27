/**
 * Controlled async retry policy (generic transport-agnostic helper).
 */
export type TransportExecutionResult = {
  status: "completed" | "failed" | "rejected" | "not-implemented";
  attempts?: number;
  message?: string;
  failureCode?: string;
};

export type TransportFailureCode = string;

export type TransportRetryPolicy = {
  maxAttempts: number;
  delayMs: number;
};

export const DEFAULT_TRANSPORT_RETRY_POLICY: TransportRetryPolicy = {
  maxAttempts: 3,
  delayMs: 50,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverWithTransportRetry(
  deliverAttempt: () => Promise<TransportExecutionResult>,
  policy: TransportRetryPolicy = DEFAULT_TRANSPORT_RETRY_POLICY
): Promise<TransportExecutionResult> {
  let lastResult: TransportExecutionResult | undefined;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const result = await deliverAttempt();
    const annotated: TransportExecutionResult = {
      ...result,
      attempts: attempt,
    };

    if (result.status === "completed") {
      return annotated;
    }

    if (result.status === "rejected" || result.status === "not-implemented") {
      return annotated;
    }

    lastResult = annotated;
    if (attempt < policy.maxAttempts) {
      await sleep(policy.delayMs);
    }
  }

  if (!lastResult) {
    throw new Error("Transport retry policy produced no result");
  }

  if (policy.maxAttempts <= 1) {
    return lastResult;
  }

  const failureCode: TransportFailureCode = "retry-exhausted";
  return {
    ...lastResult,
    status: "failed",
    failureCode,
    attempts: policy.maxAttempts,
    message: lastResult.message ?? "Transport retry exhausted",
  };
}
