/**
 * MON-1D — Operational Event Taxonomy
 *
 * Lightweight constants to prevent naming drift. This is intentionally
 * *not* a validation framework; emitters may still use custom strings when
 * needed, but should prefer these canonicals for stable querying.
 *
 * Naming convention: snake_case.
 * Categories: see OpsCategory in opsLog.ts
 * Severity discipline:
 * - debug: optional low-level diagnostics (off by default)
 * - info: expected meaningful operational events
 * - warn: suspicious / denied / degraded behavior
 * - error: unexpected runtime/system failures
 */

export const OPS_EVENT = {
  // AUTH
  failed_login: "failed_login",
  login_success: "login_success",
  rate_limit_exceeded: "rate_limit_exceeded",

  // WEBHOOK / PAYMENT lifecycle
  webhook_received: "webhook_received",
  webhook_processing_started: "webhook_processing_started",
  webhook_processing_completed: "webhook_processing_completed",
  webhook_processing_failed: "webhook_processing_failed",
  duplicate_webhook_detected: "duplicate_webhook_detected",
  payment_subscription_activated: "payment_subscription_activated",
  payment_provider_misconfigured: "payment_provider_misconfigured",
  payment_runtime_anomaly: "payment_runtime_anomaly",

  // TENANT / ADMIN boundaries
  tenant_boundary_violation: "tenant_boundary_violation",
  unauthorized_admin_access: "unauthorized_admin_access",

  // RUNTIME diagnostics
  trpc_error: "trpc_error",
  trpc_runtime_failure: "trpc_runtime_failure",

  // Suspicious activity visibility (threshold-based)
  suspicious_auth_activity: "suspicious_auth_activity",
  suspicious_tenant_activity: "suspicious_tenant_activity",
  suspicious_admin_activity: "suspicious_admin_activity",
  runtime_failure_burst: "runtime_failure_burst",
} as const;

export type OpsEventType = (typeof OPS_EVENT)[keyof typeof OPS_EVENT];

