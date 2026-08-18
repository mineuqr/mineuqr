/**
 * CASHIER-PAYMENT-FLOW-BOUNDARY-INSTRUMENTATION-1
 * Elapsed-time helper for POS command duration metadata.
 * Not a logging framework. Does not persist business state.
 */

export function startPosCommandClock(): {
  startedAt: string;
  startedMs: number;
  mark: () => number;
  since: (fromMs: number) => number;
  finish: () => {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
} {
  const startedMs = Date.now();
  const startedAt = new Date(startedMs).toISOString();
  return {
    startedAt,
    startedMs,
    mark: () => Date.now(),
    since: (fromMs: number) => Date.now() - fromMs,
    finish: () => {
      const completedMs = Date.now();
      return {
        startedAt,
        completedAt: new Date(completedMs).toISOString(),
        durationMs: completedMs - startedMs,
      };
    },
  };
}
