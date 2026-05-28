import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";

export function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

export function genericAuthError(res: Response) {
  return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
}

export function rateLimitedResponse(res: Response, retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  res.setHeader("Retry-After", String(retryAfterSec));
  return res.status(429).json({
    error: "محاولات كثيرة. يرجى المحاولة لاحقاً",
    retryAfterSec,
  });
}

/** Origin → host → production default (password-reset / verify links). */
export function baseUrlForLinks(req: Request): string {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.length > 0) return origin;
  const host = req.get("host");
  const proto = req.protocol;
  if (host) return `${proto}://${host}`;
  return "https://www.mineuqr.com";
}

/** Normalize forgot-password email field (trim + lowercase). */
export function normalizeEmailFromBody(body: unknown): string {
  const raw = typeof (body as { email?: unknown } | null)?.email === "string"
    ? (body as { email: string }).email
    : "";
  return raw.trim().toLowerCase();
}

/** Local email/password accounts eligible for password reset. */
export function isLocalPasswordAccount(user: {
  openId: string;
  email: string | null;
}): boolean {
  return user.openId.startsWith("local_") && Boolean(user.email);
}
