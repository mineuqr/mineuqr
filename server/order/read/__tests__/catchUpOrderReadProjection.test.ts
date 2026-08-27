import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("coalesces concurrent callers onto one bounded drain", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    relay.runOrderEventRelayBatch.mockImplementation(async () => {
      await gate;
      return { processed: 0, published: 0, failed: 0, skipped: 0 };
    });

    const waiters = [
      catchUpOrderReadProjection(),
      catchUpOrderReadProjection(),
      catchUpOrderReadProjection(),
      catchUpOrderReadProjection(),
      catchUpOrderReadProjection(),
    ];
    await vi.waitFor(() => {
      expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(1);
    });

    release();
    await Promise.all(waiters);

    expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(1);
  });

  it("does not poison the next read after a failed drain", async () => {
    relay.runOrderEventRelayBatch
      .mockRejectedValueOnce(new Error("relay down"))
      .mockResolvedValueOnce({ processed: 0, published: 0, failed: 0, skipped: 0 });

    await expect(catchUpOrderReadProjection()).resolves.toBeUndefined();
    await expect(catchUpOrderReadProjection()).resolves.toBeUndefined();

    expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(2);
  });

  it("starts a new drain after the previous flight completes", async () => {
    relay.runOrderEventRelayBatch.mockResolvedValue({
      processed: 0,
      published: 0,
      failed: 0,
      skipped: 0,
    });

    await catchUpOrderReadProjection();
    await catchUpOrderReadProjection();

    expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(2);
  });

  it("does not create Collection Fact or a second Order", async () => {
    const src = readFileSync(
      join(__dirname, "../catchUpOrderReadProjection.ts"),
      "utf8"
    );
    expect(src).toContain("runOrderEventRelayBatch");
    expect(src).toContain("inflight");
    expect(src).not.toContain("commitCollectionFact");
    expect(src).not.toContain("placeOrder");
    expect(src).not.toContain("confirmPayment");
  });
});
