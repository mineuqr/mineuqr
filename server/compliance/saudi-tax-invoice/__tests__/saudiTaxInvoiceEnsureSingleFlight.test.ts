/**
 * CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1 — single-flight ensure.
 */
import { describe, expect, it, vi } from "vitest";
import {
  clearSaudiTaxInvoiceEnsureSingleFlightForTests,
  runSaudiTaxInvoiceEnsureSingleFlight,
} from "../saudiTaxInvoiceEnsureSingleFlight";

describe("saudiTaxInvoiceEnsureSingleFlight", () => {
  it("shares one in-flight promise per key", async () => {
    clearSaudiTaxInvoiceEnsureSingleFlightForTests();
    let starts = 0;
    const work = vi.fn(async () => {
      starts += 1;
      await new Promise((r) => setTimeout(r, 40));
      return starts;
    });

    const [a, b] = await Promise.all([
      runSaudiTaxInvoiceEnsureSingleFlight("k1", work),
      runSaudiTaxInvoiceEnsureSingleFlight("k1", work),
    ]);

    expect(work).toHaveBeenCalledTimes(1);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});
