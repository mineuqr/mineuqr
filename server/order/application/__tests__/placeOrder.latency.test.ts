/**
 * ORDER-SUBMISSION-LATENCY-REMEDIATION-1
 * Place-order HTTP must return before the outbox relay batch completes.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RELAY_DELAY_MS = 200;

const relay = vi.hoisted(() => ({
  runOrderEventRelayBatch: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, RELAY_DELAY_MS));
    return { processed: 1, published: 1, failed: 0, skipped: 0 };
  }),
}));

vi.mock("../../eventInfrastructureComposition", () => ({
  runOrderEventRelayBatch: () => relay.runOrderEventRelayBatch(),
}));

import { runOrderCommand } from "../mapOrderDomainError";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-SUBMISSION-LATENCY-REMEDIATION-1 — deferred place-order relay", () => {
  it("returns before a mocked 200ms relay and still schedules the batch", async () => {
    relay.runOrderEventRelayBatch.mockClear();
    const started = Date.now();
    const result = await runOrderCommand(async () => "placed", {
      awaitRelay: false,
    });
    const elapsedMs = Date.now() - started;

    expect(result).toBe("placed");
    expect(elapsedMs).toBeLessThan(RELAY_DELAY_MS / 2);
    expect(relay.runOrderEventRelayBatch).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, RELAY_DELAY_MS + 40));
    expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(1);
  });

  it("awaitRelay skip leaves relay for the caller", async () => {
    relay.runOrderEventRelayBatch.mockClear();
    await runOrderCommand(async () => "placed", { awaitRelay: "skip" });
    await new Promise((resolve) => setTimeout(resolve, RELAY_DELAY_MS + 40));
    expect(relay.runOrderEventRelayBatch).not.toHaveBeenCalled();
  });

  it("place-order entry points opt out of awaited relay", () => {
    const routers = read("server/routers.ts");
    const waiterDevice = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    const createStart = routers.indexOf("  create: publicProcedure");
    const createFn = routers.slice(
      createStart,
      routers.indexOf("  list: verifiedProcedure", createStart)
    );
    const identityFn = routers.slice(
      routers.indexOf("placeWithIdentity:"),
      routers.indexOf("placeAsWaiter:")
    );
    const waiterFn = routers.slice(
      routers.indexOf("placeAsWaiter:"),
      routers.indexOf("  create: publicProcedure")
    );
    expect(createFn).toContain("{ awaitRelay: false }");
    expect(identityFn).toContain("{ awaitRelay: false }");
    expect(waiterFn).toContain("{ awaitRelay: false }");
    expect(waiterDevice).toContain("{ awaitRelay: false }");
  });
});
