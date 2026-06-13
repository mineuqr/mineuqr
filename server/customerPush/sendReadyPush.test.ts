import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  getOrderPushContext: vi.fn(),
  claimReadyPushSend: vi.fn(),
  getActivePushSubscriptionsForOrder: vi.fn(),
  touchCustomerPushSubscriptionLastUsed: vi.fn(),
  deletePushSubscriptionByEndpointHash: vi.fn(),
}));

vi.mock("./subscriptionRepository", () => ({
  claimReadyPushForOrder: vi.fn(),
  listActiveSubscriptionsForOrder: vi.fn(),
  removeStalePushSubscription: vi.fn(),
  touchPushSubscriptionLastUsed: vi.fn(),
}));

vi.mock("./vapid", () => ({
  ensureWebPushVapidConfigured: vi.fn(() => true),
}));

vi.mock("web-push", () => ({
  default: {
    sendNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

import webpush from "web-push";
import { getOrderPushContext } from "../db";
import { sendReadyPushForOrder } from "./sendReadyPush";
import {
  claimReadyPushForOrder,
  listActiveSubscriptionsForOrder,
  touchPushSubscriptionLastUsed,
} from "./subscriptionRepository";

describe("sendReadyPushForOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(true);
    vi.mocked(getOrderPushContext).mockResolvedValue({
      orderId: 1,
      orderNumber: "ORD-1",
      trackingToken: "tok123456789012345",
      slug: "cafe",
    });
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([
      {
        id: 9,
        orderId: 1,
        trackingToken: "tok123456789012345",
        endpoint: "https://push.example/sub",
        endpointHash: "abc",
        p256dh: "key",
        auth: "secret",
        expiresAt: null,
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips when tracking token missing", async () => {
    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: null,
      orderNumber: "ORD-1",
    });
    expect(claimReadyPushForOrder).not.toHaveBeenCalled();
  });

  it("sends push when idempotency claim succeeds", async () => {
    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(claimReadyPushForOrder).toHaveBeenCalledWith(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(touchPushSubscriptionLastUsed).toHaveBeenCalledWith(9);
  });

  it("does not send when idempotency claim fails", async () => {
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(false);
    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
});
