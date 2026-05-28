/**
 * AUTH2-D.3 — Canonical auth ops metadata shapes (additive, low-blast).
 *
 * Field guide for rolling-window burst events:
 * - countInWindow: attempts in the current window
 * - windowMs: rolling window length
 * - threshold: emit / throttle threshold (when applicable)
 * - key: in-memory counter key (for dedup debugging)
 * - reason | issue: failure classifier (reason = token/user, issue = config/decode)
 * - degradedReason: unexpected handler failure (surfaced in opsLog message line)
 * - signal: suspicious-activity or resend classifier
 *
 * HTTP identity is always top-level on auth ops: correlationId, route, method, ip.
 *
 * Operator cookbook: docs/auth-ops-signals.md
 * Per-event descriptions: authOpsSignalGuide.ts (reference only).
 */

import type { Request } from "express";
import type { OpsSeverity } from "./opsLog";
import { opsLog } from "./opsLog";
import { getCorrelationId } from "./requestContext";
import { getClientIp } from "./rateLimit";

/** Shared 10-minute rolling window used by auth burst counters. */
export const AUTH_OPS_ROLLING_WINDOW_MS = 10 * 60 * 1000;

/** Shared ops-log emit cooldown for burst visibility. */
export const AUTH_OPS_EMIT_COOLDOWN_MS = 2 * 60 * 1000;

/** Shared in-memory counter map cap. */
export const AUTH_OPS_MAX_COUNTER_KEYS = 5000;

export type AuthHttpContext = {
  correlationId?: string;
  route: string;
  method: string;
  ip: string;
  ts: string;
};

export function authHttpContext(req: Request): AuthHttpContext {
  return {
    correlationId: getCorrelationId(req),
    route: req.path,
    method: req.method,
    ip: getClientIp(req),
    ts: new Date().toISOString(),
  };
}

/** Canonical rolling-window burst metadata (invalid token, OAuth invalid callback, session anomaly). */
export function rollingWindowBurstMetadata(input: {
  countInWindow: number;
  windowMs: number;
  key: string;
  threshold?: number;
  reason?: string;
  signal?: string;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    countInWindow: input.countInWindow,
    windowMs: input.windowMs,
    key: input.key,
    ...(input.threshold !== undefined ? { threshold: input.threshold } : {}),
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
    ...input.extra,
  };
}

/**
 * Suspicious-activity burst metadata.
 * Preserves legacy `count` / `timeWindowMs` and adds canonical aliases for queries.
 */
export function suspiciousActivityBurstMetadata(input: {
  signal: string;
  count: number;
  windowMs: number;
  threshold: number;
  key: string;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    signal: input.signal,
    count: input.count,
    timeWindowMs: input.windowMs,
    countInWindow: input.count,
    windowMs: input.windowMs,
    threshold: input.threshold,
    key: input.key,
    ...input.extra,
  };
}

export function authDegradedMetadata(
  degradedReason: string,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return { degradedReason, ...extra };
}

/** One-time token validation failure (e.g. consumed, wrong user). */
export function authTokenFailureReason(reason: string): Record<string, unknown> {
  return { reason };
}

/** Structured AUTH category ops event with consistent request identity. */
export function authOpsLog(input: {
  type: string;
  severity: OpsSeverity;
  req: Request;
  actorId?: number | null;
  role?: string | null;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  ts?: string;
}): void {
  const ctx = authHttpContext(input.req);
  opsLog({
    type: input.type,
    category: "AUTH",
    severity: input.severity,
    ts: input.ts ?? ctx.ts,
    correlationId: input.correlationId ?? ctx.correlationId,
    route: ctx.route,
    method: ctx.method,
    ip: ctx.ip,
    actorId: input.actorId,
    role: input.role,
    metadata: input.metadata,
  });
}
