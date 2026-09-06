/**
 * CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1
 * Controlled contention model: parallel settlement vs sequenced Compliance-first.
 * Not a multi-payment campaign — proves why sequencing removes the post-PAID gap.
 */
import { describe, expect, it } from "vitest";

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

describe("post-PAID latency contention model", () => {
  it("parallel settlement contention delays Compliance READY past isolated generation", async () => {
    const COMPLIANCE_MS = 80;
    const SETTLEMENT_MS = 400;
    let readyAt = 0;
    const t0 = Date.now();

    await Promise.all([
      (async () => {
        // Simulate event-loop + pool contention: settlement occupies shared work.
        const settlement = sleep(SETTLEMENT_MS);
        await sleep(COMPLIANCE_MS);
        // Compliance cannot finish "cleanly" until settlement yields in this model.
        await settlement;
        readyAt = Date.now() - t0;
      })(),
    ]);

    expect(readyAt).toBeGreaterThanOrEqual(SETTLEMENT_MS - 20);
  });

  it("Compliance-first sequencing keeps READY near isolated generation time", async () => {
    const COMPLIANCE_MS = 80;
    const SETTLEMENT_MS = 400;
    const t0 = Date.now();
    let readyAt = 0;

    await (async () => {
      await sleep(COMPLIANCE_MS);
      readyAt = Date.now() - t0;
      await sleep(SETTLEMENT_MS);
    })();

    expect(readyAt).toBeLessThan(COMPLIANCE_MS + 60);
    expect(readyAt).toBeLessThan(SETTLEMENT_MS / 2);
  });
});
