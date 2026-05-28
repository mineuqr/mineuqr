/**
 * Shared TLS/proxy detection for cookies, deployment guards, and email link bases.
 *
 * Single source of truth for "is this request HTTPS?" behind reverse proxies.
 * Requires Express `trust proxy` when terminated TLS sets X-Forwarded-* only.
 *
 * Consumers: cookies.ts, deploymentGuards.ts, auth-local/httpHelpers.ts
 * Do not duplicate this logic elsewhere — see docs/AUTH2_CLOSURE.md
 */

import type { Request } from "express";

export function headerFirstString(
  req: Request,
  name: string
): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) {
    return raw[0];
  }
  return undefined;
}

/** First token from X-Forwarded-Proto (may be a comma-separated list). */
export function getForwardedProto(req: Request): string | undefined {
  const forwardedProto = headerFirstString(req, "x-forwarded-proto");
  if (!forwardedProto) return undefined;
  const parts = forwardedProto.split(",").map((p) => p.trim().toLowerCase());
  return parts.find((p) => p === "https") ?? parts.find((p) => p === "http") ?? parts[0];
}

/** True when Express protocol or any forwarded proto token indicates HTTPS. */
export function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwardedProto = headerFirstString(req, "x-forwarded-proto");
  if (!forwardedProto) return false;
  return forwardedProto
    .split(",")
    .some((p) => p.trim().toLowerCase() === "https");
}

/** Protocol for link generation when Origin is absent (email links, redirects). */
export function effectiveRequestProtocol(req: Request): "http" | "https" {
  return isSecureRequest(req) ? "https" : "http";
}

export type SecureRequestDiagnostics = {
  expressProtocol: string;
  isSecure: boolean;
  forwardedProto: string | null;
  forwardedFor: string | null;
  host: string | null;
  trustProxy: string;
};

export function describeSecureRequest(req: Request): SecureRequestDiagnostics {
  return {
    expressProtocol: req.protocol,
    isSecure: isSecureRequest(req),
    forwardedProto: headerFirstString(req, "x-forwarded-proto") ?? null,
    forwardedFor: headerFirstString(req, "x-forwarded-for") ?? null,
    host: req.get("host") ?? null,
    trustProxy: String((req.app as { get?: (k: string) => unknown })?.get?.("trust proxy") ?? "unknown"),
  };
}
