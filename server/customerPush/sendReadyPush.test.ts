import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

vi.mock("../db", () => ({
  getOrderPushContext: vi.fn(),
}));

vi.mock("./subscriptionRepository", () => ({
  claimReadyPushForOrder: vi.fn(),
  listActiveSubscriptionsForOrder: vi.fn(),
  releaseReadyPushForOrder: vi.fn(),
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
  releaseReadyPushForOrder,
  touchPushSubscriptionLastUsed,
} from "./subscriptionRepository";

const subscription = {
  id: 9,
  orderId: 1,
  trackingToken: "tok123456789012345",
  endpoint: "https://push.example/sub",
  endpointHash: "abc",
  p256dh: "key",
  auth: "secret",
  expiresAt: null,
};

describe("sendReadyPushForOrder HOTFIX-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(true);
    vi.mocked(getOrderPushContext).mockResolvedValue({
      orderId: 1,
      orderNumber: "ORD-1",
      trackingToken: "tok123456789012345",
      slug: "cafe",
    });
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([subscription]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips when tracking token missing without claiming", async () => {
    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: null,
      orderNumber: "ORD-1",
    });

    expect(claimReadyPushForOrder).not.toHaveBeenCalled();
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer_push_send_skipped",
        metadata: { orderId: 1, reason: "no_tracking_token" },
      })
    );
  });

  it("does not claim when there are no subscriptions", async () => {
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([]);

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(claimReadyPushForOrder).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer_push_send_skipped",
        metadata: { orderId: 1, reason: "no_subscriptions" },
      })
    );
  });

  it("claims only after subscriptions exist and sends push", async () => {
    const callOrder: string[] = [];
    vi.mocked(listActiveSubscriptionsForOrder).mockImplementation(async () => {
      callOrder.push("list");
      return [subscription];
    });
    vi.mocked(claimReadyPushForOrder).mockImplementation(async () => {
      callOrder.push("claim");
      return true;
    });

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(callOrder).toEqual(["list", "claim"]);
    expect(claimReadyPushForOrder).toHaveBeenCalledWith(1);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(touchPushSubscriptionLastUsed).toHaveBeenCalledWith(9);
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer_push_send_ok",
        metadata: {
          orderId: 1,
          successCount: 1,
          subscriptionCount: 1,
        },
      })
    );
  });

  it("does not send when idempotency claim fails", async () => {
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(false);

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer_push_send_skipped",
        metadata: { orderId: 1, reason: "claim_failed" },
      })
    );
  });

  it("releases claim when every subscription send fails", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error("push down"));

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(releaseReadyPushForOrder).toHaveBeenCalledWith(1);
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer_push_send_failed",
        metadata: expect.objectContaining({
          orderId: 1,
          reason: "all_subscriptions_failed",
          subscriptionCount: 1,
        }),
      })
    );
    expect(opsLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "customer_push_send_ok" })
    );
  });
});
