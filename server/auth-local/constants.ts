import { AUTH_OPS_EMIT_COOLDOWN_MS, AUTH_OPS_ROLLING_WINDOW_MS } from "../_core/authOpsMetadata";

/** Per-email forgot-password rate limit (POST /api/auth/forgot-password). */
export const PASSWORD_RESET_RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxAttempts: 5 } as const;

/** Invalid one-time token burst visibility (reset + verify). */
export const INVALID_TOKEN_MAX_ATTEMPTS = 25;

/** Email verification resend rolling window (actor + IP). */
export const VERIFICATION_RESEND_MAX_ACTOR = 5;
export const VERIFICATION_RESEND_MAX_IP = 15;
export const VERIFICATION_EMAIL_MIN_INTERVAL_MS = 60 * 1000;

export const INVALID_TOKEN_WINDOW_MS = AUTH_OPS_ROLLING_WINDOW_MS;
export const INVALID_TOKEN_EMIT_COOLDOWN_MS = AUTH_OPS_EMIT_COOLDOWN_MS;
export const VERIFICATION_RESEND_WINDOW_MS = AUTH_OPS_ROLLING_WINDOW_MS;
export const VERIFICATION_RESEND_EMIT_COOLDOWN_MS = AUTH_OPS_EMIT_COOLDOWN_MS;
