/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1 — sale latency correction.
 * Defers outbox relay off the HTTP path; does not drop relay or rewrite Order.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RELAY_DELAY_MS = 200;

vi.mock("../../order/eventInfrastructureComposition", () => ({
  runOrderEventRelayBatch: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, RELAY_DELAY_MS));
    return { processed: 1, published: 1, failed: 0, skipped: 0 };
  }),
}));

import { runOrderCommand } from "../../order/application/mapOrderDomainError";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("POS sale latency — deferred outbox relay", () => {
  it("keeps persist-path awaited and only defers relay on pos.sale.create", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const runCmd = read("server/order/application/mapOrderDomainError.ts");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("const stored = await this.idempotency.get");
    expect(sale).toContain("afterPersistInTransaction");
    expect(read("server/order/application/PlaceOrderService.ts")).not.toContain(
      "const accepted = await this.repository.save"
    );
    expect(sale).toContain("runOrderCommand");
    expect(runCmd).toContain("scheduleOrderEventRelay");
    expect(runCmd).toContain("runOrderEventRelayBatch");
    expect(runCmd).not.toContain("awaitRelay: true");
  });

  it("returns before the relay batch when awaitRelay is false", async () => {
    const awaitedStarted = Date.now();
    await runOrderCommand(async () => "ok");
    const awaitedMs = Date.now() - awaitedStarted;

    const deferredStarted = Date.now();
    await runOrderCommand(async () => "ok", { awaitRelay: false });
    const deferredMs = Date.now() - deferredStarted;

    expect(awaitedMs).toBeGreaterThanOrEqual(RELAY_DELAY_MS - 20);
    expect(deferredMs).toBeLessThan(RELAY_DELAY_MS / 2);
    expect(deferredMs).toBeLessThan(awaitedMs);
    await new Promise((resolve) => setTimeout(resolve, RELAY_DELAY_MS + 30));
  });
});
