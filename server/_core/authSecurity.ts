import { ENV } from "./env";

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
    console.warn(
      "[AuthSecurity] JWT_SECRET is missing or weak — acceptable for local dev only"
    );
  }
}

/** Whether Express should trust X-Forwarded-* headers for cookie secure detection. */
export function shouldTrustProxy(): boolean {
  if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
    return true;
  }
  return ENV.isProduction;
}
