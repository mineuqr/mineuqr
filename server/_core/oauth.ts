import type { Express, Request, Response } from "express";
import * as db from "../db";
import { setSessionCookie } from "./cookies";
import { sdk } from "./sdk";
import { createTrialSubscription } from "../create-trial-subscription";
import { notifyOwnerNewUser } from "../owner-email-notifications";
import {
  AUTH_OPS_EMIT_COOLDOWN_MS,
  AUTH_OPS_MAX_COUNTER_KEYS,
  AUTH_OPS_ROLLING_WINDOW_MS,
  authHttpContext,
  authOpsLog,
  rollingWindowBurstMetadata,
} from "./authOpsMetadata";
import { OPS_EVENT } from "./opsTaxonomy";
import { AUTH_SESSION_TTL_MS } from "./sessionConfig";
import { createCooldownCounterMap } from "./cooldownCounterMap";
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

const OAUTH_INVALID_BURST_WINDOW_MS = AUTH_OPS_ROLLING_WINDOW_MS;
const OAUTH_INVALID_BURST_MAX = 25;
const OAUTH_INVALID_EMIT_COOLDOWN_MS = AUTH_OPS_EMIT_COOLDOWN_MS;

const invalidCallbackCounters = createCooldownCounterMap({
  windowMs: OAUTH_INVALID_BURST_WINDOW_MS,
  emitCooldownMs: OAUTH_INVALID_EMIT_COOLDOWN_MS,
  maxKeys: AUTH_OPS_MAX_COUNTER_KEYS,
});

function invalidCallbackCounterKey(
  req: Request,
  reason: "missing_params" | "malformed_state"
): string {
  return `oauth_invalid:${reason}:ip:${getClientIp(req)}`;
}

function noteInvalidCallbackAttempt(input: {
  req: Request;
  correlationId?: string;
  reason: "missing_params" | "malformed_state";
  metadata?: Record<string, unknown>;
}): void {
  const now = Date.now();
  const key = invalidCallbackCounterKey(input.req, input.reason);
  const entry = invalidCallbackCounters.increment(key, now);

  if (entry.count < OAUTH_INVALID_BURST_MAX) return;
  if (!invalidCallbackCounters.canEmit(entry, now)) return;
  invalidCallbackCounters.markEmitted(entry, now);

  authOpsLog({
    type: OPS_EVENT.oauth_callback_invalid_burst,
    severity: "warn",
    req: input.req,
    correlationId: input.correlationId,
    ts: new Date(now).toISOString(),
    metadata: rollingWindowBurstMetadata({
      countInWindow: entry.count,
      windowMs: OAUTH_INVALID_BURST_WINDOW_MS,
      threshold: OAUTH_INVALID_BURST_MAX,
      key,
      reason: input.reason,
      signal: "oauth_callback_invalid_burst",
      extra: input.metadata,
    }),
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
    const http = authHttpContext(req);

    // Abuse protection: IP-only rolling window for callback hammering.
    const rateKey = `oauth_callback:${getClientIp(req)}`;
    const burst = checkRateLimit(rateKey, OAUTH_CALLBACK_RATE_LIMIT);
    if (!burst.allowed) {
      authOpsLog({
        type: OPS_EVENT.oauth_callback_rate_limited,
        severity: "warn",
        req,
        metadata: {
          retryAfterMs: burst.retryAfterMs ?? OAUTH_CALLBACK_RATE_LIMIT.windowMs,
          windowMs: OAUTH_CALLBACK_RATE_LIMIT.windowMs,
          threshold: OAUTH_CALLBACK_RATE_LIMIT.maxAttempts,
          maxAttempts: OAUTH_CALLBACK_RATE_LIMIT.maxAttempts,
          key: rateKey,
          signal: "oauth_callback_rate_limited",
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
        correlationId: http.correlationId,
        reason: "missing_params",
        metadata: { missingCode: !code, missingState: !state },
      });
      authOpsLog({
        type: OPS_EVENT.oauth_callback_missing_params,
        severity: "info",
        req,
        metadata: {
          reason: "missing_params",
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
      noteInvalidCallbackAttempt({
        req,
        correlationId: http.correlationId,
        reason: "malformed_state",
      });
      authOpsLog({
        type: OPS_EVENT.oauth_state_malformed,
        severity: "info",
        req,
        metadata: {
          reason: "malformed_state",
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
        authOpsLog({
          type: OPS_EVENT.oauth_userinfo_missing_openid,
          severity: "warn",
          req,
          metadata: {
            provider: "manus",
            issue: "openid_missing",
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
            authOpsLog({
              type: OPS_EVENT.oauth_trial_subscription_failed,
              severity: "warn",
              req,
              actorId: user.id,
              metadata: {
                provider: "manus",
                degradedReason: "trial_subscription_failed",
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
            authOpsLog({
              type: OPS_EVENT.oauth_owner_notification_failed,
              severity: "warn",
              req,
              actorId: user.id,
              metadata: {
                provider: "manus",
                degradedReason: "owner_notification_failed",
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
      authOpsLog({
        type: OPS_EVENT.oauth_callback_failed,
        severity: "error",
        req,
        metadata: {
          provider: "manus",
          degradedReason: "oauth_callback_exception",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
