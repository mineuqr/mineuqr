/**
 * TRUE-PUSH-VALIDATION-1 — customer push subscribe route logging.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import express, { type Request, type Response } from "express";

vi.mock("../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../db", () => ({
  getOrderByTrackingToken: vi.fn(),
  deletePushSubscriptionsForOrder: vi.fn(),
}));

vi.mock("./vapid", () => ({
  isCustomerPushConfigured: vi.fn(() => true),
  getVapidConfig: vi.fn(),
}));

vi.mock("./subscriptionRepository", () => ({
  upsertPushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
}));

import { opsLog } from "../_core/opsLog";
import { getOrderByTrackingToken } from "../db";
import { upsertPushSubscription } from "./subscriptionRepository";
import { customerPushRouter } from "./routes";

const validBody = {
  trackingToken: "abc123token456789012",
  slug: "cafe",
  subscription: {
    endpoint: "https://fcm.googleapis.com/fcm/send/example-endpoint-id",
    keys: {
      p256dh: "BNcRdreALRFXQT0STCS60pm6BEGnnGqaKE",
      auth: "tBHItJI5svbpez7KI4CCXg",
    },
  },
};

async function invokeSubscribe(body: unknown) {
  const layer = customerPushRouter.stack.find(
    (entry) => entry.route?.path === "/subscribe" && entry.route.methods.post
  );
  const handler = layer?.route?.stack[0]?.handle as (
    req: Request,
    res: Response
  ) => Promise<void>;

  if (!handler) throw new Error("subscribe handler not found");

  const req = {
    body,
    headers: {},
    ip: "127.0.0.1",
  } as Request;

  let statusCode = 200;
  let jsonBody: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      jsonBody = payload;
      return this;
    },
  } as Response;

  await handler(req, res);
  return { statusCode, jsonBody };
}

describe("customerPush routes TRUE-PUSH-VALIDATION-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs received + ok on successful insert", async () => {
    vi.mocked(getOrderByTrackingToken).mockResolvedValue({
      orderId: 42,
      status: "pending",
    } as Awaited<ReturnType<typeof getOrderByTrackingToken>>);
    vi.mocked(upsertPushSubscription).mockResolvedValue({ id: 7 });

    const result = await invokeSubscribe(validBody);

    expect(result.statusCode).toBe(200);
    expect(result.jsonBody).toEqual({ success: true, subscriptionId: 7 });

    const types = vi.mocked(opsLog).mock.calls.map((call) => call[0].type);
    expect(types).toContain("customer_push_subscribe_received");
    expect(types).toContain("customer_push_subscribe_ok");
  });

  it("logs invalid_body for malformed payload", async () => {
    const result = await invokeSubscribe({ trackingToken: "short", slug: "cafe" });

    expect(result.statusCode).toBe(400);
    expect(vi.mocked(opsLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "customer_push_subscribe_failed",
        metadata: expect.objectContaining({ reason: "invalid_body" }),
      })
    );
  });
});

// keep express imported so TS resolves express router types in tests
void express;
