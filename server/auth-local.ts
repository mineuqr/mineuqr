import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { parse as parseCookieHeader } from "cookie";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { setSessionCookie } from "./_core/cookies";
import { ENV } from "./_core/env";
import {
  logFailedLogin,
  logRateLimitExceeded,
  logSuccessfulLogin,
} from "./_core/authAudit";
import { opsLog } from "./_core/opsLog";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { getCorrelationId } from "./_core/requestContext";
import { clearSessionCookie } from "./_core/cookies";
import { sendEmail } from "./email";
import {
  AUTH_BURST_LIMIT,
  checkRateLimit,
  clearRateLimit,
  getClientIp,
  getAuthBurstKey,
  getLoginRateLimitKey,
  LOGIN_RATE_LIMIT,
} from "./_core/rateLimit";
import { createHash, randomBytes } from "crypto";

const router = Router();

const RESET_TOKEN_EXPIRES_MS = 30 * 60 * 1000; // 30 minutes
const VERIFY_TOKEN_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24 hours

const PASSWORD_RESET_RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxAttempts: 5 } as const;

const INVALID_TOKEN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const INVALID_TOKEN_MAX_ATTEMPTS = 25;
const INVALID_TOKEN_EMIT_COOLDOWN_MS = 2 * 60 * 1000;

const VERIFICATION_RESEND_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const VERIFICATION_RESEND_MAX_ACTOR = 5;
const VERIFICATION_RESEND_MAX_IP = 15;
const VERIFICATION_RESEND_EMIT_COOLDOWN_MS = 2 * 60 * 1000;
const VERIFICATION_EMAIL_MIN_INTERVAL_MS = 60 * 1000; // 60 seconds

type InvalidTokenKey = {
  ip: string;
  endpoint: "reset-password" | "verify-email";
};

type InvalidTokenCounter = {
  count: number;
  windowStart: number;
  lastSeenAt: number;
  lastEmittedAt?: number;
};

const invalidTokenCounters = new Map<string, InvalidTokenCounter>();

type EmitCooldownCounter = { lastEmittedAt?: number };
const resendEmitCooldown = new Map<string, EmitCooldownCounter>();

type ResendStamp = { lastSentAt: number; lastSeenAt: number };
const verificationResendLastSent = new Map<string, ResendStamp>();

function invalidTokenKey(input: InvalidTokenKey): string {
  return `invalid_token:${input.endpoint}:ip:${input.ip}`;
}

