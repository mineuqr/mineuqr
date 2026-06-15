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
  removeStalePushSubscription,
  touchPushSubscriptionLastUsed,
} from "./subscriptionRepository";

const subscription = {
  id: 9,
  orderId: 1,
  trackingToken: "tok123456789012345",
  endpoint: "https://push.example/sub-a",
  endpointHash: "abc",
  p256dh: "key",
  auth: "secret",
  expiresAt: null,
};

const subscriptionB = {
  ...subscription,
  id: 10,
  endpoint: "https://push.example/sub-b",
  endpointHash: "def",
};

function getDeliveryDiagnostics(callIndex = -1) {
  const call = opsLogMock.mock.calls.at(callIndex)?.[0] as {
    metadata?: { deliveryDiagnostics?: Record<string, unknown> };
  };
  return call?.metadata?.deliveryDiagnostics;
}

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
        metadata: expect.objectContaining({
          orderId: 1,
          reason: "no_tracking_token",
          deliveryDiagnostics: expect.objectContaining({
            failureReason: "no_tracking_token",
            claimResult: null,
          }),
        }),
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
    const diag = getDeliveryDiagnostics();
    expect(diag).toMatchObject({
      orderId: 1,
      subscriptionCount: 0,
      failureReason: "no_subscriptions",
      stages: expect.arrayContaining(["subscriptions_loaded"]),
    });
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

    const okCall = opsLogMock.mock.calls.find(
      (c) => (c[0] as { type: string }).type === "customer_push_send_ok"
    )?.[0] as { metadata: { deliveryDiagnostics: Record<string, unknown> } };

    expect(okCall.metadata.deliveryDiagnostics).toMatchObject({
      orderId: 1,
      subscriptionCount: 1,
      successfulSends: 1,
      failedSends: 0,
      claimResult: true,
      failureReason: null,
      stages: expect.arrayContaining([
        "delivery_started",
        "subscriptions_loaded",
        "claim_acquired",
        "ready_push_marked",
        "send_success",
        "last_used_updated",
        "delivery_complete",
      ]),
    });
  });

  it("does not send when idempotency claim fails", async () => {
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(false);

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(getDeliveryDiagnostics()).toMatchObject({
      failureReason: "claim_failed",
      claimResult: false,
      readyPushSentAt: null,
      stages: expect.arrayContaining(["claim_failed"]),
    });
  });

  it("releases claim when every subscription send fails", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error("push down"));

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(releaseReadyPushForOrder).toHaveBeenCalledWith(1);
    const diag = getDeliveryDiagnostics();
    expect(diag).toMatchObject({
      failureReason: "all_subscriptions_failed",
      successfulSends: 0,
      failedSends: 1,
      stages: expect.arrayContaining(["ready_push_released"]),
    });
    expect(opsLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "customer_push_send_ok" })
    );
  });
});

describe("sendReadyPushForOrder PUSH-DELIVERY-VALIDATION-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(true);
    vi.mocked(getOrderPushContext).mockResolvedValue({
      orderId: 1,
      orderNumber: "ORD-1",
      trackingToken: "tok123456789012345",
      slug: "cafe",
    });
  });

  it("partial success: one send ok and one failed still completes delivery", async () => {
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([subscription, subscriptionB]);
    vi.mocked(webpush.sendNotification)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }));

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    expect(releaseReadyPushForOrder).not.toHaveBeenCalled();
    expect(touchPushSubscriptionLastUsed).toHaveBeenCalledWith(9);
    expect(removeStalePushSubscription).toHaveBeenCalledWith(1, subscriptionB.endpoint);

    const okCall = opsLogMock.mock.calls.find(
      (c) => (c[0] as { type: string }).type === "customer_push_send_ok"
    )?.[0] as { metadata: { deliveryDiagnostics: Record<string, unknown> } };

    expect(okCall.metadata.deliveryDiagnostics).toMatchObject({
      successfulSends: 1,
      failedSends: 1,
      subscriptionCount: 2,
      failureReason: null,
    });
  });

  it("records endpoint_gone on stale subscription errors", async () => {
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([subscription]);
    vi.mocked(webpush.sendNotification).mockRejectedValue(
      Object.assign(new Error("gone"), { statusCode: 404 })
    );

    await sendReadyPushForOrder({
      orderId: 1,
      trackingToken: "tok123456789012345",
      orderNumber: "ORD-1",
    });

    const perSubFail = opsLogMock.mock.calls.find(
      (c) =>
        (c[0] as { type: string; metadata?: { reason?: string } }).type ===
          "customer_push_send_failed" &&
        (c[0] as { metadata?: { reason?: string } }).metadata?.reason === "endpoint_gone"
    );
    expect(perSubFail).toBeDefined();
  });
});
