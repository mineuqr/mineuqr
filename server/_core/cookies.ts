import { COOKIE_NAME } from "@shared/const";
import type { CookieOptions, Request, Response } from "express";
import { AUTH_SESSION_TTL_MS } from "./sessionConfig";
import { describeSecureRequest, isSecureRequest } from "./secureRequest";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

/**
 * Cookie attributes used when setting app_session_id (OAuth + local login).
 * Local HTTP dev uses lax/non-secure for same-origin SPA; HTTPS uses none/secure.
 */
export function getSetSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  const host = (req.hostname || "").toLowerCase();
  const isLocal = LOCAL_HOSTS.has(host) || isIpAddress(host);

  if (isLocal && !secure) {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    };
  }

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
  };
}

/** @deprecated Alias for clearCookie variant matching current setSessionCookie policy */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  return getSetSessionCookieOptions(req);
}

/** Set app_session_id after OAuth or email/password login (shared policy). */
export function setSessionCookie(
  res: Response,
  req: Request,
  token: string,
  maxAgeMs: number = AUTH_SESSION_TTL_MS
): void {
  res.cookie(COOKIE_NAME, token, {
    ...getSetSessionCookieOptions(req),
    maxAge: maxAgeMs,
  });
}

/**
 * Clear app_session_id using every sameSite/secure pair used at login.
 * OAuth sets cookies via getSessionCookieOptions (sameSite: none); email login uses sameSite: lax.
 * clearCookie only removes a cookie when path/sameSite/secure match how it was set.
 *
 * Requires trust proxy in production so isSecureRequest() matches login-time cookie flags.
 */
export function clearSessionCookie(res: Response, req: Request): void {
  const oauthStyle = getSessionCookieOptions(req);
  const variants: Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure">[] = [
    oauthStyle,
    { httpOnly: true, path: "/", sameSite: "lax", secure: true },
    { httpOnly: true, path: "/", sameSite: "lax", secure: false },
    { httpOnly: true, path: "/", sameSite: "none", secure: true },
    { httpOnly: true, path: "/", sameSite: "none", secure: false },
  ];

  for (const opts of variants) {
    res.clearCookie(COOKIE_NAME, opts);
  }
}

/** Deployment diagnostics (AUTH_DEPLOY_DEBUG=1); does not change cookie policy. */
export function describeSessionCookiePolicy(req: Request) {
  return {
    cookie: getSetSessionCookieOptions(req),
    secureRequest: describeSecureRequest(req),
    host: (req.hostname || "").toLowerCase(),
    isLocalHost:
      LOCAL_HOSTS.has((req.hostname || "").toLowerCase()) ||
      isIpAddress(req.hostname || ""),
  };
}
