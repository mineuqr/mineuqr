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
import {
  AUTH_OPS_EMIT_COOLDOWN_MS,
  AUTH_OPS_MAX_COUNTER_KEYS,
  AUTH_OPS_ROLLING_WINDOW_MS,
  authDegradedMetadata,
  authHttpContext,
  authOpsLog,
  authTokenFailureReason,
  rollingWindowBurstMetadata,
} from "./_core/authOpsMetadata";
import { OPS_EVENT } from "./_core/opsTaxonomy";
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
import { tokenToHash } from "./_core/authTokenUtils";
import {
  AUTH_ONE_TIME_TOKEN_PURPOSE,
  classifyAuthOneTimeToken,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  issueAuthOneTimeToken,
  isPlausibleOneTimeTokenFromBody,
  isPlausibleOneTimeTokenFromQuery,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "./_core/authOneTimeToken";
import {
  respondEmailVerificationExpired,
  respondEmailVerificationInvalid,
  respondResetLinkExpired,
  respondResetLinkInvalid,
} from "./_core/authOneTimeTokenResponses";
import { createCooldownCounterMap } from "./_core/cooldownCounterMap";
import {
  cleanupEmitCooldownStamps,
  trimEmitCooldownStamps,
  tryConsumeEmitCooldown,
  type EmitCooldownStamp,
} from "./_core/emitCooldown";

const router = Router();

const PASSWORD_RESET_RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxAttempts: 5 } as const;

// --- In-memory burst counters (invalid token / resend ops visibility) ---
const INVALID_TOKEN_WINDOW_MS = AUTH_OPS_ROLLING_WINDOW_MS;
const INVALID_TOKEN_MAX_ATTEMPTS = 25;
const INVALID_TOKEN_EMIT_COOLDOWN_MS = AUTH_OPS_EMIT_COOLDOWN_MS;

const VERIFICATION_RESEND_WINDOW_MS = AUTH_OPS_ROLLING_WINDOW_MS;
const VERIFICATION_RESEND_MAX_ACTOR = 5;
const VERIFICATION_RESEND_MAX_IP = 15;
const VERIFICATION_RESEND_EMIT_COOLDOWN_MS = AUTH_OPS_EMIT_COOLDOWN_MS;
const VERIFICATION_EMAIL_MIN_INTERVAL_MS = 60 * 1000; // 60 seconds

type InvalidTokenEndpoint = "reset-password" | "verify-email";

const invalidTokenCounters = createCooldownCounterMap({
  windowMs: INVALID_TOKEN_WINDOW_MS,
  emitCooldownMs: INVALID_TOKEN_EMIT_COOLDOWN_MS,
  maxKeys: AUTH_OPS_MAX_COUNTER_KEYS,
});

const resendEmitCooldown = new Map<string, EmitCooldownStamp>();

type ResendStamp = { lastSentAt: number; lastSeenAt: number };
const verificationResendLastSent = new Map<string, ResendStamp>();

function invalidTokenCounterKey(input: {
  ip: string;
  endpoint: InvalidTokenEndpoint;
}): string {
  return `invalid_token:${input.endpoint}:ip:${input.ip}`;
}

function noteInvalidTokenAttempt(input: {
  req: Request;
  endpoint: InvalidTokenEndpoint;
}): { throttled: boolean; count: number } {
  const now = Date.now();
  const http = authHttpContext(input.req);
  const key = invalidTokenCounterKey({ ip: http.ip, endpoint: input.endpoint });
  const entry = invalidTokenCounters.increment(key, now);
  const count = entry.count;

  if (process.env.AUTH_DEBUG === "1") {
    console.info("[Auth] invalid token attempt", {
      ip: http.ip,
      endpoint: input.endpoint,
      key,
      count,
      threshold: INVALID_TOKEN_MAX_ATTEMPTS,
    });
  }

  const throttled = count >= INVALID_TOKEN_MAX_ATTEMPTS;

  // Low-noise operational visibility for bursts (cooldowned).
  if (count === INVALID_TOKEN_MAX_ATTEMPTS || throttled) {
    if (invalidTokenCounters.canEmit(entry, now)) {
      invalidTokenCounters.markEmitted(entry, now);
      authOpsLog({
        type: throttled
          ? OPS_EVENT.auth_token_bruteforce_suspected
          : OPS_EVENT.auth_invalid_token_burst,
        severity: "warn",
        req: input.req,
        ts: new Date(now).toISOString(),
        metadata: rollingWindowBurstMetadata({
          countInWindow: count,
          windowMs: INVALID_TOKEN_WINDOW_MS,
          threshold: INVALID_TOKEN_MAX_ATTEMPTS,
          key,
          signal: throttled ? "auth_token_bruteforce" : "auth_invalid_token_burst",
          extra: { endpoint: input.endpoint },
        }),
      });
    }
  }

  return { throttled, count };
}

