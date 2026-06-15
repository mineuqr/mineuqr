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
  countExpiredSubscriptionsForOrder: vi.fn(),
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
  countExpiredSubscriptionsForOrder,
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

const input = {
  orderId: 1,
  trackingToken: "tok123456789012345",
  orderNumber: "ORD-1",
};

function getDeliveryDiagnostics(callIndex = -1) {
  const call = opsLogMock.mock.calls.at(callIndex)?.[0] as {
    metadata?: { deliveryDiagnostics?: Record<string, unknown> };
  };
  return call?.metadata?.deliveryDiagnostics;
}

function getFinalOkDiagnostics() {
  const okCall = opsLogMock.mock.calls.find(
    (c) => (c[0] as { type: string }).type === "customer_push_send_ok"
  )?.[0] as { metadata: { deliveryDiagnostics: Record<string, unknown> } };
  return okCall?.metadata?.deliveryDiagnostics;
}

describe("sendReadyPushForOrder HOTFIX-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(true);
    vi.mocked(countExpiredSubscriptionsForOrder).mockResolvedValue(0);
    vi.mocked(touchPushSubscriptionLastUsed).mockResolvedValue("2026-06-11 12:00:01");
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
    await sendReadyPushForOrder({ ...input, trackingToken: null });

    expect(claimReadyPushForOrder).not.toHaveBeenCalled();
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer_push_send_skipped",
        metadata: expect.objectContaining({
          orderId: 1,
          reason: "no_tracking_token",
        }),
      })
    );
  });

  it("does not claim when there are no subscriptions", async () => {
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([]);

    await sendReadyPushForOrder(input);

    expect(claimReadyPushForOrder).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(getDeliveryDiagnostics()).toMatchObject({
      subscriptionCount: 0,
      failureReason: "no_subscriptions",
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

    await sendReadyPushForOrder(input);

    expect(callOrder).toEqual(["list", "claim"]);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(touchPushSubscriptionLastUsed).toHaveBeenCalledWith(9);

    expect(getFinalOkDiagnostics()).toMatchObject({
      orderId: 1,
      trackingToken: "tok123456789012345",
      subscriptionCount: 1,
      successCount: 1,
      failureCount: 0,
      lastUsedAt: "2026-06-11 12:00:01",
      deliveryTimeline: expect.stringContaining("delivery_complete"),
    });
  });

  it("does not send when idempotency claim fails", async () => {
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(false);

    await sendReadyPushForOrder(input);

    expect(webpush.sendNotification).not.toHaveBeenCalled();
    expect(getDeliveryDiagnostics()).toMatchObject({
      failureReason: "claim_failed",
      duplicateSendPrevented: true,
      stages: expect.arrayContaining(["duplicate_send_prevented"]),
    });
  });

  it("releases claim when every subscription send fails", async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error("push down"));

    await sendReadyPushForOrder(input);

    expect(releaseReadyPushForOrder).toHaveBeenCalledWith(1);
    expect(getDeliveryDiagnostics()).toMatchObject({
      failureReason: "all_subscriptions_failed",
      successCount: 0,
      failureCount: 1,
    });
  });
});

describe("sendReadyPushForOrder PUSH-DELIVERY-VALIDATION-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(true);
    vi.mocked(countExpiredSubscriptionsForOrder).mockResolvedValue(0);
    vi.mocked(touchPushSubscriptionLastUsed).mockResolvedValue("2026-06-11 12:00:01");
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

    await sendReadyPushForOrder(input);

    expect(releaseReadyPushForOrder).not.toHaveBeenCalled();
    expect(removeStalePushSubscription).toHaveBeenCalledWith(1, subscriptionB.endpoint);
    expect(getFinalOkDiagnostics()).toMatchObject({
      successCount: 1,
      failureCount: 1,
      staleSubscriptionsRemoved: 1,
    });
  });

  it("records endpoint_gone on stale subscription errors", async () => {
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([subscription]);
    vi.mocked(webpush.sendNotification).mockRejectedValue(
      Object.assign(new Error("gone"), { statusCode: 404 })
    );

    await sendReadyPushForOrder(input);

    const perSubFail = opsLogMock.mock.calls.find(
      (c) =>
        (c[0] as { type: string; metadata?: { reason?: string } }).type ===
          "customer_push_send_failed" &&
        (c[0] as { metadata?: { reason?: string } }).metadata?.reason === "endpoint_gone"
    );
    expect(perSubFail).toBeDefined();
  });
});

describe("sendReadyPushForOrder DELIVERY-HARDENING-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(countExpiredSubscriptionsForOrder).mockResolvedValue(0);
    vi.mocked(touchPushSubscriptionLastUsed).mockResolvedValue("2026-06-11 12:00:01");
    vi.mocked(getOrderPushContext).mockResolvedValue({
      orderId: 1,
      orderNumber: "ORD-1",
      trackingToken: "tok123456789012345",
      slug: "cafe",
    });
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([subscription]);
  });

  it("prevents duplicate sends on repeated READY delivery attempts", async () => {
    vi.mocked(claimReadyPushForOrder)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await sendReadyPushForOrder(input);
    await sendReadyPushForOrder(input);

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(claimReadyPushForOrder).toHaveBeenCalledTimes(2);

    const skipCall = opsLogMock.mock.calls.find(
      (c) =>
        (c[0] as { metadata?: { duplicateSendPrevented?: boolean } }).metadata
          ?.duplicateSendPrevented === true
    );
    expect(skipCall).toBeDefined();
  });

  it("allows retry after all sends fail and claim is released", async () => {
    vi.mocked(claimReadyPushForOrder).mockResolvedValue(true);
    vi.mocked(webpush.sendNotification)
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(undefined);

    await sendReadyPushForOrder(input);
    expect(releaseReadyPushForOrder).toHaveBeenCalledTimes(1);

    await sendReadyPushForOrder(input);
    expect(claimReadyPushForOrder).toHaveBeenCalledTimes(2);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    expect(getFinalOkDiagnostics()).toMatchObject({ successCount: 1 });
  });

  it("skips with subscriptions_all_expired when only expired rows exist", async () => {
    vi.mocked(listActiveSubscriptionsForOrder).mockResolvedValue([]);
    vi.mocked(countExpiredSubscriptionsForOrder).mockResolvedValue(2);

    await sendReadyPushForOrder(input);

    expect(claimReadyPushForOrder).not.toHaveBeenCalled();
    expect(getDeliveryDiagnostics()).toMatchObject({
      failureReason: "subscriptions_all_expired",
      expiredSubscriptionCount: 2,
      subscriptionCount: 0,
    });
  });
});
