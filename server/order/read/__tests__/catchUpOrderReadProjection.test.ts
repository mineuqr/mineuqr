import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const relay = vi.hoisted(() => ({
  runOrderEventRelayBatch: vi.fn(),
}));

vi.mock("../../eventInfrastructureComposition", () => ({
  runOrderEventRelayBatch: (...args: unknown[]) =>
    relay.runOrderEventRelayBatch(...args),
}));

import { catchUpOrderReadProjection } from "../catchUpOrderReadProjection";

describe("catchUpOrderReadProjection", () => {
  beforeEach(() => {
    relay.runOrderEventRelayBatch.mockReset();
  });

  it("drains full relay batches then stops on a short batch", async () => {
    relay.runOrderEventRelayBatch
      .mockResolvedValueOnce({ processed: 50, published: 50, failed: 0, skipped: 0 })
      .mockResolvedValueOnce({ processed: 3, published: 3, failed: 0, skipped: 0 });

    await catchUpOrderReadProjection();

    expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(2);
    expect(relay.runOrderEventRelayBatch).toHaveBeenCalledWith(50);
  });

  it("fails open when relay throws", async () => {
    relay.runOrderEventRelayBatch.mockRejectedValue(new Error("relay down"));
    await expect(catchUpOrderReadProjection()).resolves.toBeUndefined();
  });

  it("does not create Collection Fact or a second Order", async () => {
    const src = readFileSync(
      join(__dirname, "../catchUpOrderReadProjection.ts"),
      "utf8"
    );
    expect(src).toContain("runOrderEventRelayBatch");
    expect(src).not.toContain("commitCollectionFact");
    expect(src).not.toContain("placeOrder");
    expect(src).not.toContain("confirmPayment");
  });
});