function maybeEmitResendCooldowned(input: {
  key: string;
  now: number;
  req: Request;
  actorId?: number | null;
  type: (typeof OPS_EVENT)[keyof typeof OPS_EVENT];
  metadata: Record<string, unknown>;
}): void {
  if (
    !tryConsumeEmitCooldown({
      stamps: resendEmitCooldown,
      key: input.key,
      now: input.now,
      cooldownMs: VERIFICATION_RESEND_EMIT_COOLDOWN_MS,
    })
  ) {
    return;
  }

  authOpsLog({
    type: input.type,
    severity: "warn",
    req: input.req,
    ts: new Date(input.now).toISOString(),
    actorId: input.actorId ?? null,
    metadata: input.metadata,
  });
}

function cleanupVerificationResendMaps(now: number): void {
  for (const [k, v] of Array.from(verificationResendLastSent.entries())) {
    if (now - v.lastSeenAt > VERIFICATION_RESEND_WINDOW_MS * 2) {
      verificationResendLastSent.delete(k);
    }
  }
  cleanupEmitCooldownStamps(
    resendEmitCooldown,
    now,
    VERIFICATION_RESEND_WINDOW_MS * 2
  );

  const MAX_KEYS = AUTH_OPS_MAX_COUNTER_KEYS;
  if (verificationResendLastSent.size > MAX_KEYS) {
    const entries = Array.from(verificationResendLastSent.entries()).sort(
      (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
    );
    const toRemove = verificationResendLastSent.size - MAX_KEYS;
    for (let i = 0; i < toRemove; i++) {
      verificationResendLastSent.delete(entries[i]![0]);
    }
  }
  trimEmitCooldownStamps(resendEmitCooldown, MAX_KEYS);
}

// --- HTTP helpers (cookies, responses, link base URL) ---
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

// --- One-time token flows (password reset + email verification) ---

/**
 * POST /api/auth/forgot-password
 *
 * Non-enumerating: always returns success if not rate-limited.
 */
router.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
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

    authOpsLog({
      type: OPS_EVENT.password_reset_requested,
      severity: "info",
      req,
      metadata: { emailProvided: Boolean(email) },
    });

    if (email) {
      const user = await db.getUserByEmail(email);

      // Only local email/password accounts are eligible for password reset.
      if (user && user.openId.startsWith("local_") && user.email) {
        const issued = issueAuthOneTimeToken(PASSWORD_RESET_TOKEN_TTL_MS);

        const created = await db.createAuthToken({
          userId: user.id,
          type: AUTH_ONE_TIME_TOKEN_PURPOSE.passwordReset,
          tokenHash: issued.tokenHash,
          expiresAt: issued.expiresAt,
        });

        if (!created) {
          authOpsLog({
            type: OPS_EVENT.auth_token_create_failed,
            severity: "warn",
            req,
            actorId: user.id,
            metadata: { purpose: "password_reset", issue: "db_insert_failed" },
          });
        } else {
          const baseUrl = baseUrlForLinks(req);
          const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(issued.plaintextToken)}`;
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

          authOpsLog({
            type: OPS_EVENT.password_reset_email_sent,
            severity: "info",
            req,
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
    authOpsLog({
      type: OPS_EVENT.password_reset_requested,
      severity: "warn",
      req,
      metadata: authDegradedMetadata("forgot_password_exception"),
    });
    return res.json({ success: true });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post("/api/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { token: rawToken, newPassword } = req.body ?? {};
    if (!isPlausibleOneTimeTokenFromBody(rawToken)) {
      // Throttle high-rate invalid token attempts (visibility + soft-throttle only).
      noteInvalidTokenAttempt({ req, endpoint: "reset-password" });
      authOpsLog({
        type: OPS_EVENT.password_reset_token_invalid,
        severity: "warn",
        req,
        metadata: authTokenFailureReason("malformed_token"),
      });
      return respondResetLinkInvalid(res);
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    }

    const row = await db.getAuthTokenByHash(
      tokenToHash(rawToken),
      AUTH_ONE_TIME_TOKEN_PURPOSE.passwordReset
    );
    const tokenStatus = classifyAuthOneTimeToken(row);

    if (tokenStatus === "missing") {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "reset-password" });
      if (!throttled) {
        authOpsLog({
          type: OPS_EVENT.password_reset_token_invalid,
          severity: "warn",
          req,
          metadata: authTokenFailureReason("token_missing"),
        });
      }
      return respondResetLinkInvalid(res);
    }
    if (tokenStatus === "consumed") {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "reset-password" });
      if (throttled) {
        return respondResetLinkInvalid(res);
      }
      authOpsLog({
        type: OPS_EVENT.password_reset_token_invalid,
        severity: "warn",
        req,
        actorId: row!.userId,
        metadata: authTokenFailureReason("token_used"),
      });
      return respondResetLinkInvalid(res);
    }
    if (tokenStatus === "expired") {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "reset-password" });
      if (throttled) {
        return respondResetLinkExpired(res);
      }
      authOpsLog({
        type: OPS_EVENT.password_reset_token_expired,
        severity: "warn",
        req,
        actorId: row!.userId,
        metadata: authTokenFailureReason("token_expired"),
      });
      return respondResetLinkExpired(res);
    }

    const user = await db.getUserById(row!.userId);
    if (!user || !user.openId.startsWith("local_")) {
      authOpsLog({
        type: OPS_EVENT.password_reset_token_invalid,
        severity: "warn",
        req,
        actorId: row!.userId,
        metadata: authTokenFailureReason("user_missing_or_not_local"),
      });
      return respondResetLinkInvalid(res);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.updateUserPassword(user.openId, passwordHash);
    await db.markAuthTokenUsed(row!.id);
    clearSessionCookie(res, req);

    authOpsLog({
      type: OPS_EVENT.password_reset_completed,
      severity: "info",
      req,
      actorId: user.id,
      metadata: { openId: user.openId },
    });

    return res.json({ success: true });
  } catch (error) {
    authOpsLog({
      type: OPS_EVENT.password_reset_token_invalid,
      severity: "error",
      req,
      metadata: authDegradedMetadata("reset_password_exception"),
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

    authOpsLog({
      type: OPS_EVENT.email_verification_requested,
      severity: "info",
      req,
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
        req,
        actorId: user.id,
        type: OPS_EVENT.auth_verification_resend_burst,
        metadata: {
          signal: "verification_resend_burst",
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
          threshold: VERIFICATION_RESEND_MAX_IP,
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
        req,
        actorId: user.id,
        type: OPS_EVENT.auth_email_amplification_suspected,
        metadata: {
          signal: "email_amplification",
          suppressed: true,
          minIntervalMs: VERIFICATION_EMAIL_MIN_INTERVAL_MS,
          sinceLastSendMs: now - existing.lastSentAt,
        },
      });
      return res.json({ success: true });
    }

    const issued = issueAuthOneTimeToken(EMAIL_VERIFICATION_TOKEN_TTL_MS);

    const created = await db.createAuthToken({
      userId: user.id,
      type: AUTH_ONE_TIME_TOKEN_PURPOSE.emailVerification,
      tokenHash: issued.tokenHash,
      expiresAt: issued.expiresAt,
    });

    if (!created) {
      authOpsLog({
        type: OPS_EVENT.auth_token_create_failed,
        severity: "warn",
        req,
        actorId: user.id,
        metadata: { purpose: "email_verify", issue: "db_insert_failed" },
      });
      return res.json({ success: true });
    }

    const baseUrl = baseUrlForLinks(req);
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(issued.plaintextToken)}`;

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

    authOpsLog({
      type: OPS_EVENT.email_verification_email_sent,
      severity: "info",
      req,
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
  try {
    const rawToken = typeof req.query.token === "string" ? req.query.token : "";
    if (!rawToken || !isPlausibleOneTimeTokenFromQuery(rawToken)) {
      noteInvalidTokenAttempt({ req, endpoint: "verify-email" });
      authOpsLog({
        type: OPS_EVENT.email_verification_token_invalid,
        severity: "warn",
        req,
        metadata: authTokenFailureReason("malformed_token"),
      });
      return respondEmailVerificationInvalid(res);
    }

    const row = await db.getAuthTokenByHash(
      tokenToHash(rawToken),
      AUTH_ONE_TIME_TOKEN_PURPOSE.emailVerification
    );
    const tokenStatus = classifyAuthOneTimeToken(row);

    if (tokenStatus === "missing" || tokenStatus === "consumed") {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "verify-email" });
      if (throttled) {
        return respondEmailVerificationInvalid(res);
      }
      authOpsLog({
        type: OPS_EVENT.email_verification_token_invalid,
        severity: "warn",
        req,
        actorId: row?.userId ?? null,
        metadata: authTokenFailureReason(
          tokenStatus === "consumed" ? "token_used" : "token_missing"
        ),
      });
      return respondEmailVerificationInvalid(res);
    }
    if (tokenStatus === "expired") {
      const { throttled } = noteInvalidTokenAttempt({ req, endpoint: "verify-email" });
      if (throttled) {
        return respondEmailVerificationExpired(res);
      }
      authOpsLog({
        type: OPS_EVENT.email_verification_token_expired,
        severity: "warn",
        req,
        actorId: row!.userId,
        metadata: authTokenFailureReason("token_expired"),
      });
      return respondEmailVerificationExpired(res);
    }

    await db.markUserEmailVerified(row!.userId);
    await db.markAuthTokenUsed(row!.id);

    authOpsLog({
      type: OPS_EVENT.email_verification_completed,
      severity: "info",
      req,
      actorId: row!.userId,
    });

    // UX can be refined later; keep it simple and safe.
    return res.redirect(302, "/");
  } catch (error) {
    authOpsLog({
      type: OPS_EVENT.email_verification_token_invalid,
      severity: "error",
      req,
      metadata: authDegradedMetadata("verify_email_exception", { error: String(error) }),
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
