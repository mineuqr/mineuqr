/**
 * AUTH2-D.5 — Operator reference for AUTH-category ops events.
 *
 * Documentation-only: does not emit logs or change runtime behavior.
 * Event names match `OPS_EVENT` in opsTaxonomy.ts exactly.
 *
 * See also: docs/auth-ops-signals.md (triage cookbook).
 */

export type AuthOpsSignalGroup =
  | "login"
  | "session"
  | "oauth"
  | "one_time_token"
  | "abuse_visibility"
  | "deployment_csrf"
  | "config"
  | "degraded";

export type AuthOpsSignalDescriptor = {
  /** High-level bucket for filtering during incidents. */
  group: AuthOpsSignalGroup;
  /** What happened (one sentence). */
  meaning: string;
  /** First checks an operator should run. */
  triageHint: string;
  /**
   * Abuse = attacker/noise pattern (often expected at low volume).
   * Degraded = our handler/config/dependency misbehaved.
   * Success path = normal lifecycle.
   */
  class: "abuse" | "degraded" | "lifecycle" | "config";
};

/**
 * Human-readable guide keyed by canonical event type string.
 * Add entries here when new AUTH ops events are introduced.
 */
export const AUTH_OPS_SIGNAL_GUIDE: Record<string, AuthOpsSignalDescriptor> = {
  // ── Login ──────────────────────────────────────────────────────────────────
  failed_login: {
    group: "login",
    class: "abuse",
    meaning: "Local login rejected (bad credentials, no password, unknown user, or login rate limit).",
    triageHint: "Filter by ip + route; check rate_limit_exceeded and suspicious_auth_activity bursts.",
  },
  login_success: {
    group: "login",
    class: "lifecycle",
    meaning: "Successful local login (AUTH_DEBUG=1 only).",
    triageHint: "Diagnostic only; not emitted in production by default.",
  },
  rate_limit_exceeded: {
    group: "login",
    class: "abuse",
    meaning: "Auth endpoint rate limit tripped (per-key rolling window).",
    triageHint: "Inspect metadata.key; distinguish burst key vs login email key vs pwdreset key.",
  },

  // ── Session (JWT cookie) ───────────────────────────────────────────────────
  session_cookie_missing: {
    group: "session",
    class: "lifecycle",
    meaning: "Request expected a session cookie but none was sent (cooldowned aggregate).",
    triageHint: "Often benign crawlers; correlate with route and cid.",
  },
  session_invalid: {
    group: "session",
    class: "abuse",
    meaning: "Session cookie present but JWT verify failed (cooldowned aggregate).",
    triageHint: "Check secret rotation, clock skew, expired JWT; countInWindow in metadata.",
  },
  session_appid_mismatch: {
    group: "session",
    class: "config",
    meaning: "JWT appId does not match VITE_APP_ID (cooldowned aggregate).",
    triageHint: "Verify env app id across deploys and preview URLs.",
  },
  session_user_sync_failed: {
    group: "session",
    class: "degraded",
    meaning: "Valid session but user upsert/sync failed (cooldowned aggregate).",
    triageHint: "Check DB availability and user row constraints.",
  },
  session_user_not_found: {
    group: "session",
    class: "degraded",
    meaning: "Valid session JWT but user row missing (cooldowned aggregate).",
    triageHint: "Investigate deleted users vs stale cookies.",
  },

  // ── OAuth ──────────────────────────────────────────────────────────────────
  oauth_callback_failed: {
    group: "oauth",
    class: "degraded",
    meaning: "OAuth callback handler threw (token exchange, redirect, etc.).",
    triageHint: "Read metadata.error and degradedReason; check provider status.",
  },
  oauth_callback_missing_params: {
    group: "oauth",
    class: "abuse",
    meaning: "Callback missing code or state (info-level probe).",
    triageHint: "Usually scanners; watch oauth_callback_invalid_burst.",
  },
  oauth_state_malformed: {
    group: "oauth",
    class: "abuse",
    meaning: "State param not valid base64 redirect URI (info-level probe).",
    triageHint: "Compare with oauth_callback_invalid_burst; rarely user-facing.",
  },
  oauth_callback_rate_limited: {
    group: "oauth",
    class: "abuse",
    meaning: "OAuth callback IP hit 60/min rolling limit (429 returned).",
    triageHint: "Inspect metadata.key and retryAfterMs.",
  },
  oauth_callback_invalid_burst: {
    group: "oauth",
    class: "abuse",
    meaning: "Many invalid callbacks from same IP/reason in 10m window (cooldowned warn).",
    triageHint: "metadata.reason missing_params | malformed_state; threshold 25/10m.",
  },
  oauth_userinfo_missing_openid: {
    group: "oauth",
    class: "degraded",
    meaning: "Provider userinfo lacked openId after token exchange.",
    triageHint: "Provider payload regression or misconfiguration.",
  },
  oauth_trial_subscription_failed: {
    group: "oauth",
    class: "degraded",
    meaning: "New OAuth user created but trial subscription setup failed.",
    triageHint: "User may exist without trial; check DB/subscription logs.",
  },
  oauth_owner_notification_failed: {
    group: "oauth",
    class: "degraded",
    meaning: "New-user owner email notification failed.",
    triageHint: "Non-blocking; check email transport.",
  },
  oauth_runtime_initialized: {
    group: "oauth",
    class: "lifecycle",
    meaning: "OAuth routes registered and provider config accepted at startup.",
    triageHint: "Informational; confirms runtime wiring.",
  },
  oauth_state_invalid: {
    group: "oauth",
    class: "abuse",
    meaning: "OAuth state rejected after decode (invalid redirect target).",
    triageHint: "Distinct from oauth_state_malformed (decode) vs policy invalid.",
  },
  oauth_provider_misconfigured: {
    group: "oauth",
    class: "config",
    meaning: "OAuth provider env incomplete at startup/runtime.",
    triageHint: "metadata.issue describes missing URL/secret.",
  },

  // ── One-time tokens (reset + verify) ─────────────────────────────────────
  password_reset_requested: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Forgot-password invoked (always non-enumerating to client).",
    triageHint: "warn + degradedReason = handler exception; info = normal request.",
  },
  password_reset_email_sent: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Reset email dispatched for eligible local_ user.",
    triageHint: "actorId present; no token in logs (by design).",
  },
  password_reset_token_invalid: {
    group: "one_time_token",
    class: "abuse",
    meaning: "Reset token rejected (malformed, missing, used, wrong user).",
    triageHint: "metadata.reason classifies; watch auth_invalid_token_burst.",
  },
  password_reset_token_expired: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Valid-format reset token past TTL (30 minutes).",
    triageHint: "User needs new forgot-password email.",
  },
  password_reset_completed: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Password successfully reset; sessions cleared via cookie clear.",
    triageHint: "Confirm user can log in with new password.",
  },
  email_verification_requested: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Authenticated user requested verification email.",
    triageHint: "Requires valid session cookie.",
  },
  email_verification_email_sent: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Verification email sent.",
    triageHint: "Check auth_email_amplification_suspected if no mail received.",
  },
  email_verification_token_invalid: {
    group: "one_time_token",
    class: "abuse",
    meaning: "Verify link token rejected.",
    triageHint: "metadata.reason; plain-text 400 responses on GET /verify-email.",
  },
  email_verification_token_expired: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Verification token past 24h TTL.",
    triageHint: "User should request new verification from app.",
  },
  email_verification_completed: {
    group: "one_time_token",
    class: "lifecycle",
    meaning: "Email marked verified; token consumed.",
    triageHint: "User redirected to /.",
  },
  auth_token_create_failed: {
    group: "one_time_token",
    class: "degraded",
    meaning: "DB insert for auth_tokens row failed.",
    triageHint: "metadata.purpose + issue=db_insert_failed; check DB/migrations.",
  },

  // ── Abuse visibility (cooldowned aggregates) ───────────────────────────────
  auth_invalid_token_burst: {
    group: "abuse_visibility",
    class: "abuse",
    meaning: "Invalid token attempts reached threshold (25/10m per IP+endpoint) — first warn.",
    triageHint: "metadata.endpoint reset-password | verify-email; not yet bruteforce label.",
  },
  auth_token_bruteforce_suspected: {
    group: "abuse_visibility",
    class: "abuse",
    meaning: "Same as burst but at/above throttle threshold (ongoing hammering).",
    triageHint: "Soft-throttle only — HTTP responses unchanged.",
  },
  auth_verification_resend_burst: {
    group: "abuse_visibility",
    class: "abuse",
    meaning: "Verification resend rate limits exceeded (actor or IP window).",
    triageHint: "Client still gets { success: true }; check actorKey/ipKey metadata.",
  },
  auth_email_amplification_suspected: {
    group: "abuse_visibility",
    class: "abuse",
    meaning: "Resend allowed by limits but email suppressed (<60s since last send).",
    triageHint: "metadata.suppressed true; protects SMTP, not a user error.",
  },
  suspicious_auth_activity: {
    group: "abuse_visibility",
    class: "abuse",
    meaning: "Threshold crossed for failed_login or rate_limit_exceeded tracking.",
    triageHint: "metadata.signal + count/timeWindowMs; visibility only, no blocking.",
  },

  // ── Deployment / CSRF (auth-adjacent) ────────────────────────────────────
  deployment_insecure_http_in_production: {
    group: "deployment_csrf",
    class: "config",
    meaning: "Production request seen without TLS semantics.",
    triageHint: "Proxy headers and TRUST_PROXY configuration.",
  },
  deployment_forwarded_proto_missing: {
    group: "deployment_csrf",
    class: "config",
    meaning: "Production POST without x-forwarded-proto.",
    triageHint: "Load balancer / reverse proxy configuration.",
  },
  csrf_origin_missing: {
    group: "deployment_csrf",
    class: "abuse",
    meaning: "POST /api/auth/* without Origin header.",
    triageHint: "info unless CSRF_ORIGIN_ENFORCE=1 (then blocked).",
  },
  csrf_origin_mismatch: {
    group: "deployment_csrf",
    class: "abuse",
    meaning: "Origin header does not match host.",
    triageHint: "Check preview domains and CSRF_ORIGIN_ENFORCE.",
  },

  // ── Config / secrets ─────────────────────────────────────────────────────
  auth_secret_weak: {
    group: "config",
    class: "config",
    meaning: "JWT_SECRET weak in non-production (startup warn).",
    triageHint: "Expected in dev; must be strong in production.",
  },
} as const;

/** Quick lookup for operators filtering logs by event type. */
export function describeAuthOpsEvent(type: string): AuthOpsSignalDescriptor | undefined {
  return AUTH_OPS_SIGNAL_GUIDE[type];
}
