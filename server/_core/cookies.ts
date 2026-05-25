import { COOKIE_NAME } from "@shared/const";
import type { CookieOptions, Request, Response } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}

/**
 * Clear app_session_id using every sameSite/secure pair used at login.
 * OAuth sets cookies via getSessionCookieOptions (sameSite: none); email login uses sameSite: lax.
 * clearCookie only removes a cookie when path/sameSite/secure match how it was set.
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
