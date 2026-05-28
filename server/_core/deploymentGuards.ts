import type { NextFunction, Request, Response } from "express";
import { ENV } from "./env";
import { opsLog } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";
import { getCorrelationId } from "./requestContext";
import { headerFirstString, isSecureRequest } from "./secureRequest";

type Counter = {
  lastSeenAt: number;
  lastEmittedAt?: number;
  count: number;
  windowStart: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const EMIT_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_KEYS = 2000;

let lastCleanup = Date.now();
const counters = new Map<string, Counter>();

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, c] of Array.from(counters.entries())) {
    if (now - c.lastSeenAt > WINDOW_MS * 2) counters.delete(k);
  }
  if (counters.size <= MAX_KEYS) return;
  const entries = Array.from(counters.entries()).sort(
    (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
  );
  const toRemove = counters.size - MAX_KEYS;
  for (let i = 0; i < toRemove; i++) counters.delete(entries[i]![0]);
}

function noteAndMaybeEmit(
  key: string,
  emit: (countInWindow: number) => void
): void {
  const now = Date.now();
  cleanup(now);

  let c = counters.get(key);
  if (!c || now - c.windowStart >= WINDOW_MS) {
    c = { lastSeenAt: now, count: 0, windowStart: now };
    counters.set(key, c);
  }
  c.count += 1;
  c.lastSeenAt = now;

  const lastEmitted = c.lastEmittedAt ?? 0;
  if (now - lastEmitted < EMIT_COOLDOWN_MS) return;
  c.lastEmittedAt = now;
  emit(c.count);
}

function requestHost(req: Request): string | undefined {
  const host = req.get("host");
  if (typeof host === "string" && host.length > 0) return host.toLowerCase();
  return undefined;
}

function parseOriginHost(origin: string): string | null {
  try {
    const url = new URL(origin);
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function isSensitiveAuthMutation(req: Request): boolean {
  if (req.method !== "POST") return false;
  if (!req.path.startsWith("/api/auth/")) return false;
  // GET /api/auth/verify-email is not a mutation; leave it out.
  return true;
}

/**
 * Deployment guardrails middleware (AUTH2-C Slice 4).
 *
 * Design goals:
 * - warn (cooldowned) on suspicious production TLS/proxy states
 * - optionally enforce Origin checks for sensitive auth POST endpoints
 * - preserve behavior by default (no blocking unless explicitly enabled)
 */
export function deploymentGuardsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!ENV.isProduction) {
    next();
    return;
  }

  const host = requestHost(req) ?? "unknown";
  const correlationId = getCorrelationId(req);

  // 1) TLS/proxy diagnostics: production request seen as non-secure.
  if (!isSecureRequest(req)) {
    noteAndMaybeEmit(`prod_insecure|host:${host}`, (countInWindow) => {
      opsLog({
        type: OPS_EVENT.deployment_insecure_http_in_production,
        category: "SYSTEM",
        severity: "warn",
        ts: new Date().toISOString(),
        correlationId,
        route: req.path,
        method: req.method,
        metadata: {
          host,
          countInWindow,
          windowMs: WINDOW_MS,
          forwardedProto: headerFirstString(req, "x-forwarded-proto") ?? null,
          trustProxy: String((req.app as any)?.get?.("trust proxy") ?? "unknown"),
          note:
            "Production request not detected as HTTPS; secure cookies may not persist if TLS termination/proxy headers are misconfigured.",
        },
      });
    });

    // If we are behind a proxy but x-forwarded-proto isn't present, highlight it.
    if (!headerFirstString(req, "x-forwarded-proto")) {
      noteAndMaybeEmit(
        `prod_missing_xfp|host:${host}|route:${req.path}`,
        (countInWindow) => {
          opsLog({
            type: OPS_EVENT.deployment_forwarded_proto_missing,
            category: "SYSTEM",
            severity: "warn",
            ts: new Date().toISOString(),
            correlationId,
            route: req.path,
            method: req.method,
            metadata: {
              host,
              countInWindow,
              windowMs: WINDOW_MS,
              note:
                "x-forwarded-proto missing in production; Express may mis-detect HTTPS behind a reverse proxy.",
            },
          });
        }
      );
    }
  }

  // 2) Lightweight CSRF posture hardening for sensitive auth POST endpoints.
  if (isSensitiveAuthMutation(req)) {
    const origin = headerFirstString(req, "origin");
    const reqHost = requestHost(req);
    const originHost = origin ? parseOriginHost(origin) : null;

    const enforce = process.env.CSRF_ORIGIN_ENFORCE === "1";

    if (!origin) {
      // Missing Origin is common for some clients; default to low-noise visibility.
      noteAndMaybeEmit(`csrf_origin_missing|host:${host}|path:${req.path}`, (countInWindow) => {
        opsLog({
          type: OPS_EVENT.csrf_origin_missing,
          category: "AUTH",
          severity: enforce ? "warn" : "info",
          ts: new Date().toISOString(),
          correlationId,
          route: req.path,
          method: req.method,
          metadata: {
            host,
            countInWindow,
            windowMs: WINDOW_MS,
            enforce,
            note:
              "Sensitive auth POST missing Origin header. If you only expect browser traffic, consider enforcing Origin checks.",
          },
        });
      });
      next();
      return;
    }

    if (originHost && reqHost && originHost !== reqHost) {
      noteAndMaybeEmit(
        `csrf_origin_mismatch|host:${host}|path:${req.path}|origin:${originHost}`,
        (countInWindow) => {
          opsLog({
            type: OPS_EVENT.csrf_origin_mismatch,
            category: "AUTH",
            severity: enforce ? "warn" : "info",
            ts: new Date().toISOString(),
            correlationId,
            route: req.path,
            method: req.method,
            metadata: {
              host: reqHost,
              origin,
              originHost,
              countInWindow,
              windowMs: WINDOW_MS,
              enforce,
              note:
                "Origin does not match Host for sensitive auth POST. This may indicate CSRF risk or proxy host/origin configuration issues.",
            },
          });
        }
      );

      if (enforce) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
  }

  next();
}

