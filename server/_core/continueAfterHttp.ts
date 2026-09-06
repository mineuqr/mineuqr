/**
 * CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1
 * Keep post-response work alive on Vercel when waitUntil is available.
 * Falls back to void promise continuation elsewhere.
 * Does not change financial commit semantics.
 */

export function continueAfterHttp(work: () => Promise<void>): void {
  const run = work();
  void run.catch(() => {
    /* failures are handled inside work() */
  });
  void import("@vercel/functions")
    .then((mod) => {
      const waitUntil = (
        mod as { waitUntil?: (promise: Promise<unknown>) => void }
      ).waitUntil;
      if (typeof waitUntil === "function") {
        waitUntil(run);
      }
    })
    .catch(() => {
      /* package / runtime absent — best-effort void only */
    });
}
