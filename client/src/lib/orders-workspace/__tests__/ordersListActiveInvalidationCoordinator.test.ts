/**
 * REALTIME-ORDERS-ADOPTION-1 — invalidation debounce unit tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetOrdersInvalidationCoordinatorForTests,
  scheduleOrdersListActiveInvalidation,
} from "../ordersListActiveInvalidationCoordinator";

describe("ordersListActiveInvalidationCoordinator", () => {
  beforeEach(() => {
    __resetOrdersInvalidationCoordinatorForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetOrdersInvalidationCoordinatorForTests();
  });

  it("debounces duplicate keys into one invalidate", () => {
    const invalidate = vi.fn();
    scheduleOrdersListActiveInvalidation({
      restaurantId: 1,
      invalidate,
      dedupeKey: "42:5",
    });
    scheduleOrdersListActiveInvalidation({
      restaurantId: 1,
      invalidate,
      dedupeKey: "42:5",
    });
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("coalesces broadcast + hint within debounce window", () => {
    const invalidate = vi.fn();
    scheduleOrdersListActiveInvalidation({
      restaurantId: 2,
      invalidate,
      dedupeKey: "broadcast",
    });
    scheduleOrdersListActiveInvalidation({
      restaurantId: 2,
      invalidate,
      dedupeKey: "42:5",
    });
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
