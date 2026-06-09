/**
 * ADMIN-AUTH-1D — platform account protection types and client-safe helpers.
 * Authoritative openId matching uses ENV.ownerOpenId on the server.
 */

export type PlatformAccountProtectable = {
  isProtectedPlatformAccount?: boolean;
};

/** Uses server-computed flag on admin API user payloads. */
export function isProtectedPlatformAccountUser(
  user: PlatformAccountProtectable | null | undefined
): boolean {
  return user?.isProtectedPlatformAccount === true;
}

/** Pure openId match — pass platform owner openId from server context only. */
export function isPlatformAccountOpenId(
  openId: string | null | undefined,
  platformOwnerOpenId: string
): boolean {
  return Boolean(platformOwnerOpenId && openId && openId === platformOwnerOpenId);
}