function cleanupInvalidTokenCounters(now: number): void {
  for (const [k, c] of Array.from(invalidTokenCounters.entries())) {
    if (now - c.lastSeenAt > INVALID_TOKEN_WINDOW_MS * 2) invalidTokenCounters.delete(k);
  }
  if (invalidTokenCounters.size <= 5000) return;
  const entries = Array.from(invalidTokenCounters.entries()).sort(
    (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
  );
  const toRemove = invalidTokenCounters.size - 5000;
  for (let i = 0; i < toRemove; i++) invalidTokenCounters.delete(entries[i]![0]);
}

function noteInvalidTokenAttempt(input: {
  req: Request;
  endpoint: InvalidTokenKey["endpoint"];
  correlationId?: string;
}): { throttled: boolean; count: number } {
  const now = Date.now();
  cleanupInvalidTokenCounters(now);

  const ip = getClientIp(input.req);
  const key = invalidTokenKey({ ip, endpoint: input.endpoint });

  let c = invalidTokenCounters.get(key);
  if (!c || now - c.windowStart >= INVALID_TOKEN_WINDOW_MS) {
    c = { count: 0, windowStart: now, lastSeenAt: now };
    invalidTokenCounters.set(key, c);
  }
  c.count += 1;
  c.lastSeenAt = now;

  const count = c.count;
  console.log({
    ip,
    endpoint: input.endpoint,
    key,
    count,
    threshold: INVALID_TOKEN_MAX_ATTEMPTS,
  });

  const throttled = count >= INVALID_TOKEN_MAX_ATTEMPTS;

  // Low-noise operational visibility for bursts (cooldowned).
  if (count === INVALID_TOKEN_MAX_ATTEMPTS || throttled) {
    const lastEmitted = c.lastEmittedAt ?? 0;
    if (now - lastEmitted >= INVALID_TOKEN_EMIT_COOLDOWN_MS) {
      c.lastEmittedAt = now;
      opsLog({
        type: throttled
          ? OPS_EVENT.auth_token_bruteforce_suspected
          : OPS_EVENT.auth_invalid_token_burst,
        category: "AUTH",
        severity: "warn",
        ts: new Date(now).toISOString(),
        correlationId: input.correlationId,
        route: input.req.path,
        method: input.req.method,
        ip,
        metadata: {
          endpoint: input.endpoint,
          countInWindow: count,
          windowMs: INVALID_TOKEN_WINDOW_MS,
          threshold: INVALID_TOKEN_MAX_ATTEMPTS,
          key,
        },
      });
    }
  }

  return { throttled, count };
}

function maybeEmitResendCooldowned(input: {
  key: string;
  now: number;
  correlationId?: string;
  req: Request;
  actorId?: number | null;
  ip: string;
  type: (typeof OPS_EVENT)[keyof typeof OPS_EVENT];
  metadata: Record<string, unknown>;
}): void {
  const existing = resendEmitCooldown.get(input.key) ?? {};
  const last = existing.lastEmittedAt ?? 0;
  if (input.now - last < VERIFICATION_RESEND_EMIT_COOLDOWN_MS) return;
  existing.lastEmittedAt = input.now;
  resendEmitCooldown.set(input.key, existing);

  opsLog({
    type: input.type,
    category: "AUTH",
    severity: "warn",
    ts: new Date(input.now).toISOString(),
    correlationId: input.correlationId,
    route: input.req.path,
    method: input.req.method,
    actorId: input.actorId ?? null,
    ip: input.ip,
    metadata: input.metadata,
  });
}

function cleanupVerificationResendMaps(now: number): void {
  // expire inactive keys
  for (const [k, v] of Array.from(verificationResendLastSent.entries())) {
    if (now - v.lastSeenAt > VERIFICATION_RESEND_WINDOW_MS * 2) verificationResendLastSent.delete(k);
  }
  for (const [k, v] of Array.from(resendEmitCooldown.entries())) {
    const last = v.lastEmittedAt ?? 0;
    if (now - last > VERIFICATION_RESEND_WINDOW_MS * 2) resendEmitCooldown.delete(k);
  }

  const MAX_KEYS = 5000;
  if (verificationResendLastSent.size > MAX_KEYS) {
    const entries = Array.from(verificationResendLastSent.entries()).sort(
      (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
    );
    const toRemove = verificationResendLastSent.size - MAX_KEYS;
    for (let i = 0; i < toRemove; i++) verificationResendLastSent.delete(entries[i]![0]);
  }
  if (resendEmitCooldown.size > MAX_KEYS) {
    const entries = Array.from(resendEmitCooldown.entries()).sort(
      (a, b) => (a[1].lastEmittedAt ?? 0) - (b[1].lastEmittedAt ?? 0)
    );
    const toRemove = resendEmitCooldown.size - MAX_KEYS;
    for (let i = 0; i < toRemove; i++) resendEmitCooldown.delete(entries[i]![0]);
  }
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

function genericAuthError(res: Response) {
  return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
}

function rateLimitedResponse(res: Response, retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  res.setHeader("Retry-After", String(retryAfterSec));
  return res.status(429).json({
    error: "محاولات كثيرة. يرجى المحاولة لاحقاً",
    retryAfterSec,
  });
}

function baseUrlForLinks(req: Request): string {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.length > 0) return origin;
  const host = req.get("host");
  const proto = req.protocol;
  if (host) return `${proto}://${host}`;
  return "https://www.mineuqr.com";
}

function tokenToHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  // 32 bytes → 43 chars base64url-ish when encoded; use hex for simplicity (64 chars).
  return randomBytes(32).toString("hex");
}

/**
 * POST /api/auth/login
 * Login with email + password (for subscribers created by admin)
 */
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const burst = checkRateLimit(getAuthBurstKey(req), AUTH_BURST_LIMIT);
    if (!burst.allowed) {
      logRateLimitExceeded(req, getAuthBurstKey(req));
      return rateLimitedResponse(res, burst.retryAfterMs ?? AUTH_BURST_LIMIT.windowMs);
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    }

    const emailStr = String(email);
    const loginKey = getLoginRateLimitKey(req, emailStr);
    const loginLimit = checkRateLimit(loginKey, LOGIN_RATE_LIMIT);
    if (!loginLimit.allowed) {
      logFailedLogin(req, emailStr, "rate_limited");
      logRateLimitExceeded(req, loginKey);
      return rateLimitedResponse(res, loginLimit.retryAfterMs ?? LOGIN_RATE_LIMIT.windowMs);
    }

    const user = await db.getUserByEmail(emailStr);
    if (!user) {
      logFailedLogin(req, emailStr, "user_not_found");
      return genericAuthError(res);
    }

    if (!user.passwordHash) {
      logFailedLogin(req, emailStr, "no_password");
      return genericAuthError(res);
    }

    const isValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isValid) {
      logFailedLogin(req, emailStr, "invalid_credentials");
      return genericAuthError(res);
    }

    clearRateLimit(loginKey);
    clearRateLimit(getAuthBurstKey(req));

    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || user.email || "User",
    });

    setSessionCookie(res, req, sessionToken);

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date().toISOString(),
    });

    logSuccessfulLogin(req, user.id);

    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("[Auth Local] Login error:", error);
    return res.status(500).json({ error: "حدث خطأ في تسجيل الدخول" });
  }
});

