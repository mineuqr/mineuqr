import { getUserByEmail } from "../db";
import { normalizeAccountEmailOrNull } from "./normalizeAccountEmail";

export type OAuthEmailIdentityResult =
  | { ok: true }
  | { ok: false; reason: "email_identity_collision" };

/** Block new OAuth signups when email is already owned by another account. */
export async function assertOAuthEmailIdentityAvailable(input: {
  isNewUser: boolean;
  openId: string;
  email: string | null | undefined;
}): Promise<OAuthEmailIdentityResult> {
  if (!input.isNewUser) return { ok: true };
  const normalized = normalizeAccountEmailOrNull(input.email);
  if (!normalized) return { ok: true };
  const existing = await getUserByEmail(normalized);
  if (existing && existing.openId !== input.openId) {
    return { ok: false, reason: "email_identity_collision" };
  }
  return { ok: true };
}

export const OAUTH_EMAIL_COLLISION_LOGIN_PATH = "/login?error=oauth_email_conflict";
