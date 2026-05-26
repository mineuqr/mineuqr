import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { setSessionCookie } from "./_core/cookies";

const router = Router();

/**
 * POST /api/auth/login
 * Login with email + password (for subscribers created by admin)
 */
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    }

    // Find user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }

    // Check if user has a password set
    if (!user.passwordHash) {
      return res.status(401).json({ error: "هذا الحساب لا يدعم تسجيل الدخول بكلمة المرور" });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }

    // Create session token (same as OAuth flow)
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || user.email || "User",
    });

    setSessionCookie(res, req, sessionToken);

    // Explicit sign-in: always refresh lastSignedIn (authenticateRequest throttles routine calls).
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date().toISOString(),
    });

    if (process.env.AUTH_DEBUG === "1") {
      console.info("[Auth] Local login succeeded", { userId: user.id });
    }

    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
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

    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
    }

    const user = await db.getUserByOpenId(session.openId);
    if (!user) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    // If user has existing password, verify current password
    if (user.passwordHash && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.updateUserPassword(user.openId, passwordHash);

    return res.json({ success: true });
  } catch (error) {
    console.error("[Auth Local] Change password error:", error);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const pairs = cookieHeader.split(";").map(s => s.trim().split("="));
  return new Map(pairs.map(([k, ...v]) => [k, v.join("=")]));
}

export { router as localAuthRouter };
