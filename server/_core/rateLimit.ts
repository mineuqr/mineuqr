import type { Request } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxAttempts: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs?: number;
  remaining: number;
};

/** In-memory sliding-window rate limiter (STAB-SEC-1A — no Redis required). */
const buckets = new Map<string, Bucket>();

/** Periodic cleanup to avoid unbounded memory growth. */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + options.windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= options.maxAttempts) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
      remaining: 0,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, options.maxAttempts - bucket.count),
  };
}

/** Reset bucket after successful login (avoid punishing typos then success). */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

/** Composite key: IP + normalized email for login brute-force mitigation. */
export function getLoginRateLimitKey(req: Request, email: string): string {
  const normalized = email.trim().toLowerCase();
  return `login:${getClientIp(req)}:${normalized}`;
}

/** Defaults: 10 attempts per 15 minutes per IP+email. */
export const LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
} as const;

/** IP-only burst limit for auth endpoints (30/min). */
export const AUTH_BURST_LIMIT = {
  windowMs: 60 * 1000,
  maxAttempts: 30,
} as const;

export function getAuthBurstKey(req: Request): string {
  return `auth_burst:${getClientIp(req)}`;
}

/** Test helper — reset all buckets. */
export function _resetRateLimitStoreForTests(): void {
  buckets.clear();
  lastCleanup = Date.now();
}
