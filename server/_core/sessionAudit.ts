import type { Request } from "express";
import {
  AUTH_OPS_EMIT_COOLDOWN_MS,
  AUTH_OPS_MAX_COUNTER_KEYS,
  AUTH_OPS_ROLLING_WINDOW_MS,
  authHttpContext,
  rollingWindowBurstMetadata,
} from "./authOpsMetadata";
import { opsLog } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";
import { getClientIp } from "./rateLimit";

type SessionAnomaly =
  | "session_cookie_missing"
  | "session_invalid"
  | "session_appid_mismatch"
  | "session_user_sync_failed"
  | "session_user_not_found";

type Counter = { lastSeenAt: number; lastEmittedAt?: number; count: number; windowStart: number };

const WINDOW_MS = AUTH_OPS_ROLLING_WINDOW_MS;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const EMIT_COOLDOWN_MS = AUTH_OPS_EMIT_COOLDOWN_MS;
const MAX_KEYS = AUTH_OPS_MAX_COUNTER_KEYS;

let lastCleanup = Date.now();
const counters = new Map<string, Counter>();

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, c] of Array.from(counters.entries())) {
    if (now - c.lastSeenAt > WINDOW_MS * 2) counters.delete(key);
  }

  if (counters.size <= MAX_KEYS) return;
  const entries = Array.from(counters.entries()).sort(
    (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
  );
  const toRemove = counters.size - MAX_KEYS;
  for (let i = 0; i < toRemove; i++) counters.delete(entries[i]![0]);
}

function key(req: Request, anomaly: SessionAnomaly): string {
  // Low-noise: group by IP (not by correlationId) to avoid spamming.
  return `${anomaly}|ip:${getClientIp(req)}`;
}

function eventType(anomaly: SessionAnomaly): string {
  switch (anomaly) {
    case "session_cookie_missing":
      return OPS_EVENT.session_cookie_missing;
    case "session_invalid":
      return OPS_EVENT.session_invalid;
    case "session_appid_mismatch":
      return OPS_EVENT.session_appid_mismatch;
    case "session_user_sync_failed":
      return OPS_EVENT.session_user_sync_failed;
    case "session_user_not_found":
      return OPS_EVENT.session_user_not_found;
    default:
      return OPS_EVENT.session_invalid;
  }
}

/**
 * Low-noise session anomaly logger (AUTH2-A).
 * Emits a structured ops event on a cooldown to avoid log spam.
 */
export function logSessionAnomaly(
  req: Request,
  anomaly: SessionAnomaly,
  input: {
    severity?: "debug" | "info" | "warn" | "error";
    actorId?: number | null;
    role?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  const now = Date.now();
  cleanup(now);

  const k = key(req, anomaly);
  let c = counters.get(k);
  if (!c || now - c.windowStart >= WINDOW_MS) {
    c = { lastSeenAt: now, count: 0, windowStart: now };
    counters.set(k, c);
  }
  c.count += 1;
  c.lastSeenAt = now;

  const lastEmitted = c.lastEmittedAt ?? 0;
  if (now - lastEmitted < EMIT_COOLDOWN_MS) return;
  c.lastEmittedAt = now;

  const http = authHttpContext(req);
  opsLog({
    type: eventType(anomaly),
    category: "AUTH",
    severity: input.severity ?? "warn",
    ts: new Date(now).toISOString(),
    correlationId: http.correlationId,
    route: http.route,
    method: http.method,
    ip: http.ip,
    actorId: input.actorId ?? null,
    role: input.role ?? null,
    metadata: rollingWindowBurstMetadata({
      countInWindow: c.count,
      windowMs: WINDOW_MS,
      key: k,
      signal: anomaly,
      extra: input.metadata,
    }),
  });
}

