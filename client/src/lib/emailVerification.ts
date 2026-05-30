type EmailVerificationUser = {
  email?: string | null;
  emailVerifiedAt?: string | null;
};

/** True when the user has an email on file but has not verified it yet. */
export function isEmailVerificationPending(
  user: EmailVerificationUser | null | undefined
): boolean {
  if (!user?.email?.trim()) return false;
  return user.emailVerifiedAt == null || user.emailVerifiedAt === "";
}

export async function requestEmailVerification(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/request-email-verification", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}
