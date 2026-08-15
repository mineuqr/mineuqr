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

  // ORDER-EVENTS-1A — domain outbox infrastructure
  order_outbox_published: "order_outbox_published",
  order_outbox_publish_failed: "order_outbox_publish_failed",
  order_outbox_publish_retry: "order_outbox_publish_retry",
  order_outbox_queue_depth: "order_outbox_queue_depth",
  order_outbox_relay_batch: "order_outbox_relay_batch",

  // ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1
  order_lifecycle_latency_summary: "order_lifecycle_latency_summary",
  order_lifecycle_latency_span: "order_lifecycle_latency_span",
  order_lifecycle_latency_observer: "order_lifecycle_latency_observer",

  // REALTIME-PLATFORM-FOUNDATION-1
  realtime_connection_opened: "realtime_connection_opened",
  realtime_connection_closed: "realtime_connection_closed",
  realtime_hint_published: "realtime_hint_published",
  realtime_hint_delivered: "realtime_hint_delivered",
  realtime_auth_failed: "realtime_auth_failed",
  realtime_gap_detected: "realtime_gap_detected",
  realtime_fallback_activated: "realtime_fallback_activated",
  // REALTIME-PUBLIC-TICKET-HARDENING-1
  realtime_ticket_issued: "realtime_ticket_issued",
  realtime_ticket_revoked: "realtime_ticket_revoked",
  realtime_ticket_cleanup: "realtime_ticket_cleanup",

  // ORDER-EVENTS-1B — event consumers
  order_consumer_executed: "order_consumer_executed",
  order_consumer_failed: "order_consumer_failed",
  order_consumer_skipped: "order_consumer_skipped",
  order_consumer_retry: "order_consumer_retry",
  order_kitchen_event_received: "order_kitchen_event_received",
  order_print_dispatch_requested: "order_print_dispatch_requested",

  // PRINTING-1 — operational print service events
  print_requested: "print_requested",
  print_dispatched: "print_dispatched",
  print_started: "print_started",
  print_completed: "print_completed",
  print_failed: "print_failed",
  print_cancelled: "print_cancelled",
  print_connector_submission: "print_connector_submission",

  // ORDERS-READ-MODEL-1 — projection consumers
  order_projection_consumer_executed: "order_projection_consumer_executed",
  order_projection_consumer_failed: "order_projection_consumer_failed",
  order_projection_consumer_skipped: "order_projection_consumer_skipped",
  order_read_backfill_started: "order_read_backfill_started",
  order_read_backfill_completed: "order_read_backfill_completed",
  order_read_backfill_failed: "order_read_backfill_failed",
  order_read_category_backfill_started: "order_read_category_backfill_started",
  order_read_category_backfill_completed: "order_read_category_backfill_completed",
  order_read_category_backfill_failed: "order_read_category_backfill_failed",

  // ORDER-BUSINESS-IDENTITY-HARDENING-1
  business_identity_assignment_started: "business_identity_assignment_started",
  business_identity_assignment_completed: "business_identity_assignment_completed",
  business_identity_assignment_retry: "business_identity_assignment_retry",
  business_identity_deadlock: "business_identity_deadlock",
  business_identity_unique_constraint_retry: "business_identity_unique_constraint_retry",
  business_identity_failed: "business_identity_failed",

  // SESSION-AGGREGATES-1 Phase A
  session_aggregate_drift_detected: "session_aggregate_drift_detected",
  session_aggregate_update_failed: "session_aggregate_update_failed",

  // CHECK-GENERALIZATION-M1 — membership dual-write (best-effort)
  check_membership_dual_write_failed: "check_membership_dual_write_failed",

  // SESSION-AGGREGATES-1 Phase B
  session_aggregate_reader_fallback: "session_aggregate_reader_fallback",

  // SCREEN-PAIRING-CODE-GOVERNANCE-1 — pairing platform audit
  pairing_code_issued: "pairing_code_issued",
  pairing_code_redeemed: "pairing_code_redeemed",
  pairing_redeem_failed: "pairing_redeem_failed",
  pairing_rate_limit_exceeded: "pairing_rate_limit_exceeded",
  pairing_credential_regenerated: "pairing_credential_regenerated",
  pairing_screen_deleted: "pairing_screen_deleted",
  pairing_revoked: "pairing_revoked",
  operational_screen_created: "operational_screen_created",

  // COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
  commercial_catalog_created: "commercial_catalog_created",
  commercial_catalog_updated: "commercial_catalog_updated",
  commercial_catalog_published: "commercial_catalog_published",
  commercial_catalog_deprecated: "commercial_catalog_deprecated",
  commercial_catalog_retired: "commercial_catalog_retired",
  commercial_promotion_created: "commercial_promotion_created",
  commercial_migration_policy_changed: "commercial_migration_policy_changed",
  commercial_regional_policy_changed: "commercial_regional_policy_changed",
  commercial_concession_granted: "commercial_concession_granted",
  commercial_concession_revised: "commercial_concession_revised",
  commercial_concession_cancelled: "commercial_concession_cancelled",
  commercial_snapshot_created: "commercial_snapshot_created",
  commercial_subscription_reactivated: "commercial_subscription_reactivated",
  commercial_snapshot_bound: "commercial_snapshot_bound",
  commercial_snapshot_activated: "commercial_snapshot_activated",
  commercial_snapshot_resolved: "commercial_snapshot_resolved",
  commercial_legacy_bridge_used: "commercial_legacy_bridge_used",
  commercial_upgrade_snapshot_created: "commercial_upgrade_snapshot_created",
  commercial_downgrade_snapshot_created: "commercial_downgrade_snapshot_created",
  commercial_renewal_snapshot_created: "commercial_renewal_snapshot_created",
  commercial_plan_selected: "commercial_plan_selected",
  commercial_upgrade: "commercial_upgrade",
  commercial_downgrade: "commercial_downgrade",
  commercial_renewal: "commercial_renewal",
  commercial_promotion_applied: "commercial_promotion_applied",
  owner_access_mode_changed: "owner_access_mode_changed",
} as const;

export type OpsEventType = (typeof OPS_EVENT)[keyof typeof OPS_EVENT];

