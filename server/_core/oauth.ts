import type { Express, Request, Response } from "express";
import * as db from "../db";
import { setSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { createTrialSubscription } from "../create-trial-subscription";
import { notifyOwnerNewUser } from "../owner-email-notifications";
import { opsLog } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";
import { getCorrelationId } from "./requestContext";
import { AUTH_SESSION_TTL_MS } from "./sessionConfig";
import {
  checkRateLimit,
  getClientIp,
} from "./rateLimit";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

const OAUTH_CALLBACK_RATE_LIMIT = {
  // Slightly higher than AUTH_BURST_LIMIT to avoid affecting legitimate flows.
  windowMs: 60 * 1000,
  maxAttempts: 60,
} as const;

const OAUTH_INVALID_BURST_WINDOW_MS = 10 * 60 * 1000;
const OAUTH_INVALID_BURST_MAX = 25;
const OAUTH_INVALID_EMIT_COOLDOWN_MS = 2 * 60 * 1000;

type InvalidCounter = {
  count: number;
  windowStart: number;
  lastSeenAt: number;
  lastEmittedAt?: number;
};

const invalidCallbackCounters = new Map<string, InvalidCounter>();

function invalidKey(req: Request, reason: "missing_params" | "malformed_state"): string {
  return `oauth_invalid:${reason}:ip:${getClientIp(req)}`;
}

function cleanupInvalid(now: number): void {
  for (const [k, c] of Array.from(invalidCallbackCounters.entries())) {
    if (now - c.lastSeenAt > OAUTH_INVALID_BURST_WINDOW_MS * 2) {
      invalidCallbackCounters.delete(k);
    }
  }
  const MAX_KEYS = 5000;
  if (invalidCallbackCounters.size <= MAX_KEYS) return;
  const entries = Array.from(invalidCallbackCounters.entries()).sort(
    (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
  );
  const toRemove = invalidCallbackCounters.size - MAX_KEYS;
  for (let i = 0; i < toRemove; i++) invalidCallbackCounters.delete(entries[i]![0]);
}

function noteInvalidCallbackAttempt(input: {
  req: Request;
  correlationId?: string;
  reason: "missing_params" | "malformed_state";
  metadata?: Record<string, unknown>;
}): void {
  const now = Date.now();
  cleanupInvalid(now);
  const key = invalidKey(input.req, input.reason);

  let c = invalidCallbackCounters.get(key);
  if (!c || now - c.windowStart >= OAUTH_INVALID_BURST_WINDOW_MS) {
    c = { count: 0, windowStart: now, lastSeenAt: now };
    invalidCallbackCounters.set(key, c);
  }
  c.count += 1;
  c.lastSeenAt = now;

  if (c.count < OAUTH_INVALID_BURST_MAX) return;

  const last = c.lastEmittedAt ?? 0;
  if (now - last < OAUTH_INVALID_EMIT_COOLDOWN_MS) return;
  c.lastEmittedAt = now;

  opsLog({
    type: OPS_EVENT.oauth_callback_invalid_burst,
    category: "AUTH",
    severity: "warn",
    ts: new Date(now).toISOString(),
    correlationId: input.correlationId,
    route: input.req.path,
    method: input.req.method,
    ip: getClientIp(input.req),
    metadata: {
      reason: input.reason,
      countInWindow: c.count,
      windowMs: OAUTH_INVALID_BURST_WINDOW_MS,
      threshold: OAUTH_INVALID_BURST_MAX,
      key,
      ...input.metadata,
    },
  });
}

export function _safeDecodeOAuthState(
  state: string
): { ok: true; redirectUri: string } | { ok: false; reason: "malformed" } {
  try {
    const redirectUri = atob(state);
    if (typeof redirectUri !== "string" || redirectUri.trim().length === 0) {
      return { ok: false, reason: "malformed" };
    }
    return { ok: true, redirectUri };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const correlationId = getCorrelationId(req);
    const route = req.path;
    const method = req.method;

    // Abuse protection: IP-only rolling window for callback hammering.
    const rateKey = `oauth_callback:${getClientIp(req)}`;
    const burst = checkRateLimit(rateKey, OAUTH_CALLBACK_RATE_LIMIT);
    if (!burst.allowed) {
      opsLog({
        type: OPS_EVENT.oauth_callback_rate_limited,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        ip: getClientIp(req),
        metadata: {
          retryAfterMs: burst.retryAfterMs ?? OAUTH_CALLBACK_RATE_LIMIT.windowMs,
          windowMs: OAUTH_CALLBACK_RATE_LIMIT.windowMs,
          maxAttempts: OAUTH_CALLBACK_RATE_LIMIT.maxAttempts,
          key: rateKey,
        },
      });
      const retryAfterSec = Math.ceil(
        (burst.retryAfterMs ?? OAUTH_CALLBACK_RATE_LIMIT.windowMs) / 1000
      );
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ error: "Too many requests", retryAfterSec });
      return;
    }

    if (!code || !state) {
      noteInvalidCallbackAttempt({
        req,
        correlationId,
        reason: "missing_params",
        metadata: { missingCode: !code, missingState: !state },
      });
      opsLog({
        type: OPS_EVENT.oauth_callback_missing_params,
        category: "AUTH",
        severity: "info",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        ip: getClientIp(req),
        metadata: {
          missingCode: !code,
          missingState: !state,
        },
      });
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // Visibility: malformed OAuth state probes (do not leak details).
    const decoded = _safeDecodeOAuthState(state);
    if (!decoded.ok) {
      noteInvalidCallbackAttempt({ req, correlationId, reason: "malformed_state" });
      opsLog({
        type: OPS_EVENT.oauth_state_malformed,
        category: "AUTH",
        severity: "info",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        ip: getClientIp(req),
        metadata: {
          issue: "state_base64_decode_failed",
        },
      });
      res.status(400).json({ error: "invalid state" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        opsLog({
          type: OPS_EVENT.oauth_userinfo_missing_openid,
          category: "AUTH",
          severity: "warn",
          ts: new Date().toISOString(),
          correlationId,
          route,
          method,
          metadata: {
            provider: "manus",
          },
        });
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const existingUser = await db.getUserByOpenId(userInfo.openId);
      
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date().toISOString(),
      });
      
      // Create trial subscription for new users
      if (!existingUser) {
        const user = await db.getUserByOpenId(userInfo.openId);
        if (user) {
          try {
            await createTrialSubscription(user.id);
          } catch (error) {
            opsLog({
              type: OPS_EVENT.oauth_trial_subscription_failed,
              category: "AUTH",
              severity: "warn",
              ts: new Date().toISOString(),
              correlationId,
              route,
              method,
              actorId: user.id,
              metadata: {
                provider: "manus",
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
          // Send email notification to owner about new user
          try {
            await notifyOwnerNewUser({
              name: userInfo.name || null,
              email: userInfo.email ?? null,
              loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            });
          } catch (error) {
            opsLog({
              type: OPS_EVENT.oauth_owner_notification_failed,
              category: "AUTH",
              severity: "warn",
              ts: new Date().toISOString(),
              correlationId,
              route,
              method,
              actorId: user.id,
              metadata: {
                provider: "manus",
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: AUTH_SESSION_TTL_MS,
      });

      setSessionCookie(res, req, sessionToken, AUTH_SESSION_TTL_MS);
      if (process.env.AUTH_DEBUG === "1") {
        console.info("[Auth] OAuth callback: session cookie set");
      }

      res.redirect(302, "/");
    } catch (error) {
      opsLog({
        type: OPS_EVENT.oauth_callback_failed,
        category: "AUTH",
        severity: "error",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        ip: getClientIp(req),
        metadata: {
          provider: "manus",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
