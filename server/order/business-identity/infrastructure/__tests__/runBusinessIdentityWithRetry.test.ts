import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { BusinessIdentityMetrics } from "../../observability/BusinessIdentityMetrics";
import { runBusinessIdentityWithRetry } from "../runBusinessIdentityWithRetry";

describe("runBusinessIdentityWithRetry", () => {
  let metrics: BusinessIdentityMetrics;

  beforeEach(() => {
    metrics = new BusinessIdentityMetrics();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries recoverable unique constraint collisions and succeeds", async () => {
    let calls = 0;
    const promise = runBusinessIdentityWithRetry(
      async () => {
        calls += 1;
        if (calls === 1) {
          throw Object.assign(new Error("Duplicate entry"), { errno: 1062 });
        }
        return { businessDay: "2026-07-10", dailyDisplayNumber: 2 };
      },
      { restaurantId: 1, orderId: 10, path: "historic" },
      metrics
    );

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.dailyDisplayNumber).toBe(2);
    expect(calls).toBe(2);
    expect(metrics.snapshot().retries).toBe(1);
    expect(metrics.snapshot().uniqueConstraintRetries).toBe(1);
  });

  it("retries deadlocks with bounded attempts", async () => {
    let calls = 0;
    const promise = runBusinessIdentityWithRetry(
      async () => {
        calls += 1;
        if (calls <= 2) {
          throw Object.assign(new Error("Deadlock"), { errno: 1213 });
        }
        return { businessDay: "2026-07-10", dailyDisplayNumber: 1 };
      },
      { restaurantId: 1, orderId: 11, path: "historic" },
      metrics
    );

    await vi.runAllTimersAsync();
    await promise;

    expect(calls).toBe(3);
    expect(metrics.snapshot().deadlocks).toBe(2);
  });

  it("does not retry business errors", async () => {
    await expect(
      runBusinessIdentityWithRetry(
        async () => {
          throw new Error("Order not found");
        },
        { restaurantId: 1, orderId: 12, path: "historic" },
        metrics
      )
    ).rejects.toThrow("Order not found");

    expect(metrics.snapshot().retries).toBe(0);
    expect(metrics.snapshot().failures).toBe(1);
  });

  it("records failure after retry exhaustion", async () => {
    const assertion = expect(
      runBusinessIdentityWithRetry(
        async () => {
          throw Object.assign(new Error("Deadlock"), { errno: 1213 });
        },
        { restaurantId: 1, orderId: 13, path: "historic" },
        metrics
      )
    ).rejects.toThrow("Deadlock");

    await vi.runAllTimersAsync();
    await assertion;

    expect(metrics.snapshot().retries).toBe(4);
    expect(metrics.snapshot().failures).toBe(1);
  });
});
