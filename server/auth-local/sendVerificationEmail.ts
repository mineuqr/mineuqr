import type { Request } from "express";
import { sendEmail } from "../email";
import { baseUrlForLinks } from "./httpHelpers";
import {
  AUTH_ONE_TIME_TOKEN_PURPOSE,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  issueAuthOneTimeToken,
} from "../_core/authOneTimeToken";
import * as db from "../db";
import { authOpsLog } from "../_core/authOpsMetadata";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  recordVerificationEmailSent,
  touchVerificationEmailStamp,
  verificationEmailStampKey,
} from "./verificationResend";

type UserRow = { id: number; email: string | null };

/**
 * Best-effort verification email (register / resend). Never throws; returns whether send was attempted successfully.
 */
export async function sendVerificationEmailForUser(
  req: Request,
  user: UserRow
): Promise<boolean> {
  if (!user.email?.trim()) return false;

  const now = Date.now();
  const stampKey = verificationEmailStampKey(user.id);
  touchVerificationEmailStamp(stampKey, now);

  const issued = issueAuthOneTimeToken(EMAIL_VERIFICATION_TOKEN_TTL_MS);
  await db.invalidateUnusedEmailVerificationTokens(user.id);
  const created = await db.createAuthToken({
    userId: user.id,
    type: AUTH_ONE_TIME_TOKEN_PURPOSE.emailVerification,
    tokenHash: issued.tokenHash,
    expiresAt: issued.expiresAt,
  });

  if (!created) {
    authOpsLog({
      type: OPS_EVENT.auth_token_create_failed,
      severity: "warn",
      req,
      actorId: user.id,
      metadata: { purpose: "email_verify", issue: "db_insert_failed" },
    });
    return false;
  }

  const verifyUrl = `${baseUrlForLinks(req)}/api/auth/verify-email?token=${encodeURIComponent(issued.plaintextToken)}`;

  const sent = await sendEmail({
    to: user.email,
    subject: "تأكيد البريد الإلكتروني",
    html: `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>تأكيد البريد الإلكتروني</h2>
        <p>اضغط الرابط التالي لتأكيد بريدك الإلكتروني:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>ستنتهي صلاحية الرابط خلال 24 ساعة.</p>
      </div>
    `,
  });

  if (sent) {
    authOpsLog({
      type: OPS_EVENT.email_verification_email_sent,
      severity: "info",
      req,
      actorId: user.id,
      metadata: { purpose: "email_verify" },
    });
    recordVerificationEmailSent(stampKey, now);
  }

  return sent;
}
