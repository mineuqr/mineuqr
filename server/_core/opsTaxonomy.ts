/**
 * MON-1D — Operational Event Taxonomy
 *
 * Lightweight constants to prevent naming drift. This is intentionally
 * *not* a validation framework; emitters may still use custom strings when
 * needed, but should prefer these canonicals for stable querying.
 *
 * AUTH docs: docs/AUTH2_INDEX.md (index), auth-ops-signals.md (triage),
 * authOpsSignalGuide.ts (per-event reference). Closure: docs/AUTH2_CLOSURE.md
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
  session_cookie_missing: "session_cookie_missing",
  session_invalid: "session_invalid",
  session_appid_mismatch: "session_appid_mismatch",
  session_user_sync_failed: "session_user_sync_failed",
  session_user_not_found: "session_user_not_found",
  oauth_runtime_initialized: "oauth_runtime_initialized",
  oauth_callback_failed: "oauth_callback_failed",
  oauth_callback_missing_params: "oauth_callback_missing_params",
  oauth_userinfo_missing_openid: "oauth_userinfo_missing_openid",
  oauth_trial_subscription_failed: "oauth_trial_subscription_failed",
  oauth_owner_notification_failed: "oauth_owner_notification_failed",
  oauth_callback_rate_limited: "oauth_callback_rate_limited",
  oauth_state_malformed: "oauth_state_malformed",
  oauth_state_invalid: "oauth_state_invalid",
  oauth_callback_invalid_burst: "oauth_callback_invalid_burst",
  auth_secret_weak: "auth_secret_weak",
  oauth_provider_misconfigured: "oauth_provider_misconfigured",
  password_reset_requested: "password_reset_requested",
  password_reset_email_sent: "password_reset_email_sent",
  password_reset_token_invalid: "password_reset_token_invalid",
  password_reset_token_expired: "password_reset_token_expired",
  password_reset_completed: "password_reset_completed",
  email_verification_requested: "email_verification_requested",
  email_verification_email_sent: "email_verification_email_sent",
  email_verification_token_invalid: "email_verification_token_invalid",
  email_verification_token_expired: "email_verification_token_expired",
  email_verification_completed: "email_verification_completed",
  auth_token_create_failed: "auth_token_create_failed",
  auth_invalid_token_burst: "auth_invalid_token_burst",
  auth_token_bruteforce_suspected: "auth_token_bruteforce_suspected",
  auth_verification_resend_burst: "auth_verification_resend_burst",
  auth_email_amplification_suspected: "auth_email_amplification_suspected",

  // Deployment guardrails / CSRF posture (AUTH2-C Slice 4)
  deployment_insecure_http_in_production: "deployment_insecure_http_in_production",
  deployment_forwarded_proto_missing: "deployment_forwarded_proto_missing",
  csrf_origin_mismatch: "csrf_origin_mismatch",
  csrf_origin_missing: "csrf_origin_missing",

  // WEBHOOK / PAYMENT lifecycle
  webhook_received: "webhook_received",
  webhook_processing_started: "webhook_processing_started",
  webhook_processing_completed: "webhook_processing_completed",
  webhook_processing_failed: "webhook_processing_failed",
  duplicate_webhook_detected: "duplicate_webhook_detected",
  payment_subscription_activated: "payment_subscription_activated",
  payment_provider_misconfigured: "payment_provider_misconfigured",
  payment_runtime_anomaly: "payment_runtime_anomaly",

  // Operational health signals (MON-1R.2)
  degraded_polling_pressure: "degraded_polling_pressure",
  scheduled_task_started: "scheduled_task_started",
  scheduled_task_completed: "scheduled_task_completed",
  scheduled_task_runtime_warning: "scheduled_task_runtime_warning",

  // TENANT / ADMIN boundaries
  tenant_boundary_violation: "tenant_boundary_violation",
  unauthorized_admin_access: "unauthorized_admin_access",
  account_classification_changed: "account_classification_changed",
  user_role_changed: "user_role_changed",
  subscription_created_by_admin: "subscription_created_by_admin",
  subscription_updated_by_admin: "subscription_updated_by_admin",
  admin_password_reset: "admin_password_reset",
  internal_user_created: "internal_user_created",
  cascade_subscription_deleted: "cascade_subscription_deleted",
  cascade_restaurant_deleted: "cascade_restaurant_deleted",
  cascade_user_deleted: "cascade_user_deleted",

  // SECURITY — platform protection (ADMIN-SECURITY-CENTER PR-1)
  platform_protection_healthy: "platform_protection_healthy",
  platform_protection_degraded: "platform_protection_degraded",
  platform_protection_misconfigured: "platform_protection_misconfigured",
  audit_persist_failed: "audit_persist_failed",

  // RUNTIME diagnostics
  trpc_error: "trpc_error",
  trpc_runtime_failure: "trpc_runtime_failure",

  // Suspicious activity visibility (threshold-based)
  suspicious_auth_activity: "suspicious_auth_activity",
  suspicious_tenant_activity: "suspicious_tenant_activity",
  suspicious_admin_activity: "suspicious_admin_activity",
  runtime_failure_burst: "runtime_failure_burst",

  // ORDER / dining session (TABLE-MANAGEMENT-1 D3)
  session_created: "session_created",
  session_reused: "session_reused",
  order_created_event_failed: "order_created_event_failed",

  // SESSION-AGGREGATES-1 Phase A
  session_aggregate_drift_detected: "session_aggregate_drift_detected",
  session_aggregate_update_failed: "session_aggregate_update_failed",

  // SESSION-AGGREGATES-1 Phase B
  session_aggregate_reader_fallback: "session_aggregate_reader_fallback",

  // THERMAL-PRINTING-3B.3
  print_job_created: "print_job_created",
  print_job_idempotency_reused: "print_job_idempotency_reused",
  print_job_creation_failed: "print_job_creation_failed",

  // THERMAL-PRINTING-3C.3
  print_processor_job_claimed: "print_processor_job_claimed",
  print_processor_execution_started: "print_processor_execution_started",
  print_processor_execution_completed: "print_processor_execution_completed",
  print_processor_execution_failed: "print_processor_execution_failed",
} as const;

export type OpsEventType = (typeof OPS_EVENT)[keyof typeof OPS_EVENT];