/**
 * POST /api/auth/forgot-password
 *
 * Non-enumerating: always returns success if not rate-limited.
 */
router.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
  const correlationId = getCorrelationId(req);
  const route = req.path;
  const method = req.method;

  try {
    const burst = checkRateLimit(getAuthBurstKey(req), AUTH_BURST_LIMIT);
    if (!burst.allowed) {
      logRateLimitExceeded(req, getAuthBurstKey(req));
      return rateLimitedResponse(res, burst.retryAfterMs ?? AUTH_BURST_LIMIT.windowMs);
    }

    const rawEmail = typeof req.body?.email === "string" ? req.body.email : "";
    const email = rawEmail.trim().toLowerCase();

    const key = `pwdreset:${getLoginRateLimitKey(req, email || "unknown")}`;
    const limit = checkRateLimit(key, PASSWORD_RESET_RATE_LIMIT);
    if (!limit.allowed) {
      logRateLimitExceeded(req, key);
      return rateLimitedResponse(res, limit.retryAfterMs ?? PASSWORD_RESET_RATE_LIMIT.windowMs);
    }

    opsLog({
      type: OPS_EVENT.password_reset_requested,
      category: "AUTH",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: { emailProvided: Boolean(email) },
    });

    if (email) {
      const user = await db.getUserByEmail(email);

      // Only local email/password accounts are eligible for password reset.
      if (user && user.openId.startsWith("local_") && user.email) {
        const token = newToken();
        const tokenHash = tokenToHash(token);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS).toISOString();

        const created = await db.createAuthToken({
          userId: user.id,
          type: "password_reset",
          tokenHash,
          expiresAt,
        });

        if (!created) {
          opsLog({
            type: OPS_EVENT.auth_token_create_failed,
            category: "AUTH",
            severity: "warn",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            actorId: user.id,
            metadata: { purpose: "password_reset" },
          });
        } else {
          const baseUrl = baseUrlForLinks(req);
          const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
          await sendEmail({
            to: user.email,
            subject: "إعادة تعيين كلمة المرور",
            html: `
              <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
                <h2>إعادة تعيين كلمة المرور</h2>
                <p>إذا طلبت إعادة تعيين كلمة المرور، اضغط الرابط التالي:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>ستنتهي صلاحية الرابط خلال 30 دقيقة.</p>
                <p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p>
              </div>
            `,
          });

          opsLog({
            type: OPS_EVENT.password_reset_email_sent,
            category: "AUTH",
            severity: "info",
            ts: new Date().toISOString(),
            correlationId,
            route,
            method,
            actorId: user.id,
            metadata: { purpose: "password_reset" },
          });
        }
      }
    }

    // Non-enumerating response
    return res.json({ success: true });
  } catch (error) {
    // Low-noise: do not leak account existence; still return success.
    opsLog({
      type: OPS_EVENT.password_reset_requested,
      category: "AUTH",
      severity: "warn",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: { degradedReason: "forgot_password_exception" },
    });
    return res.json({ success: true });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post("/api/auth/reset-password", async (req: Request, res: Response) => {
  const correlationId = getCorrelationId(req);
  const route = req.path;
  const method = req.method;

  try {
    const { token, newPassword } = req.body ?? {};
    if (typeof token !== "string" || token.trim().length < 20) {
      // Throttle high-rate invalid token attempts (visibility + soft-throttle only).
      noteInvalidTokenAttempt({ req, endpoint: "reset-password", correlationId });
      opsLog({
        type: OPS_EVENT.password_reset_token_invalid,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
      });
      return res.status(400).json({ error: "الرابط غير صالح" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    }

    const tokenHash = tokenToHash(token);
    const row = await db.getAuthTokenByHash(tokenHash, "password_reset");
    if (!row) {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "reset-password", correlationId });
      if (throttled) {
        // Preserve semantics: still “invalid link”, but stop doing work.
        return res.status(400).json({ error: "الرابط غير صالح" });
      }
      opsLog({
        type: OPS_EVENT.password_reset_token_invalid,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
      });
      return res.status(400).json({ error: "الرابط غير صالح" });
    }
    if (row.usedAt) {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "reset-password", correlationId });
      if (throttled) {
        return res.status(400).json({ error: "الرابط غير صالح" });
      }
      opsLog({
        type: OPS_EVENT.password_reset_token_invalid,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        actorId: row.userId,
        metadata: { reason: "token_used" },
      });
      return res.status(400).json({ error: "الرابط غير صالح" });
    }
    if (new Date(row.expiresAt).getTime() <= Date.now()) {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "reset-password", correlationId });
      if (throttled) {
        return res.status(400).json({ error: "انتهت صلاحية الرابط" });
      }
      opsLog({
        type: OPS_EVENT.password_reset_token_expired,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        actorId: row.userId,
      });
      return res.status(400).json({ error: "انتهت صلاحية الرابط" });
    }

    const user = await db.getUserById(row.userId);
    if (!user || !user.openId.startsWith("local_")) {
      opsLog({
        type: OPS_EVENT.password_reset_token_invalid,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        actorId: row.userId,
        metadata: { reason: "user_missing_or_not_local" },
      });
      return res.status(400).json({ error: "الرابط غير صالح" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.updateUserPassword(user.openId, passwordHash);
    await db.markAuthTokenUsed(row.id);
    clearSessionCookie(res, req);

    opsLog({
      type: OPS_EVENT.password_reset_completed,
      category: "AUTH",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      actorId: user.id,
      metadata: { openId: user.openId },
    });

    return res.json({ success: true });
  } catch (error) {
    opsLog({
      type: OPS_EVENT.password_reset_token_invalid,
      category: "AUTH",
      severity: "error",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: { degradedReason: "reset_password_exception" },
    });
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

/**
 * POST /api/auth/request-email-verification
 *
 * Requires valid session cookie; sends a verification link.
 */
router.post("/api/auth/request-email-verification", async (req: Request, res: Response) => {
  const correlationId = getCorrelationId(req);
  const route = req.path;
  const method = req.method;

  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await sdk.verifySession(sessionCookie);
    if (!session || (ENV.appId && session.appId !== ENV.appId)) {
      return res.status(401).json({ error: "غير مصرح" });
    }

    const user = await db.getUserByOpenId(session.openId);
    if (!user || !user.email) {
      return res.json({ success: true });
    }

    opsLog({
      type: OPS_EVENT.email_verification_requested,
      category: "AUTH",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      actorId: user.id,
    });

    const now = Date.now();
    cleanupVerificationResendMaps(now);
    const ip = getClientIp(req);

    // Rolling-window resend throttling (actor + ip). Preserve semantics: still return success.
    const actorKey = `verify_resend:actor:${user.id}`;
    const ipKey = `verify_resend:ip:${ip}`;
    const actorLimit = checkRateLimit(actorKey, {
      windowMs: VERIFICATION_RESEND_WINDOW_MS,
      maxAttempts: VERIFICATION_RESEND_MAX_ACTOR,
    });
    const ipLimit = checkRateLimit(ipKey, {
      windowMs: VERIFICATION_RESEND_WINDOW_MS,
      maxAttempts: VERIFICATION_RESEND_MAX_IP,
    });

    if (!actorLimit.allowed || !ipLimit.allowed) {
      maybeEmitResendCooldowned({
        key: `verify_resend_emit:${!actorLimit.allowed ? actorKey : ipKey}`,
        now,
        correlationId,
        req,
        actorId: user.id,
        ip,
        type: OPS_EVENT.auth_verification_resend_burst,
        metadata: {
          actorKey,
          ipKey,
          actorAllowed: actorLimit.allowed,
          ipAllowed: ipLimit.allowed,
          actorRemaining: actorLimit.remaining,
          ipRemaining: ipLimit.remaining,
          retryAfterMs:
            (actorLimit.retryAfterMs ?? 0) > (ipLimit.retryAfterMs ?? 0)
              ? actorLimit.retryAfterMs
              : ipLimit.retryAfterMs,
          windowMs: VERIFICATION_RESEND_WINDOW_MS,
          actorMax: VERIFICATION_RESEND_MAX_ACTOR,
          ipMax: VERIFICATION_RESEND_MAX_IP,
        },
      });
      return res.json({ success: true });
    }

    // Email amplification suppression: avoid repeated token+send storms.
    const stampKey = `verify_email_last_sent:actor:${user.id}`;
    const existing = verificationResendLastSent.get(stampKey);
    if (existing) existing.lastSeenAt = now;
    if (existing && now - existing.lastSentAt < VERIFICATION_EMAIL_MIN_INTERVAL_MS) {
      maybeEmitResendCooldowned({
        key: `verify_email_amp:${stampKey}`,
        now,
        correlationId,
        req,
        actorId: user.id,
        ip,
        type: OPS_EVENT.auth_email_amplification_suspected,
        metadata: {
          suppressed: true,
          minIntervalMs: VERIFICATION_EMAIL_MIN_INTERVAL_MS,
          sinceLastSendMs: now - existing.lastSentAt,
        },
      });
      return res.json({ success: true });
    }

    const token = newToken();
    const tokenHash = tokenToHash(token);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_EXPIRES_MS).toISOString();

    const created = await db.createAuthToken({
      userId: user.id,
      type: "email_verify",
      tokenHash,
      expiresAt,
    });

    if (!created) {
      opsLog({
        type: OPS_EVENT.auth_token_create_failed,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        actorId: user.id,
        metadata: { purpose: "email_verify" },
      });
      return res.json({ success: true });
    }

    const baseUrl = baseUrlForLinks(req);
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: user.email,
      subject: "تأكيد البريد الإلكتروني",
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h2>تأكيد البريد الإلكتروني</h2>
          <p>اضغط الرابط التالي لتأكيد بريدك الإلكتروني:</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>ستنتهي صلاحية الرابط خلال 24 ساعة.</p>
        </div>
      `,
    });

    opsLog({
      type: OPS_EVENT.email_verification_email_sent,
      category: "AUTH",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      actorId: user.id,
      metadata: { purpose: "email_verify" },
    });

    verificationResendLastSent.set(stampKey, { lastSentAt: now, lastSeenAt: now });

    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
});

/**
 * GET /api/auth/verify-email?token=...
 */
router.get("/api/auth/verify-email", async (req: Request, res: Response) => {
  const correlationId = getCorrelationId(req);
  const route = req.path;
  const method = req.method;

  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token || token.length < 20) {
      noteInvalidTokenAttempt({ req, endpoint: "verify-email", correlationId });
      opsLog({
        type: OPS_EVENT.email_verification_token_invalid,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
      });
      return res.status(400).send("Invalid token");
    }

    const tokenHash = tokenToHash(token);
    const row = await db.getAuthTokenByHash(tokenHash, "email_verify");
    if (!row || row.usedAt) {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "verify-email", correlationId });
      if (throttled) {
        return res.status(400).send("Invalid token");
      }
      opsLog({
        type: OPS_EVENT.email_verification_token_invalid,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        actorId: row?.userId ?? null,
      });
      return res.status(400).send("Invalid token");
    }
    if (new Date(row.expiresAt).getTime() <= Date.now()) {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "verify-email", correlationId });
      if (throttled) {
        return res.status(400).send("Expired token");
      }
      opsLog({
        type: OPS_EVENT.email_verification_token_expired,
        category: "AUTH",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route,
        method,
        actorId: row.userId,
      });
      return res.status(400).send("Expired token");
    }

    await db.markUserEmailVerified(row.userId);
    await db.markAuthTokenUsed(row.id);

    opsLog({
      type: OPS_EVENT.email_verification_completed,
      category: "AUTH",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      actorId: row.userId,
    });

    // UX can be refined later; keep it simple and safe.
    return res.redirect(302, "/");
  } catch (error) {
    opsLog({
      type: OPS_EVENT.email_verification_token_invalid,
      category: "AUTH",
      severity: "error",
      ts: new Date().toISOString(),
      correlationId,
      route,
      method,
      metadata: { degradedReason: "verify_email_exception", error: String(error) },
    });
    return res.status(500).send("Error");
  }
});

/**
 * POST /api/auth/change-password
 * Change password for logged-in user
 */
router.post("/api/auth/change-password", async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await sdk.verifySession(sessionCookie);

    if (!session) {
      return res.status(401).json({ error: "غير مصرح" });
    }

    if (ENV.appId && session.appId !== ENV.appId) {
      return res.status(401).json({ error: "غير مصرح" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    }

    const user = await db.getUserByOpenId(session.openId);
    if (!user) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    // Align with tRPC profile.changePassword: only local email/password accounts may set passwords.
    if (!user.openId.startsWith("local_")) {
      return res.status(403).json({
        error: "تغيير كلمة المرور متاح فقط لحسابات البريد الإلكتروني",
      });
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
      }
      const isValid = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 12);
    await db.updateUserPassword(user.openId, passwordHash);

    return res.json({ success: true });
  } catch (error) {
    console.error("[Auth Local] Change password error:", error);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export { router as localAuthRouter };
