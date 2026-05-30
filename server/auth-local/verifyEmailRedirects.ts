/** SPA paths for email verification outcomes (AUTH-UX-FIX-1). */
export const VERIFY_EMAIL_SUCCESS_PATH = "/verify-email/success";

export type VerifyEmailFailureReason = "invalid" | "expired" | "error";

export function verifyEmailFailurePath(
  reason: VerifyEmailFailureReason
): string {
  return `/verify-email/failed?reason=${reason}`;
}
