import { ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./env";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

function readEnvMs(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Keep a sane upper bound even if misconfigured (no "infinite" sessions).
  if (n > ONE_YEAR_MS) return ONE_YEAR_MS;
  return Math.floor(n);
}

/**
 * Canonical session lifetime configuration (AUTH2-C Slice 3B).
 *
 * Current policy:
 * - Production: 30 days (absolute expiry) to reduce replay window.
 * - Development: 1 year to preserve local ergonomics.
 *
 * Overrides:
 * - AUTH_SESSION_TTL_MS: absolute TTL in milliseconds (clamped to ≤ 1 year).
 */

/**
 * Absolute TTL for stateless HS256 JWT cookie sessions (`app_session_id`).
 *
 * IMPORTANT: This currently preserves existing behavior by defaulting to `ONE_YEAR_MS`.
 * Future slices may override via environment configuration.
 */
export const AUTH_SESSION_TTL_MS =
  readEnvMs("AUTH_SESSION_TTL_MS") ??
  (ENV.isProduction ? THIRTY_DAYS_MS : ONE_YEAR_MS);

/**
 * Future-ready hook for a longer-lived session when "remember me" exists.
 * Not wired yet on purpose.
 */
export const REMEMBER_ME_SESSION_TTL_MS = ONE_YEAR_MS;

