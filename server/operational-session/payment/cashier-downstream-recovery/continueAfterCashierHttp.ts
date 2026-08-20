/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-2
 * Best-effort continuation after HTTP. Not the durable recovery mechanism.
 */

export function continueAfterCashierHttp(work: Promise<unknown>): void {
  const importer = new Function(
    "specifier",
    "return import(specifier)"
  ) as (specifier: string) => Promise<{
    waitUntil?: (work: Promise<unknown>) => void;
  }>;
  void importer("@vercel/functions")
    .then((mod) => {
      if (typeof mod.waitUntil === "function") {
        mod.waitUntil(work);
        return;
      }
      void work;
    })
    .catch(() => {
      void work;
    });
}
