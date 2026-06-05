export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
export const EMAIL_NOT_VERIFIED_ERR_MSG = 'Email verification required (10003)';

/** Primary admin account(s) — must not be deleted, demoted, or password-reset by other admins. */
export const PROTECTED_USER_IDS = [1] as const;

export function isProtectedUserId(userId: number): boolean {
  return (PROTECTED_USER_IDS as readonly number[]).includes(userId);
}
