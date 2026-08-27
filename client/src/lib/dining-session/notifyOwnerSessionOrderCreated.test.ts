import { describe, expect, it, vi, beforeEach } from "vitest";

const publish = vi.hoisted(() => vi.fn());

vi.mock("@/lib/order-lifecycle-latency/orderLifecycleBroadcast", () => ({
  publishSessionOrderCreated: (...args: unknown[]) => publish(...args),
}));

import {
  isOwnerSessionRefreshTarget,
  notifyOwnerSessionOrderCreated,
} from "./notifyOwnerSessionOrderCreated";

describe("notifyOwnerSessionOrderCreated SESSION-ORDER-REALTIME-REFRESH-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes only when restaurantId and sessionId are valid", () => {
    notifyOwnerSessionOrderCreated({
      restaurantId: 8,
      sessionId: 3180011,
      orderId: 7950009,
    });

    expect(publish).toHaveBeenCalledWith({
      restaurantId: 8,
      sessionId: 3180011,
      orderId: 7950009,
    });
  });

  it("does not publish without a sessionId", () => {
    notifyOwnerSessionOrderCreated({
      restaurantId: 8,
      sessionId: undefined,
      orderId: 7950009,
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it("swallows publish failures so Order creation stays successful", () => {
    publish.mockImplementationOnce(() => {
      throw new Error("broadcast unavailable");
    });
    expect(() =>
      notifyOwnerSessionOrderCreated({
        restaurantId: 8,
        sessionId: 10,
        orderId: 1,
      })
    ).not.toThrow();
  });

  it("targets only the open Session", () => {
    expect(
      isOwnerSessionRefreshTarget({
        restaurantId: 8,
        openSessionId: 10,
        messageRestaurantId: 8,
        messageSessionId: 10,
      })
    ).toBe(true);
    expect(
      isOwnerSessionRefreshTarget({
        restaurantId: 8,
        openSessionId: 10,
        messageRestaurantId: 8,
        messageSessionId: 99,
      })
    ).toBe(false);
    expect(
      isOwnerSessionRefreshTarget({
        restaurantId: 8,
        openSessionId: 10,
        messageRestaurantId: 9,
        messageSessionId: 10,
      })
    ).toBe(false);
  });
});
