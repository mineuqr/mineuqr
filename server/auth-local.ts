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
  AUTH_BURST_LIMIT,
  checkRateLimit,
  clearRateLimit,
  getAuthBurstKey,
  getLoginRateLimitKey,
  LOGIN_RATE_LIMIT,
} from "./_core/rateLimit";

const router = Router();

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
