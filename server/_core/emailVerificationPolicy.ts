import { EMAIL_NOT_VERIFIED_ERR_MSG } from "@shared/const";
import { TRPCError } from "@trpc/server";
import type { SelectUser } from "../../drizzle/schema";

/** AUTH-POLICY-1B: when `"1"`, verified email is required for verifiedProcedure routes. */
export function isEmailVerificationEnforced(): boolean {
  return process.env.AUTH_REQUIRE_VERIFIED_EMAIL === "1";
}

type EmailVerificationUser = Pick<
  SelectUser,
  "email" | "emailVerifiedAt" | "role" | "loginMethod"
>;

/**
 * True when this user must complete email verification before operational access.
 * Does not reflect the feature flag — use with isEmailVerificationEnforced().
 */
export function isEmailVerificationRequired(
  user: EmailVerificationUser
): boolean {
  if (user.role === "admin") return false;
  if (!user.email?.trim()) return false;
  if (isProviderTrustedIdentity(user)) return false;
  return true;
}

/** OAuth / non-local login methods with email are treated as provider-attested (AUTH-POLICY-1B.1). */
export function isProviderTrustedIdentity(
  user: EmailVerificationUser
): boolean {
  const method = user.loginMethod?.trim();
  if (!method || method === "email") return false;
  return Boolean(user.email?.trim());
}

/**
 * True when the user may access verifiedProcedure routes.
 * When enforcement is off, always true (no production behavior change).
 */
export function isEmailVerificationSatisfied(
  user: EmailVerificationUser
): boolean {
  if (!isEmailVerificationEnforced()) return true;
  if (!isEmailVerificationRequired(user)) return true;
  return Boolean(user.emailVerifiedAt);
}

export function assertEmailVerificationSatisfied(user: SelectUser): void {
  if (isEmailVerificationSatisfied(user)) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: EMAIL_NOT_VERIFIED_ERR_MSG,
  });
}
