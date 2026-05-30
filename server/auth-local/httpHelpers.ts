import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { effectiveRequestProtocol } from "../_core/secureRequest";

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

/**
 * Base URL for password-reset / verify-email links.
 * Priority: PUBLIC_APP_URL → Origin → Host + effective protocol (proxy-aware) → production default.
 */
export function baseUrlForLinks(req: Request): string {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.length > 0) return origin;

  const host = req.get("host");
  if (host) return `${effectiveRequestProtocol(req)}://${host}`;

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

/** Self-service password change (must match login capability: email + stored hash). */
export function canChangeOwnPassword(user: {
  email: string | null;
  passwordHash: string | null;
}): boolean {
  return Boolean(user.email?.trim()) && Boolean(user.passwordHash);
}
