import type { Request } from "express";
import type { SelectUser } from "../../drizzle/schema";
import { opsLog } from "./opsLog";
import { getCorrelationId } from "./requestContext";
import { trackSuspiciousActivity } from "./suspiciousActivity";
import { OPS_EVENT } from "./opsTaxonomy";

type AuditUser = Pick<SelectUser, "id" | "role" | "email"> | null | undefined;

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

function basePayload(req: Request, extra?: Record<string, unknown>) {
  return {
    ts: new Date().toISOString(),
    ip: clientIp(req),
    route: req.path,
    method: req.method,
    ...extra,
  };
}

/** Log failed local login (never log passwords). */
export function logFailedLogin(
  req: Request,
  email: string,
  reason: "invalid_credentials" | "no_password" | "user_not_found" | "rate_limited"
): void {
  const payload = basePayload(req, { email, reason });
  const correlationId = getCorrelationId(req);
  opsLog({
    type: OPS_EVENT.failed_login,
    category: "AUTH",
    severity: "warn",
    ts: payload.ts,
    correlationId,
    route: payload.route,
    ip: payload.ip,
    method: payload.method,
    metadata: {
      legacyPrefix: "AuthAudit",
      legacyType: "failed_login",
      email,
      reason,
    },
  });

  trackSuspiciousActivity({
    signal: "failed_login",
    category: "AUTH",
    ip: payload.ip,
    correlationId,
    route: payload.route,
    action: "login",
    metadata: { reason },
  });
}

/** Log successful local login (minimal PII). */
export function logSuccessfulLogin(req: Request, userId: number): void {
  if (process.env.AUTH_DEBUG === "1") {
    const payload = basePayload(req, { userId });
    opsLog({
      type: OPS_EVENT.login_success,
      category: "AUTH",
      severity: "info",
      ts: payload.ts,
      correlationId: getCorrelationId(req),
      actorId: userId,
      route: payload.route,
      ip: payload.ip,
      method: payload.method,
      metadata: {
        legacyPrefix: "AuthAudit",
        legacyType: "login_success",
        userId,
      },
    });
  }
}

/** Log blocked admin access attempt via tRPC. */
export function logUnauthorizedAdminAccess(
  user: AuditUser,
  procedure?: string
): void {
  opsLog({
    type: OPS_EVENT.unauthorized_admin_access,
    category: "ADMIN",
    severity: "warn",
    ts: new Date().toISOString(),
    actorId: user?.id ?? null,
    role: user?.role ?? null,
    route: procedure ?? "unknown",
    action: "admin_access",
    metadata: {
      legacyPrefix: "AuthAudit",
      legacyType: "unauthorized_admin_access",
      procedure: procedure ?? "unknown",
    },
  });
}

/** Log cross-tenant / restaurant boundary denial. */
export function logTenantBoundaryViolation(
  user: AuditUser,
  restaurantId: number,
  action: string
): void {
  opsLog({
    type: OPS_EVENT.tenant_boundary_violation,
    category: "TENANT",
    severity: "warn",
    ts: new Date().toISOString(),
    actorId: user?.id ?? null,
    role: user?.role ?? null,
    restaurantId,
    action,
    metadata: {
      legacyPrefix: "AuthAudit",
      legacyType: "tenant_boundary_violation",
      action,
    },
  });
}

/** Log rate-limit blocks on auth endpoints. */
export function logRateLimitExceeded(req: Request, key: string): void {
  const payload = basePayload(req, { key });
  const correlationId = getCorrelationId(req);
  opsLog({
    type: OPS_EVENT.rate_limit_exceeded,
    category: "AUTH",
    severity: "warn",
    ts: payload.ts,
    correlationId,
    route: payload.route,
    ip: payload.ip,
    method: payload.method,
    metadata: {
      legacyPrefix: "AuthAudit",
      legacyType: "rate_limit_exceeded",
      key,
    },
  });

  trackSuspiciousActivity({
    signal: "rate_limit_exceeded",
    category: "AUTH",
    ip: payload.ip,
    correlationId,
    route: payload.route,
    action: "rate_limit",
    metadata: { key },
  });
}
