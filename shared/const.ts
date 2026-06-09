export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
export const EMAIL_NOT_VERIFIED_ERR_MSG = 'Email verification required (10003)';

/**
 * @deprecated ADMIN-AUTH-1D — platform protection uses ENV.ownerOpenId via
 * `isProtectedPlatformAccount` on admin API payloads (`@shared/platformAccount`).
 */
export const PROTECTED_USER_IDS = [] as const;

/** @deprecated Use `isProtectedPlatformAccountUser` from `@shared/platformAccount`. */
export function isProtectedUserId(_userId: number): boolean {
  return false;
}
