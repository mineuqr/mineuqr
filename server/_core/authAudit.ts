import type { Request } from "express";
import type { SelectUser } from "../../drizzle/schema";
import { authHttpContext } from "./authOpsMetadata";
import { opsLog } from "./opsLog";
import { trackSuspiciousActivity } from "./suspiciousActivity";
import { OPS_EVENT } from "./opsTaxonomy";

type AuditUser = Pick<SelectUser, "id" | "role" | "email"> | null | undefined;

function basePayload(req: Request, extra?: Record<string, unknown>) {
  const http = authHttpContext(req);
  return {
    ts: http.ts,
    ip: http.ip,
    route: http.route,
    method: http.method,
    correlationId: http.correlationId,
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
  opsLog({
    type: OPS_EVENT.failed_login,
    category: "AUTH",
    severity: "warn",
    ts: payload.ts,
    correlationId: payload.correlationId,
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
    correlationId: payload.correlationId,
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
      correlationId: payload.correlationId,
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
  opsLog({
    type: OPS_EVENT.rate_limit_exceeded,
    category: "AUTH",
    severity: "warn",
    ts: payload.ts,
    correlationId: payload.correlationId,
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
    correlationId: payload.correlationId,
    route: payload.route,
    action: "rate_limit",
    metadata: { key },
  });
}
