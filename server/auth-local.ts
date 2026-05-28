/**
 * Local email/password auth routes (login, reset, verify, change-password).
 * Route orchestration lives here; pure helpers live under ./auth-local/.
 */
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { setSessionCookie, clearSessionCookie } from "./_core/cookies";
import {
  logFailedLogin,
  logRateLimitExceeded,
  logSuccessfulLogin,
} from "./_core/authAudit";
import {
  authDegradedMetadata,
  authOpsLog,
  authTokenFailureReason,
} from "./_core/authOpsMetadata";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { sendEmail } from "./email";
import {
  AUTH_BURST_LIMIT,
  checkRateLimit,
  clearRateLimit,
  getAuthBurstKey,
  getClientIp,
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
import { noteInvalidTokenAttempt } from "./auth-local/invalidTokenBurst";
import {
  baseUrlForLinks,
  genericAuthError,
  isLocalPasswordAccount,
  normalizeEmailFromBody,
  rateLimitedResponse,
} from "./auth-local/httpHelpers";
import {
  enforceAuthBurstLimit,
  enforceForgotPasswordRateLimit,
} from "./auth-local/rateLimitGuards";
import { getVerifiedSessionFromRequest } from "./auth-local/session";
import {
  cleanupVerificationResendMaps,
  isVerificationEmailAmplified,
  maybeEmitResendCooldowned,
  recordVerificationEmailSent,
  touchVerificationEmailStamp,
  verificationEmailStampKey,
  verificationResendActorKey,
  verificationResendIpKey,
  VERIFICATION_EMAIL_MIN_INTERVAL_MS,
  VERIFICATION_RESEND_MAX_ACTOR,
  VERIFICATION_RESEND_MAX_IP,
  VERIFICATION_RESEND_WINDOW_MS,
} from "./auth-local/verificationResend";

const router = Router();

// ─── Login ───────────────────────────────────────────────────────────────────

router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    if (enforceAuthBurstLimit(req, res)) return;

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

// ─── Password reset (forgot + reset) ─────────────────────────────────────────

router.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    if (enforceAuthBurstLimit(req, res)) return;

    const email = normalizeEmailFromBody(req.body);
    if (enforceForgotPasswordRateLimit(req, res, email)) return;

    authOpsLog({
      type: OPS_EVENT.password_reset_requested,
      severity: "info",
      req,
      metadata: { emailProvided: Boolean(email) },
    });

    if (email) {
      const user = await db.getUserByEmail(email);
      if (user && isLocalPasswordAccount(user)) {
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
          const resetUrl = `${baseUrlForLinks(req)}/reset-password?token=${encodeURIComponent(issued.plaintextToken)}`;
          await sendEmail({
            to: user.email!,
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

    return res.json({ success: true });
  } catch {
    authOpsLog({
      type: OPS_EVENT.password_reset_requested,
      severity: "warn",
      req,
      metadata: authDegradedMetadata("forgot_password_exception"),
    });
    return res.json({ success: true });
  }
});

router.post("/api/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { token: rawToken, newPassword } = req.body ?? {};
    if (!isPlausibleOneTimeTokenFromBody(rawToken)) {
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
      if (throttled) return respondResetLinkInvalid(res);
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
      if (throttled) return respondResetLinkExpired(res);
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
  } catch {
    authOpsLog({
      type: OPS_EVENT.password_reset_token_invalid,
      severity: "error",
      req,
      metadata: authDegradedMetadata("reset_password_exception"),
    });
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

// ─── Email verification (resend + confirm) ─────────────────────────────────

router.post("/api/auth/request-email-verification", async (req: Request, res: Response) => {
  try {
    const session = await getVerifiedSessionFromRequest(req);
    if (!session) {
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

    const actorKey = verificationResendActorKey(user.id);
    const ipKey = verificationResendIpKey(ip);
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

    const stampKey = verificationEmailStampKey(user.id);
    const existing = touchVerificationEmailStamp(stampKey, now);
    if (isVerificationEmailAmplified(stampKey, now)) {
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
          sinceLastSendMs: now - existing!.lastSentAt,
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

    const verifyUrl = `${baseUrlForLinks(req)}/api/auth/verify-email?token=${encodeURIComponent(issued.plaintextToken)}`;

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

    recordVerificationEmailSent(stampKey, now);

    return res.json({ success: true });
  } catch {
    return res.json({ success: true });
  }
});

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
      if (throttled) return respondEmailVerificationInvalid(res);
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
      if (throttled) return respondEmailVerificationExpired(res);
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

// ─── Change password (session required) ────────────────────────────────────

router.post("/api/auth/change-password", async (req: Request, res: Response) => {
  try {
    const session = await getVerifiedSessionFromRequest(req);
    if (!session) {
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
