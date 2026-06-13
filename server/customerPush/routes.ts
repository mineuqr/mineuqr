/**
 * BACKGROUND-NOTIFICATIONS-1A — public push subscription HTTP routes.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getOrderByTrackingToken } from "../db";
import { getVapidConfig, isCustomerPushConfigured } from "./vapid";
import {
  removePushSubscription,
  upsertPushSubscription,
} from "./subscriptionRepository";
import { deletePushSubscriptionsForOrder } from "../db";

const TRACKING_TOKEN_REGEX = /^[A-Za-z0-9_-]+$/;

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(512),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

const subscribeBodySchema = z.object({
  trackingToken: z.string().min(16).max(64).regex(TRACKING_TOKEN_REGEX),
  slug: z.string().min(1).max(128),
  subscription: subscriptionSchema,
});

const unsubscribeBodySchema = z.object({
  trackingToken: z.string().min(16).max(64).regex(TRACKING_TOKEN_REGEX),
  slug: z.string().min(1).max(128),
  endpoint: z.string().url().max(512),
});

const TERMINAL_STATUSES = new Set(["served", "cancelled"]);

type RateCounter = { count: number; windowStart: number };
const RATE_WINDOW_MS = 10 * 60 * 1000;
const IP_LIMIT = 10;
const TOKEN_LIMIT = 5;
const rateCounters = new Map<string, RateCounter>();

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  let counter = rateCounters.get(key);
  if (!counter || now - counter.windowStart >= RATE_WINDOW_MS) {
    counter = { count: 0, windowStart: now };
    rateCounters.set(key, counter);
  }
  counter.count += 1;
  return counter.count > limit;
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.ip ?? "unknown";
}

async function resolveActiveOrder(trackingToken: string, slug: string) {
  const row = await getOrderByTrackingToken(trackingToken, slug);
  if (!row) return { error: "not_found" as const };
  if (TERMINAL_STATUSES.has(row.status)) {
    return { error: "terminal" as const };
  }
  return {
    orderId: row.orderId,
    trackingToken,
    status: row.status,
  };
}

export const customerPushRouter = Router();

customerPushRouter.get("/vapid-public-key", (_req: Request, res: Response) => {
  const config = getVapidConfig();
  if (!config) {
    res.status(503).json({ error: "PUSH_NOT_CONFIGURED" });
    return;
  }
  res.json({ publicKey: config.publicKey });
});

customerPushRouter.post("/subscribe", async (req: Request, res: Response) => {
  if (!isCustomerPushConfigured()) {
    res.status(503).json({ error: "PUSH_NOT_CONFIGURED" });
    return;
  }

  const parsed = subscribeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY" });
    return;
  }

  const { trackingToken, slug, subscription } = parsed.data;
  const ip = clientIp(req);

  if (isRateLimited(`push-sub:ip:${ip}`, IP_LIMIT)) {
    res.status(429).json({ error: "RATE_LIMITED" });
    return;
  }
  if (isRateLimited(`push-sub:token:${trackingToken}`, TOKEN_LIMIT)) {
    res.status(429).json({ error: "RATE_LIMITED" });
    return;
  }

  const order = await resolveActiveOrder(trackingToken, slug);
  if ("error" in order) {
    if (order.error === "not_found") {
      res.status(404).json({ error: "ORDER_NOT_FOUND" });
      return;
    }
    res.status(409).json({ error: "ORDER_TERMINAL" });
    return;
  }

  try {
    const result = await upsertPushSubscription({
      orderId: order.orderId,
      trackingToken,
      subscription,
    });
    res.json({ success: true, subscriptionId: result.id });
  } catch {
    res.status(500).json({ error: "SUBSCRIBE_FAILED" });
  }
});

customerPushRouter.post("/unsubscribe", async (req: Request, res: Response) => {
  const parsed = unsubscribeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY" });
    return;
  }

  const { trackingToken, slug, endpoint } = parsed.data;
  const row = await getOrderByTrackingToken(trackingToken, slug);
  if (!row) {
    res.status(404).json({ error: "ORDER_NOT_FOUND" });
    return;
  }

  await removePushSubscription({ orderId: row.orderId, endpoint });
  res.json({ success: true });
});

/** Called when order reaches terminal status. */
export async function cleanupPushSubscriptionsForOrder(orderId: number): Promise<void> {
  await deletePushSubscriptionsForOrder(orderId);
}
