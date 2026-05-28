import { ONE_YEAR_MS } from "@shared/const";

/**
 * Canonical session lifetime configuration (AUTH2-C Slice 3B.1).
 *
 * Preparation-only slice:
 * - Keep current behavior unchanged (defaults remain 1 year).
 * - No refresh tokens, rotation, or sliding expiration.
 */

/**
 * Absolute TTL for stateless HS256 JWT cookie sessions (`app_session_id`).
 *
 * IMPORTANT: This currently preserves existing behavior by defaulting to `ONE_YEAR_MS`.
 * Future slices may override via environment configuration.
 */
export const AUTH_SESSION_TTL_MS = ONE_YEAR_MS;

/**
 * Future-ready hook for a longer-lived session when "remember me" exists.
 * Not wired yet on purpose.
 */
export const REMEMBER_ME_SESSION_TTL_MS = ONE_YEAR_MS;

