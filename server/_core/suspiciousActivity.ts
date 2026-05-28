import { opsLog, type OpsCategory } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";

type SuspiciousSignal =
  | "failed_login"
  | "rate_limit_exceeded"
  | "unauthorized_admin_access"
  | "tenant_boundary_violation"
  | "trpc_runtime_failure";

type TrackInput = {
  signal: SuspiciousSignal;
  category: OpsCategory;
  actorId?: number | null;
  role?: string | null;
  restaurantId?: number | null;
  ip?: string;
  correlationId?: string;
  route?: string;
  procedure?: string;
  action?: string;
  metadata?: Record<string, unknown>;
};

type Counter = {
  count: number;
  windowStart: number;
  lastSeenAt: number;
  lastEmittedAt?: number;
};

const OPS_SUSPICIOUS_DEBUG = process.env.OPS_SUSPICIOUS_DEBUG === "1";

const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_THRESHOLD = 5;
const DEFAULT_EMIT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

const DEBUG_THRESHOLD = 3;
const DEBUG_EMIT_COOLDOWN_MS = 30 * 1000;

const MAX_KEYS = 5000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

const counters = new Map<string, Counter>();

function thresholdFor(signal: SuspiciousSignal): number {
  if (OPS_SUSPICIOUS_DEBUG) return DEBUG_THRESHOLD;
  // runtime failures can be more urgent; still avoid noise
  if (signal === "trpc_runtime_failure") return 3;
  return DEFAULT_THRESHOLD;
}

function windowMsFor(_signal: SuspiciousSignal): number {
  return DEFAULT_WINDOW_MS;
}

function cooldownMsFor(_signal: SuspiciousSignal): number {
  return OPS_SUSPICIOUS_DEBUG ? DEBUG_EMIT_COOLDOWN_MS : DEFAULT_EMIT_COOLDOWN_MS;
}

function makeKey(input: TrackInput): string {
  const actor = typeof input.actorId === "number" ? String(input.actorId) : "anon";
  const ip = input.ip && input.ip.length > 0 ? input.ip : "noip";
  // Prefer actorId when present; fall back to ip for unauthenticated signals.
  const principal = actor !== "anon" ? `actor:${actor}` : `ip:${ip}`;
  return `${input.signal}|${principal}`;
}

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, c] of Array.from(counters.entries())) {
    const windowMs = DEFAULT_WINDOW_MS;
    // expire inactive keys to bound memory
    if (now - c.lastSeenAt > windowMs * 2) counters.delete(key);
  }

  // Hard cap: if still too large, drop oldest.
  if (counters.size <= MAX_KEYS) return;
  const entries = Array.from(counters.entries()).sort(
    (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
  );
  const toRemove = counters.size - MAX_KEYS;
  for (let i = 0; i < toRemove; i++) counters.delete(entries[i]![0]);
}

function suspiciousTypeFor(signal: SuspiciousSignal): string {
  switch (signal) {
    case "tenant_boundary_violation":
      return OPS_EVENT.suspicious_tenant_activity;
    case "unauthorized_admin_access":
      return OPS_EVENT.suspicious_admin_activity;
    case "failed_login":
    case "rate_limit_exceeded":
      return OPS_EVENT.suspicious_auth_activity;
    case "trpc_runtime_failure":
      return OPS_EVENT.runtime_failure_burst;
    default:
      return "suspicious_activity";
  }
}

/**
 * Visibility-only in-memory suspicious activity tracker (MON-1C).
 *
 * - No blocking/enforcement
 * - Emits opsLog only when threshold is crossed, with cooldown to avoid spam
 * - Bounded memory with periodic cleanup
 */
export function trackSuspiciousActivity(input: TrackInput): void {
  const now = Date.now();
  cleanup(now);

  const key = makeKey(input);
  const windowMs = windowMsFor(input.signal);
  const threshold = thresholdFor(input.signal);
  const cooldownMs = cooldownMsFor(input.signal);

  let counter = counters.get(key);
  if (!counter || now - counter.windowStart >= windowMs) {
    counter = {
      count: 0,
      windowStart: now,
      lastSeenAt: now,
    };
    counters.set(key, counter);
  }

  counter.count += 1;
  counter.lastSeenAt = now;

  if (counter.count < threshold) return;

  const lastEmitted = counter.lastEmittedAt ?? 0;
  if (now - lastEmitted < cooldownMs) return;
  counter.lastEmittedAt = now;

  opsLog({
    type: suspiciousTypeFor(input.signal),
    category: input.category,
    severity: "warn",
    ts: new Date(now).toISOString(),
    correlationId: input.correlationId,
    actorId: input.actorId ?? null,
    role: input.role ?? null,
    restaurantId: input.restaurantId ?? null,
    route: input.route,
    procedure: input.procedure,
    action: input.action,
    ip: input.ip,
    metadata: {
      signal: input.signal,
      count: counter.count,
      timeWindowMs: windowMs,
      key,
      ...input.metadata,
    },
  });
}

