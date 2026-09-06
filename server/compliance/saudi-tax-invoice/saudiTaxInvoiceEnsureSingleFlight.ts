/**
 * CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1
 * Process-local single-flight for Tax Invoice ensure by collectionFactId.
 * Collapses concurrent background + Cashier read-path ensure on one isolate.
 */

const inflight = new Map<string, Promise<unknown>>();

export function runSaudiTaxInvoiceEnsureSingleFlight<T>(
  key: string,
  work: () => Promise<T>
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const pending = work().finally(() => {
    if (inflight.get(key) === pending) {
      inflight.delete(key);
    }
  });
  inflight.set(key, pending);
  return pending;
}

/** Test helper */
export function clearSaudiTaxInvoiceEnsureSingleFlightForTests(): void {
  inflight.clear();
}
