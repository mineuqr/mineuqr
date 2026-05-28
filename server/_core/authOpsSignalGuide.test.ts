import { describe, expect, it } from "vitest";
import { AUTH_OPS_SIGNAL_GUIDE, describeAuthOpsEvent } from "./authOpsSignalGuide";
import { OPS_EVENT } from "./opsTaxonomy";

/** AUTH-related OPS_EVENT keys we expect an operator guide entry for. */
const AUTH_OPS_EVENT_KEYS = [
  "failed_login",
  "login_success",
  "rate_limit_exceeded",
  "session_cookie_missing",
  "session_invalid",
  "session_appid_mismatch",
  "session_user_sync_failed",
  "session_user_not_found",
  "oauth_runtime_initialized",
  "oauth_callback_failed",
  "oauth_callback_missing_params",
  "oauth_userinfo_missing_openid",
  "oauth_trial_subscription_failed",
  "oauth_owner_notification_failed",
  "oauth_callback_rate_limited",
  "oauth_state_malformed",
  "oauth_state_invalid",
  "oauth_callback_invalid_burst",
  "oauth_provider_misconfigured",
  "password_reset_requested",
  "password_reset_email_sent",
  "password_reset_token_invalid",
  "password_reset_token_expired",
  "password_reset_completed",
  "email_verification_requested",
  "email_verification_email_sent",
  "email_verification_token_invalid",
  "email_verification_token_expired",
  "email_verification_completed",
  "auth_token_create_failed",
  "auth_invalid_token_burst",
  "auth_token_bruteforce_suspected",
  "auth_verification_resend_burst",
  "auth_email_amplification_suspected",
  "deployment_insecure_http_in_production",
  "deployment_forwarded_proto_missing",
  "csrf_origin_mismatch",
  "csrf_origin_missing",
  "auth_secret_weak",
  "suspicious_auth_activity",
] as const;

describe("authOpsSignalGuide", () => {
  it("documents primary AUTH ops events with stable OPS_EVENT names", () => {
    for (const key of AUTH_OPS_EVENT_KEYS) {
      expect(OPS_EVENT[key as keyof typeof OPS_EVENT]).toBe(key);
      expect(AUTH_OPS_SIGNAL_GUIDE[key]).toBeDefined();
    }
  });

  it("describeAuthOpsEvent returns guide entries by type string", () => {
    const entry = describeAuthOpsEvent(OPS_EVENT.password_reset_token_invalid);
    expect(entry?.group).toBe("one_time_token");
    expect(entry?.class).toBe("abuse");
  });
});
