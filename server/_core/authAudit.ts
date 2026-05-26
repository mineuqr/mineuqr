import type { Request } from "express";
import type { SelectUser } from "../../drizzle/schema";

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
    path: req.path,
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
  console.warn("[AuthAudit] failed_login", basePayload(req, { email, reason }));
}

/** Log successful local login (minimal PII). */
export function logSuccessfulLogin(req: Request, userId: number): void {
  if (process.env.AUTH_DEBUG === "1") {
    console.info("[AuthAudit] login_success", basePayload(req, { userId }));
  }
}

/** Log blocked admin access attempt via tRPC. */
export function logUnauthorizedAdminAccess(
  user: AuditUser,
  procedure?: string
): void {
  console.warn("[AuthAudit] unauthorized_admin_access", {
    ts: new Date().toISOString(),
    userId: user?.id ?? null,
    role: user?.role ?? null,
    procedure: procedure ?? "unknown",
  });
}

/** Log cross-tenant / restaurant boundary denial. */
export function logTenantBoundaryViolation(
  user: AuditUser,
  restaurantId: number,
  action: string
): void {
  console.warn("[AuthAudit] tenant_boundary_violation", {
    ts: new Date().toISOString(),
    userId: user?.id ?? null,
    role: user?.role ?? null,
    restaurantId,
    action,
  });
}

/** Log rate-limit blocks on auth endpoints. */
export function logRateLimitExceeded(req: Request, key: string): void {
  console.warn("[AuthAudit] rate_limit_exceeded", basePayload(req, { key }));
}
