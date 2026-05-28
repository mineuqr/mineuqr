import { ENV } from "./env";
import { opsLog } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";

/** Known weak defaults that must not be used in production. */
const KNOWN_WEAK_JWT_SECRETS = new Set([
  "",
  "dev-local-jwt-secret-change-in-production",
  "change-me",
  "secret",
]);

const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Validates auth-related environment at startup (STAB-SEC-1A).
 * Fails fast in production; warns in development.
 */
export function validateAuthSecurityConfig(): void {
  const secret = ENV.cookieSecret;
  const isWeak =
    !secret ||
    KNOWN_WEAK_JWT_SECRETS.has(secret) ||
    secret.length < MIN_PRODUCTION_SECRET_LENGTH;

  if (ENV.isProduction) {
    if (isWeak) {
      throw new Error(
        "[AuthSecurity] JWT_SECRET must be set to a strong value (≥32 chars) in production"
      );
    }
    if (!ENV.appId) {
      throw new Error("[AuthSecurity] VITE_APP_ID must be set in production");
    }
    return;
  }

  if (isWeak) {
    opsLog({
      type: OPS_EVENT.auth_secret_weak,
      category: "SYSTEM",
      severity: "warn",
      ts: new Date().toISOString(),
      metadata: {
        issue: "jwt_secret_weak_or_missing",
        minLength: MIN_PRODUCTION_SECRET_LENGTH,
        isProduction: ENV.isProduction,
      },
    });
  }
}

/**
 * Whether Express should trust X-Forwarded-* headers for cookie secure detection.
 * Production defaults to enabled; set TRUST_PROXY=1 explicitly on reverse-proxy hosts.
 */
export function shouldTrustProxy(): boolean {
  if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
    return true;
  }
  return ENV.isProduction;
}
