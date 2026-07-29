/**
 * REALTIME-KITCHEN-ADOPTION-1 — invalidation debounce unit tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetKitchenQueueInvalidationCoordinatorForTests,
  scheduleKitchenQueueInvalidation,
} from "../kitchenQueueInvalidationCoordinator";

describe("kitchenQueueInvalidationCoordinator", () => {
  beforeEach(() => {
    __resetKitchenQueueInvalidationCoordinatorForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetKitchenQueueInvalidationCoordinatorForTests();
  });

  it("debounces multiple signals into one invalidate", () => {
    const invalidate = vi.fn();
    scheduleKitchenQueueInvalidation({ restaurantId: 1, invalidate });
    scheduleKitchenQueueInvalidation({ restaurantId: 1, invalidate });
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
